import os
import sqlite3
from datetime import datetime, timedelta, timezone
from flask import g
from config import DATABASE

# Add IST Timezone configuration
IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    """Helper to get current time in IST"""
    return datetime.now(IST)

def ensure_ist(dt):
    """Ensures a datetime is aware and in IST"""
    if dt is None: return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=IST)
    return dt.astimezone(IST)

def get_db():
    """Get database connection bound to current Flask context"""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

def close_connection(exception=None):
    """Close database connection at end of request context"""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def log_admin_action(admin, action, details):
    """Log administrative actions to the database"""
    try:
        db = sqlite3.connect(DATABASE)
        db.execute(
            "INSERT INTO admin_logs (admin, action, details, timestamp) VALUES (?, ?, ?, ?)",
            (admin, action, details, get_ist_now().isoformat())
        )
        db.commit()
        db.close()
        print(f"📊 [LOG]: {admin} | {action} | {details}")
    except Exception as e:
        print(f"⚠️ Error logging admin action: {e}")

def migrate_database():
    """Add new columns to existing tables if they don't exist"""
    db = get_db()
    cursor = db.cursor()
    
    # Check if policy_type column exists in policies table
    cursor.execute("PRAGMA table_info(policies)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'policy_type' not in columns:
        try:
            cursor.execute("ALTER TABLE policies ADD COLUMN policy_type TEXT DEFAULT 'General'")
            print("✅ Added policy_type column to policies table")
        except Exception as e:
            print(f"Note: policy_type column may already exist: {e}")
    
    if 'extracted_sections' not in columns:
        try:
            cursor.execute("ALTER TABLE policies ADD COLUMN extracted_sections TEXT")
            print("✅ Added extracted_sections column to policies table")
        except Exception as e:
            print(f"Note: extracted_sections column may already exist: {e}")
    
    # Check if is_header column exists in embeddings table
    cursor.execute("PRAGMA table_info(embeddings)")
    emb_columns = [column[1] for column in cursor.fetchall()]
    
    if 'is_header' not in emb_columns:
        try:
            cursor.execute("ALTER TABLE embeddings ADD COLUMN is_header BOOLEAN DEFAULT 0")
            print("✅ Added is_header column to embeddings table")
        except Exception as e:
            print(f"Note: is_header column may already exist: {e}")

    # Check if satisfaction column exists in chat_history
    cursor.execute("PRAGMA table_info(chat_history)")
    chat_cols = [column[1] for column in cursor.fetchall()]
    if 'satisfaction' not in chat_cols:
        try:
            cursor.execute("ALTER TABLE chat_history ADD COLUMN satisfaction BOOLEAN")
            print("✅ Added satisfaction column to chat_history table")
        except: pass
            
    if 'duration' not in chat_cols:
        try:
            cursor.execute("ALTER TABLE chat_history ADD COLUMN duration FLOAT")
            print("✅ Added duration column to chat_history table")
        except: pass
        
    if 'confidence' not in chat_cols:
        try:
            cursor.execute("ALTER TABLE chat_history ADD COLUMN confidence FLOAT")
            print("✅ Added confidence column to chat_history table")
        except: pass

    if 'model_used' not in chat_cols:
        try:
            cursor.execute("ALTER TABLE chat_history ADD COLUMN model_used TEXT DEFAULT 'phi3:mini'")
            print("✅ Added model_used column to chat_history table")
        except: pass

    # Add columns to users table individually
    cursor.execute("PRAGMA table_info(users)")
    user_cols = [column[1] for column in cursor.fetchall()]
    
    if 'otp' not in user_cols:
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN otp TEXT")
            print("✅ Added otp column to users table")
        except: pass
        
    if 'otp_expiry' not in user_cols:
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN otp_expiry TEXT")
            print("✅ Added otp_expiry column to users table")
        except: pass
        
    if 'verified' not in user_cols:
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 0")
            print("✅ Added verified column to users table")
        except: pass

    if 'last_login' not in user_cols:
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN last_login TEXT")
            print("✅ Added last_login column to users table")
        except: pass

    # Create feedback_ratings table
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT,
                stars INTEGER,
                review TEXT,
                timestamp TIMESTAMP DEFAULT (datetime('now', '+5 hours', '30 minutes'))
            )
        ''')
    except: pass
        
    db.commit()

    # Create semantic_cache table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS semantic_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT UNIQUE,
            embedding BLOB,
            answer TEXT,
            sources TEXT,
            hit_count INTEGER DEFAULT 1,
            last_hit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    db.commit()

def init_db():
    """Initialize database tables if they don't exist"""
    db = get_db()
    cursor = db.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT (datetime('now', '+5 hours', '30 minutes')),
            total_queries INTEGER DEFAULT 0,
            otp TEXT,
            otp_expiry TEXT,
            verified INTEGER DEFAULT 0
        )
    ''')
    
    # Policies table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS policies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            file_path TEXT,
            pages INTEGER,
            chunks INTEGER,
            uploaded_by TEXT,
            uploaded_at TIMESTAMP DEFAULT (datetime('now', '+5 hours', '30 minutes'))
        )
    ''')
    
    # Embeddings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            policy_id INTEGER,
            chunk_index INTEGER,
            text TEXT,
            embedding BLOB,
            page_number INTEGER,
            section_title TEXT,
            FOREIGN KEY (policy_id) REFERENCES policies (id)
        )
    ''')
    
    # Chat history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT,
            question TEXT,
            answer TEXT,
            sources TEXT,
            timestamp TIMESTAMP DEFAULT (datetime('now', '+5 hours', '30 minutes')),
            FOREIGN KEY (user_email) REFERENCES users (email)
        )
    ''')
    
    # Admin logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin TEXT,
            action TEXT,
            details TEXT,
            timestamp TIMESTAMP DEFAULT (datetime('now', '+5 hours', '30 minutes'))
        )
    ''')

    # Pending OTPs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pending_otps (
            email TEXT PRIMARY KEY,
            otp TEXT,
            otp_expiry TEXT
        )
    ''')
    
    db.commit()
    
    # Run migration to add new columns
    migrate_database()
    
    print("✅ Database initialized successfully!")
