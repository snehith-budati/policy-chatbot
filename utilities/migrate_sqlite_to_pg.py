import os
import sqlite3
import psycopg2
from config import DATABASE_URL, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT

SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), 'policy_hub.db')

def migrate_data():
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"SQLite database file '{SQLITE_DB_PATH}' not found. Skipping data migration.")
        return

    print(f"Connecting to SQLite database: {SQLITE_DB_PATH}")
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    s_cur = sqlite_conn.cursor()

    print(f"Connecting to PostgreSQL database...")
    try:
        pg_conn = psycopg2.connect(DATABASE_URL)
        p_cur = pg_conn.cursor()
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        return

    try:
        s_cur.execute("SELECT * FROM policies")
        policies = s_cur.fetchall()
        for p in policies:
            p_dict = dict(p)
            p_cur.execute("""
                INSERT INTO policies (id, name, file_path, pages, chunks, uploaded_by, uploaded_at, policy_type, extracted_sections)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                p_dict['id'], p_dict['name'], p_dict['file_path'], p_dict['pages'], p_dict['chunks'],
                p_dict['uploaded_by'], p_dict['uploaded_at'],
                p_dict.get('policy_type', 'General'),
                p_dict.get('extracted_sections')
            ))
        print(f"✅ Migrated {len(policies)} policy records.")
    except Exception as e:
        print(f"⚠️ Error migrating policies: {e}")

    try:
        s_cur.execute("SELECT * FROM embeddings")
        embeddings = s_cur.fetchall()
        for e in embeddings:
            e_dict = dict(e)
            p_cur.execute("""
                INSERT INTO embeddings (id, policy_id, chunk_index, text, embedding, page_number, section_title, is_header)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                e_dict['id'], e_dict['policy_id'], e_dict['chunk_index'], e_dict['text'],
                psycopg2.Binary(e_dict['embedding']) if e_dict['embedding'] else None,
                e_dict['page_number'], e_dict['section_title'],
                bool(e_dict['is_header']) if e_dict.get('is_header') is not None else False
            ))
        print(f"✅ Migrated {len(embeddings)} embedding records.")
    except Exception as e:
        print(f"⚠️ Error migrating embeddings: {e}")

    try:
        s_cur.execute("SELECT * FROM users")
        users = s_cur.fetchall()
        for u in users:
            u_dict = dict(u)
            p_cur.execute("""
                INSERT INTO users (id, email, created_at, total_queries, otp, otp_expiry, verified, last_login)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (email) DO NOTHING
            """, (
                u_dict['id'], u_dict['email'], u_dict['created_at'], u_dict['total_queries'],
                u_dict.get('otp'), u_dict.get('otp_expiry'), u_dict.get('verified', 0), u_dict.get('last_login')
            ))
        print(f"✅ Migrated {len(users)} user records.")
    except Exception as e:
        print(f"⚠️ Error migrating users: {e}")

    try:
        s_cur.execute("SELECT * FROM chat_history")
        chats = s_cur.fetchall()
        for c in chats:
            c_dict = dict(c)
            p_cur.execute("""
                INSERT INTO chat_history (id, user_email, question, answer, sources, timestamp, satisfaction, duration, confidence, model_used)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                c_dict['id'], c_dict['user_email'], c_dict['question'], c_dict['answer'], c_dict['sources'],
                c_dict['timestamp'],
                bool(c_dict['satisfaction']) if c_dict.get('satisfaction') is not None else None,
                c_dict.get('duration'), c_dict.get('confidence'), c_dict.get('model_used', 'phi3:mini')
            ))
        print(f"✅ Migrated {len(chats)} chat history records.")
    except Exception as e:
        print(f"⚠️ Error migrating chat history: {e}")

    tables = ['policies', 'embeddings', 'users', 'chat_history', 'admin_logs', 'feedback_ratings', 'semantic_cache']
    for t in tables:
        try:
            p_cur.execute(f"SELECT setval('{t}_id_seq', COALESCE((SELECT MAX(id) FROM {t}), 1));")
        except Exception as seq_err:
            pg_conn.rollback()

    pg_conn.commit()
    sqlite_conn.close()
    pg_conn.close()
    print("🚀 SQLite to PostgreSQL migration complete!")

if __name__ == '__main__':
    migrate_data()