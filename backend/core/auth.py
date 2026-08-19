import os
from functools import wraps
from datetime import datetime, timedelta
from flask import request, jsonify
from core.db import get_db, get_ist_now, ensure_ist

ENABLE_OTP_AUTH = False 

def is_otp_enabled():
    """Safely check if OTP authentication is enabled (defaults to False if line is commented out)"""
    try:
        return bool(ENABLE_OTP_AUTH)
    except NameError:
        return False

# Configuration & Constants
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'capstoneb2')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '1234')
ALLOWED_DOMAIN = "srmap.edu.in"
ALLOWED_EXTENSIONS = {'pdf'}

VALID_ADMINS = {
    'snehithbudati': 'manasa',
    'hiteshdoddala': '1234',
    'asmitamareedu': '1234',
    'capstoneb2': '1234'
}

ADMIN_EMAIL_MAPPINGS = {
    'snehithbudati': 'snehith0315@gmail.com',
    'hiteshdoddala': 'hiteshdoddala@gmail.com',
    'asmitamareedu': 'asmitaam04@gmail.com'
}

def authenticate_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Bypass admin OTP authentication if disabled
        if not is_otp_enabled():
            return f(*args, **kwargs)

        auth = request.authorization
        if not auth:
            return jsonify({'error': 'Authentication required'}), 401
            
        admin_username = auth.username
        otp_input = auth.password
        
        if admin_username in ADMIN_EMAIL_MAPPINGS:
            admin_email = ADMIN_EMAIL_MAPPINGS[admin_username]
            db = get_db()

            try:
                user_rec = db.execute('SELECT verified, last_login FROM users WHERE email = %s', (admin_email,)).fetchone()
                if user_rec and user_rec['verified'] == 1 and user_rec['last_login']:
                    last_login = ensure_ist(user_rec['last_login'])
                    if get_ist_now() < (last_login + timedelta(hours=2)):
                        return f(*args, **kwargs)
            except Exception as e:
                print(f"🔐 [AUTH DEBUG]: Admin session bypass check failed: {e}")

            user = db.execute('SELECT otp, otp_expiry FROM pending_otps WHERE email = %s', (admin_email,)).fetchone()
            
            if user and user['otp'] and user['otp'] == otp_input:
                expiry = ensure_ist(user['otp_expiry'])
                if get_ist_now() < expiry:
                    try:
                        new_expiry = (get_ist_now() + timedelta(minutes=30)).isoformat()
                        db.execute('UPDATE pending_otps SET otp_expiry = %s WHERE email = %s', (new_expiry, admin_email))
                        db.commit()
                    except Exception as e:
                        print(f"🔐 [AUTH DEBUG]: Failed to extend OTP expiry: {e}")
                        
                    return f(*args, **kwargs)
                else:
                    print(f"🔐 [AUTH DEBUG]: Admin {admin_username} OTP expired in DB")
            elif not user:
                print(f"🔐 [AUTH DEBUG]: Admin {admin_username} ({admin_email}) not found in pending_otps table")
            else:
                print(f"🔐 [AUTH DEBUG]: Admin {admin_username} OTP mismatch. Sent: '{otp_input}', DB: '{user['otp']}'")
        
        if admin_username in VALID_ADMINS and VALID_ADMINS[admin_username] == otp_input:
            return f(*args, **kwargs)
            
        print(f"🔐 [AUTH DEBUG]: Fallback failed for {admin_username}")
        return jsonify({'error': 'Invalid credentials or OTP'}), 401
    return decorated_function

def validate_srm_email(email):
    return email and email.endswith(f'@{ALLOWED_DOMAIN}')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
