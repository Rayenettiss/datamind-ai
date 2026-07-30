# db.py
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "datamind",
    "user": "postgres",
    "password": "datamind",
}


def get_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


def init_db() -> None:
    """Crée les tables si elles n'existent pas encore. Sûr à appeler plusieurs fois."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS runs (
                    job_id TEXT PRIMARY KEY,
                    source_file TEXT,
                    objective TEXT,
                    status TEXT,
                    started_at TIMESTAMP DEFAULT NOW(),
                    ended_at TIMESTAMP,
                    total_tokens INTEGER,
                    final_result JSONB
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS agent_logs (
                    id SERIAL PRIMARY KEY,
                    job_id TEXT REFERENCES runs(job_id),
                    agent_name TEXT,
                    message_type TEXT,
                    content TEXT,
                    tokens_used INTEGER,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            # pgvector — mémoire long terme (plans réussis)
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS plan_embeddings (
                    id SERIAL PRIMARY KEY,
                    job_id TEXT REFERENCES runs(job_id),
                    objective TEXT,
                    plan_text TEXT,
                    summary_text TEXT,
                    embedding VECTOR(1536),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            # Pas d'index IVFFlat pour l'instant. Testé en juillet 2026 :
            # IVFFlat avec lists=100 sur une table de ~6 lignes fait
            # silencieusement retourner un scan ANN vide (aucune ligne
            # scannée dans le seul bucket sondé), sans erreur ni warning —
            # alors qu'un scan séquentiel simple trouve des similarités de
            # 0.94-0.99. Un scan séquentiel est instantané à ce volume.
            # À revisiter une fois plan_embeddings dans les centaines/milliers
            # de lignes : soit IVFFlat avec lists ≈ sqrt(rows), soit HNSW
            # (vector_cosine_ops), qui n'a pas cette pathologie à faible volume.
            cur.execute("DROP INDEX IF EXISTS plan_embeddings_cosine_idx;")
        conn.commit()
    finally:
        conn.close()


def create_run(job_id: str, source_file: str, objective: str) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO runs (job_id, source_file, objective, status)
                VALUES (%s, %s, %s, 'RUNNING')
                ON CONFLICT (job_id) DO NOTHING;
                """,
                (job_id, source_file, objective),
            )
        conn.commit()
    finally:
        conn.close()


def finish_run(job_id: str, status: str, final_result: dict | None) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE runs
                SET status = %s, ended_at = NOW(), final_result = %s
                WHERE job_id = %s;
                """,
                (status, json.dumps(final_result) if final_result else None, job_id),
            )
        conn.commit()
    finally:
        conn.close()


def log_agent_message(job_id: str, agent_name: str, message_type: str, content: str) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO agent_logs (job_id, agent_name, message_type, content)
                VALUES (%s, %s, %s, %s);
                """,
                (job_id, agent_name, message_type, content),
            )
        conn.commit()
    finally:
        conn.close()


def _to_vector_literal(embedding: list[float]) -> str:
    """Convertit une liste Python de floats en littéral vector Postgres
    ('[0.1,0.2,...]'). Nécessaire car psycopg2 sérialise par défaut une
    liste Python en littéral ARRAY Postgres ('{...}'), qui ne caste pas
    correctement vers le type vector via ::vector — d'où des résultats
    de similarité silencieusement incorrects si on passe la liste brute."""
    return "[" + ",".join(str(x) for x in embedding) + "]"


def save_plan_embedding(
    job_id: str, objective: str, plan_text: str, summary_text: str, embedding: list[float]
) -> None:
    """Sauvegarde le plan + résumé d'un run réussi avec son embedding, pour
    réutilisation future par le Planner (mémoire long terme)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO plan_embeddings (job_id, objective, plan_text, summary_text, embedding)
                VALUES (%s, %s, %s, %s, %s::vector);
                """,
                (job_id, objective, plan_text, summary_text, _to_vector_literal(embedding)),
            )
        conn.commit()
    finally:
        conn.close()


def get_connection_diagnostics() -> dict:
    """Diagnostic helper — confirms which Postgres instance/db/row-count a
    connection actually sees. Not called anywhere by default; keep around
    for future debugging of connection-target mismatches (see PROJECT_STATE.md,
    'pgvector similarity search returns empty' incident, July 2026)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT current_database(), inet_server_addr(), inet_server_port();")
            target = cur.fetchone()
            cur.execute("SELECT count(*) FROM plan_embeddings;")
            count = cur.fetchone()
        return {"target": dict(target), "plan_embeddings_count": dict(count)}
    finally:
        conn.close()


def search_similar_plans(
    embedding: list[float], top_k: int = 3, similarity_threshold: float = 0.75
) -> list[dict]:
    """Recherche les top_k plans passés les plus proches (similarité cosinus)
    au-dessus du seuil donné. pgvector's `<=>` renvoie une *distance* cosinus
    (0 = identique, 2 = opposé) ; on la convertit en similarité (1 - distance)
    pour comparer au seuil au sens habituel du terme.

    NB: pas d'index IVFFlat sur cette table tant que le volume reste faible
    (voir init_db() plus haut) — un IVFFlat mal dimensionné (lists=100 sur
    quelques lignes) peut faire retourner un ANN scan vide alors que des
    lignes très similaires existent, sans erreur ni warning. Confirmé en
    juillet 2026 : voir PROJECT_STATE.md."""
    vector_literal = _to_vector_literal(embedding)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT objective, plan_text, summary_text,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM plan_embeddings
                ORDER BY embedding <=> %s::vector
                LIMIT %s;
                """,
                (vector_literal, vector_literal, top_k),
            )
            rows = cur.fetchall()
        return [dict(row) for row in rows if row["similarity"] > similarity_threshold]
    finally:
        conn.close()


def get_run_logs(job_id: str) -> dict | None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM runs WHERE job_id = %s;", (job_id,))
            run = cur.fetchone()
            if not run:
                return None

            cur.execute(
                "SELECT * FROM agent_logs WHERE job_id = %s ORDER BY created_at ASC;",
                (job_id,),
            )
            logs = cur.fetchall()

        return {"run": dict(run), "logs": [dict(log) for log in logs]}
    finally:
        conn.close()