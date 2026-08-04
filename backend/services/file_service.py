import os
import io
from flask import send_from_directory, jsonify
from werkzeug.utils import secure_filename
from core.auth import ALLOWED_EXTENSIONS

def is_allowed_pdf(filename):
    #extension
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def read_file_bytes(file_storage):
    #Reading file storage object directly into RAM memory stream (bytes)
    file_bytes = file_storage.read()
    file_storage.seek(0)  # Reset stream position
    return file_bytes

def validate_pdf_stream(pdf_bytes):
    #Validate the header in PDF in RAM Stream if the header's correct then proceeds      
    if not pdf_bytes or len(pdf_bytes) < 4:
        return False
    return pdf_bytes[:4] == b'%PDF'

def save_file_to_storage(file_storage, upload_folder, filename=None):
    #To save file in server storage folder
    if not filename:
        filename = secure_filename(file_storage.filename)
    filepath = os.path.join(upload_folder, filename)
    file_storage.save(filepath)
    return filepath

def serve_file_from_storage(upload_folder, filename):
    #To Serve PDF from upload directory
    safe_name = secure_filename(filename)
    pdf_path = os.path.join(upload_folder, safe_name)
    if not os.path.exists(pdf_path):
        return jsonify({'error': 'PDF file not found'}), 404
        
    return send_from_directory(
        upload_folder,
        safe_name,
        mimetype='application/pdf',
        as_attachment=False,
        download_name=safe_name
    )
