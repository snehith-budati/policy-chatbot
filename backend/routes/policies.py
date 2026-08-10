import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory, url_for
from werkzeug.utils import secure_filename

from core.db import log_admin_action
from core.auth import authenticate_admin
from middleware.db_middleware import (
    fetch_all_policies, fetch_policy_by_name, fetch_user_by_email,
    fetch_policy_chunks_for_compare, delete_policy_record
)

policies_bp = Blueprint('policies', __name__)

@policies_bp.route('/policies', methods=['GET'])
def get_policies():
    policies = fetch_all_policies()
    return jsonify([dict(p) for p in policies])

@policies_bp.route('/policies/<path:pdf_name>/view', methods=['GET'])
def view_policy_pdf(pdf_name):
    try:
        user_email = request.headers.get('X-User-Email') or request.args.get('user_email')
        
        if user_email:
            user = fetch_user_by_email(user_email)
            if not user:
                return jsonify({'error': 'User not found'}), 404
        
        upload_folder = current_app.config['UPLOAD_FOLDER']
        pdf_path = os.path.join(upload_folder, secure_filename(pdf_name))
        
        if not os.path.exists(pdf_path):
            return jsonify({'error': 'PDF not found'}), 404
        
        return send_from_directory(
            upload_folder, 
            secure_filename(pdf_name),
            mimetype='application/pdf',
            as_attachment=False,
            download_name=pdf_name
        )
        
    except Exception as e:
        print(f"Error serving PDF: {e}")
        return jsonify({'error': str(e)}), 500

@policies_bp.route('/policies/<path:pdf_name>/compare', methods=['GET'])
def get_policy_for_comparison(pdf_name):
    try:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        pdf_path = os.path.join(upload_folder, secure_filename(pdf_name))
        if not os.path.exists(pdf_path):
            return jsonify({'error': 'PDF not found'}), 404

        policy = fetch_policy_by_name(pdf_name)
        if not policy:
            return jsonify({'error': 'Policy record not found'}), 404

        chunks = fetch_policy_chunks_for_compare(policy['id'])
        extracted_text = "\n\n".join([f"--- Page {c['page_number']+1} ---\n{c['text']}" for c in chunks])
        pdf_url = url_for('policies.serve_pdf', filename=pdf_name, _external=True)

        return jsonify({
            'pdf_url': pdf_url,
            'extracted_text': extracted_text,
            'policy_name': pdf_name
        })

    except Exception as e:
        print(f"Error in compare endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@policies_bp.route('/serve-pdf/<filename>', methods=['GET'])
@authenticate_admin
def serve_pdf(filename):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, secure_filename(filename))

@policies_bp.route('/policies/<path:pdf_name>', methods=['DELETE'])
@authenticate_admin
def delete_policy(pdf_name):
    success = delete_policy_record(pdf_name)
    if success:
        admin_user = request.authorization.username if request.authorization else "Admin"
        log_admin_action(admin_user, "DELETE", f"Deleted policy: {pdf_name}")
        return jsonify({'success': True})
    return jsonify({'error': 'Policy not found'}), 404

@policies_bp.route('/debug/policy/<filename>', methods=['GET'])
@authenticate_admin
def debug_policy(filename):
    policy = fetch_policy_by_name(filename)
    if not policy:
        return jsonify({'error': 'Policy not found'}), 404
    
    chunks = fetch_policy_chunks_for_compare(policy['id'])
    return jsonify({
        'policy': dict(policy),
        'chunks': [dict(c) for c in chunks[:20]],
        'total_chunks': len(chunks)
    })
