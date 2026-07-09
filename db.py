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