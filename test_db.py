# test_db.py — throwaway test, not part of the app
from db import get_connection

conn = get_connection()
with conn.cursor() as cur:
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
    print(cur.fetchall())
conn.close()