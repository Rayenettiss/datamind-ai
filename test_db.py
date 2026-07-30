# test_db_connection.py
from db import get_connection

conn = get_connection()
try:
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) AS n FROM plan_embeddings;")
        print("plan_embeddings count:", cur.fetchone())

        cur.execute("SELECT current_database(), inet_server_addr(), inet_server_port();")
        print("Connected to:", cur.fetchone())

        cur.execute("SELECT job_id, objective FROM plan_embeddings LIMIT 10;")
        print("Rows:")
        for row in cur.fetchall():
            print(" ", row)
finally:
    conn.close()