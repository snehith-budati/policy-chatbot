import os
from flask import Blueprint, jsonify

from core.db import get_db
from services.ocr_service import (
    PDF2IMAGE_AVAILABLE, MLX_AVAILABLE, GLM_OCR_MODEL_PATH,
    TESSERACT_AVAILABLE, EASYOCR_AVAILABLE
)

system_bp = Blueprint('system', __name__)

@system_bp.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'vectors': get_db().execute('SELECT COUNT(*) as count FROM embeddings').fetchone()['count'],
        'policies': get_db().execute('SELECT COUNT(*) as count FROM policies').fetchone()['count'],
        'extraction_method': 'glm-ocr (primary) + fallbacks',
        'pdf2image_available': PDF2IMAGE_AVAILABLE,
        'mlx_available': MLX_AVAILABLE,
        'glm_ocr_available': os.path.exists(GLM_OCR_MODEL_PATH),
        'extraction_methods': {
            'glm_ocr': MLX_AVAILABLE,
            'tesseract': TESSERACT_AVAILABLE,
            'easyocr': EASYOCR_AVAILABLE
        }
    })
