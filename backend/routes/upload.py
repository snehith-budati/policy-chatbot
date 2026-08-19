import os
import traceback
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from core.db import log_admin_action
from core.auth import authenticate_admin
from services.file_service import is_allowed_pdf, read_file_bytes, validate_pdf_stream, save_file_to_storage
from services.ocr_service import extract_text_hybrid
from services.rag_service import chunk_text_intelligently
from middleware.db_middleware import save_policy_with_chunks

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/upload', methods=['POST'])
@authenticate_admin
def upload_policy():
    print("\n" + "="*70)
    print("📤 UPLOAD REQUEST RECEIVED (STREAM PROCESSING)")
    print("="*70)
    
    if 'file' not in request.files:
        print("❌ No 'file' field in request")
        return jsonify({'error': 'No file provided'}), 400
    
    files = request.files.getlist('file')
    print(f"📁 Number of files received: {len(files)}")
    
    if len(files) == 0:
        print("❌ No files in filelist")
        return jsonify({'error': 'No files selected'}), 400
    
    uploaded_by = request.authorization.username if request.authorization else "Admin"
    
    user_category = request.form.get('category_name') or request.form.get('category') or request.form.get('policy_type')
    user_version = request.form.get('version_name') or request.form.get('version') or 'v1.0'
    print(f"👤 Uploaded by: {uploaded_by} | Category: {user_category or 'Auto-detect'} | Version: {user_version}")
    
    results = []
    upload_folder = current_app.config['UPLOAD_FOLDER']
    
    for file_idx, file in enumerate(files):
        if file and is_allowed_pdf(file.filename):
            filename = secure_filename(file.filename)
            print(f"\n📄 Processing file {file_idx+1}: {filename}")
            
            try:
                pdf_bytes = read_file_bytes(file)
                print(f"  🧠 Read {len(pdf_bytes)} bytes directly into RAM memory stream")
                
                if not validate_pdf_stream(pdf_bytes):
                    raise Exception("Not a valid PDF file stream (Header mismatch)")
                print(f"  ✅ Valid PDF header (%PDF) verified in RAM stream")
                
                filepath = save_file_to_storage(file, upload_folder, filename)
                print(f"  💾 Saved copy to storage: {filepath}")
                
                print(f"  🔍 Starting OCR extraction directly from RAM stream...")
                text_by_page = extract_text_hybrid(pdf_bytes)
                
                if not text_by_page:
                    print(f"  ❌ No text extracted from PDF stream")
                    results.append({
                        'filename': filename,
                        'status': 'error',
                        'error': 'Could not extract any text from PDF stream.'
                    })
                    continue
                
                print(f"  ✅ Extracted text from {len(text_by_page)} pages")
                
                if user_category and user_category.strip():
                    category_name = user_category.strip()
                else:
                    category_name = "General"
                    filename_lower = filename.lower()
                    if 'intern' in filename_lower:
                        category_name = "Internship Policy"
                    elif 'email' in filename_lower:
                        category_name = "Email Policy"
                    elif 'hr' in filename_lower:
                        category_name = "HR Policy"
                    elif 'it' in filename_lower or 'security' in filename_lower:
                        category_name = "IT Security Policy"
                    elif 'conduct' in filename_lower:
                        category_name = "Student Code of Conduct"
                
                version_name = user_version.strip() if (user_version and user_version.strip()) else "v1.0"
                policy_type = category_name
                
                print(f"  ✂️ Creating chunks...")
                chunks = chunk_text_intelligently(text_by_page)
                print(f"  ✅ Created {len(chunks)} chunks")
                
                print(f"  📝 Database Middleware: Saving policy and embeddings...")
                policy_id, successful_chunks = save_policy_with_chunks(
                    filename=filename,
                    filepath=filepath,
                    pages_count=len(text_by_page),
                    chunks=chunks,
                    uploaded_by=uploaded_by,
                    policy_type=policy_type,
                    category_name=category_name,
                    version_name=version_name
                )
                
                extraction_method = text_by_page[0].get('method', 'glm-ocr') if text_by_page else 'unknown'
                
                results.append({
                    'filename': filename,
                    'status': 'success',
                    'pages': len(text_by_page),
                    'chunks': successful_chunks,
                    'category_name': category_name,
                    'policy_type': policy_type,
                    'version_name': version_name,
                    'extraction_method': extraction_method
                })
                
                print(f"✅ Successfully uploaded {filename} [{category_name} - {version_name}]: {successful_chunks} chunks using {extraction_method}")
                
            except Exception as e:
                print(f"❌ Error uploading {filename}: {e}")
                traceback.print_exc()
                results.append({
                    'filename': filename,
                    'status': 'error',
                    'error': str(e)
                })
        else:
            results.append({
                'filename': file.filename if file else 'unknown',
                'status': 'error',
                'error': 'Invalid file type. Only PDF files are allowed.'
            })
    
    uploaded_files = [r['filename'] for r in results if r['status'] == 'success']
    if uploaded_files:
        log_admin_action(uploaded_by, "UPLOAD", f"Uploaded {len(uploaded_files)} policies: {', '.join(uploaded_files[:3])}")

    return jsonify({'results': results})
