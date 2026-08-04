import os

# Database Configuration (PostgreSQL)
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'policy_hub')
DB_USER = os.environ.get('DB_USER', 'policy_user')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '1234')

DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)
DATABASE = DATABASE_URL # Kept for backwards compatibility if referenced
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}

# Ollama Configuration
OLLAMA_MODEL = 'phi3:mini'
OLLAMA_URL = "http://localhost:11434/api/generate"

# Chunking Configuration
CHUNK_SIZE = 300
CHUNK_OVERLAP = 50

# Admin credentials & domain rules
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'capstoneb2')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '1234')
ALLOWED_DOMAIN = "srmap.edu.in"