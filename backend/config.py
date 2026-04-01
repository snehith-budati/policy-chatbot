# #UPDATED on 4th March - Enable both Qwen and PaddleOCR
import os

# Database Configuration
DATABASE = 'policy_hub.db'
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}

# Ollama Configuration
OLLAMA_MODEL = 'phi3:mini'  # Kept as fallback
OLLAMA_URL = "http://localhost:11434/api/generate"

# #UPDATED - Qwen3.5 Configuration - ENABLED
QWEN3_5_MODELS = {
    '0.8b': 'qwen3.5:0.8b',
    '2b': 'qwen3.5:2b',
    '4b': 'qwen3.5:4b',
    '9b': 'qwen3.5:9b',
    '27b': 'qwen3.5:27b',
    '72b': 'qwen3.5:72b'
}

# Default Qwen3.5 model - using 2b for your system
DEFAULT_QWEN_MODEL = 'qwen3.5:2b'

# #UPDATED - Enable Qwen3.5
USE_QWEN3_5 = False  # Changed from False to True

# #UPDATED - Enable PaddleOCR
OCR_METHOD = 'standard'  # Changed back from 'paddle' because of 3.14 incompatibility

# PaddleOCR Configuration
PADDLEOCR_CONFIG = {
    'lang': 'en',
    'use_angle_cls': True,
    'show_log': False,
    'use_gpu': False,
    'enable_hpi': True,
    'det_db_thresh': 0.3,
    'det_db_box_thresh': 0.2,
    'det_db_unclip_ratio': 1.6,
    'max_batch_size': 10,
    'rec_batch_num': 6,
}

# Chunking Configuration
CHUNK_SIZE = 300
CHUNK_OVERLAP = 50

# Admin credentials
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'capstoneb2')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '1234')
ALLOWED_DOMAIN = "srmap.edu.in"