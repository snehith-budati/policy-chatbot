import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta, timezone
from flask import g
from config import DATABASE_URL, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT

# Add IST Timezone configuration
IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    """Helper to get current time in IST"""
    return datetime.now(IST)

def ensure_ist(dt):
    """Ensures a datetime is aware and in IST"""
    if dt is None: return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except Exception:
            return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=IST)
    return dt.astimezone(IST)

class PgConnectionWrapper:
    """Wrapper around psycopg2 connection to mimic sqlite3 db.execute(...) interface"""
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return self._conn.cursor(cursor_factory=RealDictCursor)

    def execute(self, query, vars=None):
        cur = self.cursor()
        cur.execute(query, vars)
        return cur

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()

    @property
    def closed(self):
        return self._conn.closed

def get_db():
    """Get database connection bound to current Flask context"""
    db = getattr(g, '_database', None)
    if db is None or db.closed != 0:
        raw_conn = psycopg2.connect(DATABASE_URL)
        db = g._database = PgConnectionWrapper(raw_conn)
    return db

def close_connection(exception=None):
    """Close database connection at end of request context"""
    db = getattr(g, '_database', None)
    if db is not None and db.closed == 0:
        db.close()

def log_admin_action(admin, action, details):
    """Log administrative actions to the database"""
    try:
        raw_conn = psycopg2.connect(DATABASE_URL)
        cur = raw_conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "INSERT INTO admin_logs (admin, action, details, timestamp) VALUES (%s, %s, %s, %s)",
            (admin, action, details, get_ist_now().isoformat())
        )
        raw_conn.commit()
        cur.close()
        raw_conn.close()
        print(f"📊 [LOG]: {admin} | {action} | {details}")
    except Exception as e:
        print(f"⚠️ Error logging admin action: {e}")

def get_table_columns(table_name):
    """Helper to fetch column names for a table in PostgreSQL"""
    db = get_db()
    cur = db.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
        (table_name,)
    )
    return [row['column_name'] for row in cur.fetchall()]

def migrate_database():
    """Add new columns to existing tables if they don't exist"""
    db = get_db()
    cursor = db.cursor()
    
    columns = get_table_columns('policies')
    if 'policy_type' not in columns:
        try:
            cursor.execute("ALTER TABLE policies ADD COLUMN policy_type VARCHAR(100) DEFAULT 'General'")
            print("✅ Added policy_type column to policies table")
        except Exception as e:
            print(f"Note: policy_type column error: {e}")
            db.rollback()
    
    if 'extracted_sections' not in columns:
        try:
            cursor.execute("ALTER TABLE policies ADD COLUMN extracted_sections TEXT")
            print("✅ Added extracted_sections column to policies table")
        except Exception as e:
            print(f"Note: extracted_sections column error: {e}")
            db.rollback()
    
    emb_columns = get_table_columns('embeddings')
    if 'is_header' not in emb_columns:
        try:
            cursor.execute("ALTER TABLE embeddings ADD COLUMN is_header BOOLEAN DEFAULT FALSE")
            print("✅ Added is_header column to embeddings table")
        except Exception as e:
            print(f"Note: is_header column error: {e}")
            db.rollback()

    chat_cols = get_table_columns('chat_history')
    if 'satisfaction' not in chat_cols:
        try:
            cursor.execute("ALTER TABLE chat_history ADD COLUMN satisfaction BOOLEAN")
            print("✅ Added satisfaction column to chat_history table")
        except Exception: db.rollback()
            
    if 'duration' not in chat_cols:
        try:
            cursor.execute("ALTER TABLE chat_history ADD COLUMN duration FLOAT")
            print("✅ Added duration column to chat_history table")
        except Exception: db.rollback()
        
    if 'confidence' not in chat_cols:
        try:
            cursor.execute("ALTER TABLE chat_history ADD COLUMN confidence FLOAT")
            print("✅ Added confidence column to chat_history table")
        except Exception: db.rollback()

    if 'model_used' not in chat_cols:
        try:
            cursor.execute("ALTER TABLE chat_history ADD COLUMN model_used VARCHAR(100) DEFAULT 'phi3:mini'")
            print("✅ Added model_used column to chat_history table")
        except Exception: db.rollback()

    user_cols = get_table_columns('users')
    if 'otp' not in user_cols:
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN otp VARCHAR(10)")
            print("✅ Added otp column to users table")
        except Exception: db.rollback()
        
    if 'otp_expiry' not in user_cols:
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN otp_expiry TIMESTAMP")
            print("✅ Added otp_expiry column to users table")
        except Exception: db.rollback()
        
    if 'verified' not in user_cols:
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 0")
            print("✅ Added verified column to users table")
        except Exception: db.rollback()

    if 'last_login' not in user_cols:
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP")
            print("✅ Added last_login column to users table")
        except Exception: db.rollback()

    # Create feedback_ratings table if missing
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback_ratings (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255),
                stars INTEGER,
                review TEXT,
                timestamp TIMESTAMP DEFAULT (NOW() + INTERVAL '5 hours 30 minutes')
            )
        ''')
    except Exception: db.rollback()
        
    db.commit()

    # Create semantic_cache table if missing
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS semantic_cache (
                id SERIAL PRIMARY KEY,
                question TEXT UNIQUE,
                embedding BYTEA,
                answer TEXT,
                sources TEXT,
                hit_count INTEGER DEFAULT 1,
                last_hit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()
    except Exception: db.rollback()

def init_db():
    """Initialize PostgreSQL database tables if they don't exist"""
    db = get_db()
    cursor = db.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT (NOW() + INTERVAL '5 hours 30 minutes'),
            total_queries INTEGER DEFAULT 0,
            otp VARCHAR(10),
            otp_expiry TIMESTAMP,
            verified INTEGER DEFAULT 0,
            last_login TIMESTAMP
        )
    ''')
    
    # Policies table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS policies (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            file_path TEXT,
            pages INTEGER,
            chunks INTEGER,
            uploaded_by VARCHAR(255),
            uploaded_at TIMESTAMP DEFAULT (NOW() + INTERVAL '5 hours 30 minutes'),
            policy_type VARCHAR(100) DEFAULT 'General',
            extracted_sections TEXT
        )
    ''')
    
    # Embeddings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS embeddings (
            id SERIAL PRIMARY KEY,
            policy_id INTEGER REFERENCES policies (id) ON DELETE CASCADE,
            chunk_index INTEGER,
            text TEXT,
            embedding BYTEA,
            page_number INTEGER,
            section_title TEXT,
            is_header BOOLEAN DEFAULT FALSE
        )
    ''')
    
    # Chat history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255),
            question TEXT,
            answer TEXT,
            sources TEXT,
            timestamp TIMESTAMP DEFAULT (NOW() + INTERVAL '5 hours 30 minutes'),
            satisfaction BOOLEAN,
            duration FLOAT,
            confidence FLOAT,
            model_used VARCHAR(100) DEFAULT 'phi3:mini'
        )
    ''')
    
    # Admin logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin_logs (
            id SERIAL PRIMARY KEY,
            admin VARCHAR(255),
            action TEXT,
            details TEXT,
            timestamp TIMESTAMP DEFAULT (NOW() + INTERVAL '5 hours 30 minutes')
        )
    ''')

    # Pending OTPs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pending_otps (
            email VARCHAR(255) PRIMARY KEY,
            otp VARCHAR(10),
            otp_expiry TIMESTAMP
        )
    ''')
    
    db.commit()
    
    # Run migration to add missing columns
    migrate_database()
    
    print("✅ PostgreSQL Database initialized successfully!")
