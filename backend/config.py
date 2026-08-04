import os

# Database Configuration
DATABASE = 'policy_hub.db'
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