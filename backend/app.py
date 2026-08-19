import os
import ollama
from flask import Flask, request
from flask_cors import CORS

from config import OLLAMA_MODEL, DATABASE, UPLOAD_FOLDER
from core.db import init_db, close_connection, log_admin_action
from core.limiter import limiter, LIMITER_AVAILABLE
from services.ocr_service import (
    PDF2IMAGE_AVAILABLE, TESSERACT_AVAILABLE, EASYOCR_AVAILABLE,
    MLX_AVAILABLE, GLM_OCR_MODEL_PATH
)

from routes.auth import auth_bp
from routes.chat import chat_bp
from routes.upload import upload_bp
from routes.policies import policies_bp
from routes.admin import admin_bp
from routes.system import system_bp

app = Flask(__name__)
CORS(app)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

if LIMITER_AVAILABLE and hasattr(limiter, 'init_app'):
    limiter.init_app(app)

@app.teardown_appcontext
def teardown_db(exception):
    close_connection(exception)

@app.before_request
def log_admin_access():
    if request.path == '/admin/stats' and request.method == 'GET':
        auth = request.authorization
        if auth:
            log_admin_action(auth.username, "ACCESS", "Accessed Admin Dashboard")

app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(upload_bp)
app.register_blueprint(policies_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(system_bp)

with app.app_context():
    init_db()

if __name__ == '__main__':
    print("=" * 70)
    print("🎓 SRM University AP - Universal Policy Hub")
    print("=" * 70)
    print(f"📁 Database: {DATABASE}")
    print(f"🤖 Ollama Model: {OLLAMA_MODEL}")
    print(f"🔍 Extraction Method: GLM-OCR (primary) + fallbacks")
    print(f"   ├─ GLM-OCR: {'✅' if MLX_AVAILABLE else '❌'}")
    print(f"   ├─ pdf2image: {'✅' if PDF2IMAGE_AVAILABLE else '❌'}")
    print(f"   ├─ Tesseract: {'✅' if TESSERACT_AVAILABLE else '❌'}")
    print(f"   └─ EasyOCR: {'✅' if EASYOCR_AVAILABLE else '❌'}")
    print("-" * 70)
    
    try:
        ollama.list()
        print("✅ Ollama connection successful!")
    except Exception:
        print("⚠️  Ollama not running. Please run: ollama serve")
    
    if MLX_AVAILABLE:
        if os.path.exists(GLM_OCR_MODEL_PATH):
            print("✅ GLM-OCR model found")
        else:
            print("⚠️  GLM-OCR model not found. Download with:")
            print("    pip install huggingface-hub")
            print("    huggingface-cli download mlx-community/GLM-OCR-8bit --local-dir ./models/GLM-OCR-8bit")
    
    print("=" * 70)
    print("🚀 Server starting on http://localhost:5001")
    print("=" * 70)
    
    app.run(host='0.0.0.0', port=5001, debug=True)