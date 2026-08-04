from flask import Blueprint, request, jsonify

from core.db import get_db, log_admin_action
from core.auth import authenticate_admin, ADMIN_EMAIL_MAPPINGS
from middleware.db_middleware import (
    fetch_admin_dashboard_stats, fetch_admin_analytics_data,
    delete_user_and_history
)

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin/stats', methods=['GET'])
@authenticate_admin
def admin_stats():
    admin_emails = list(ADMIN_EMAIL_MAPPINGS.values())
    stats = fetch_admin_dashboard_stats(admin_emails)
    return jsonify(stats)

@admin_bp.route('/admin/analytics', methods=['GET'])
@authenticate_admin
def admin_analytics():
    admin_emails = list(ADMIN_EMAIL_MAPPINGS.values())
    analytics = fetch_admin_analytics_data(admin_emails)
    return jsonify(analytics)

@admin_bp.route('/admin/model-metrics', methods=['GET'])
@authenticate_admin
def admin_model_metrics():
    """Return per-model evaluation metrics plus system-wide averages."""
    db = get_db()
    admin_emails = list(ADMIN_EMAIL_MAPPINGS.values())
    placeholders = ', '.join(['?'] * len(admin_emails))

    rows = db.execute(f'''
        SELECT
            COALESCE(model_used, 'Phi-3 Mini') AS model_name,
            COUNT(*) AS total_queries,
            ROUND(AVG(CASE WHEN duration > 0 THEN duration END), 2) AS avg_latency,
            ROUND(AVG(CASE WHEN confidence > 0 THEN confidence END), 4) AS avg_confidence,
            SUM(CASE WHEN satisfaction = 1 THEN 1 ELSE 0 END) AS positive,
            SUM(CASE WHEN satisfaction IS NOT NULL THEN 1 ELSE 0 END) AS rated
        FROM chat_history
        WHERE user_email NOT IN ({placeholders})
        GROUP BY model_name
        ORDER BY total_queries DESC
    ''', admin_emails).fetchall()

    models = []
    for r in rows:
        rated = r['rated'] or 0
        positive = r['positive'] or 0
        satisfaction = round(positive / rated * 100, 1) if rated > 0 else None
        avg_conf = r['avg_confidence'] or 0
        models.append({
            'model': r['model_name'],
            'total_queries': r['total_queries'],
            'avg_latency': r['avg_latency'] or 0,
            'avg_confidence': round(avg_conf * 100, 1),
            'satisfaction_rate': satisfaction,
            'rated_count': rated,
        })

    overall = db.execute(f'''
        SELECT
            COUNT(*) AS total_queries,
            ROUND(AVG(CASE WHEN duration > 0 THEN duration END), 2) AS avg_latency,
            ROUND(AVG(CASE WHEN confidence > 0 THEN confidence END), 4) AS avg_confidence,
            SUM(CASE WHEN satisfaction = 1 THEN 1 ELSE 0 END) AS positive,
            SUM(CASE WHEN satisfaction IS NOT NULL THEN 1 ELSE 0 END) AS rated
        FROM chat_history
        WHERE user_email NOT IN ({placeholders})
    ''', admin_emails).fetchone()

    o_rated = overall['rated'] or 0
    o_positive = overall['positive'] or 0
    avg = {
        'total_queries': overall['total_queries'] or 0,
        'avg_latency': overall['avg_latency'] or 0,
        'avg_confidence': round((overall['avg_confidence'] or 0) * 100, 1),
        'satisfaction_rate': round(o_positive / o_rated * 100, 1) if o_rated > 0 else None,
    }

    return jsonify({'models': models, 'overall': avg})

@admin_bp.route('/admin/users', methods=['GET'])
@authenticate_admin
def admin_users():
    db = get_db()
    admin_emails = list(ADMIN_EMAIL_MAPPINGS.values())
    placeholders = ', '.join(['?'] * len(admin_emails))
    
    query = f'SELECT email, created_at, total_queries FROM users WHERE verified = 1 AND email NOT IN ({placeholders}) ORDER BY created_at DESC'
    return jsonify([dict(u) for u in db.execute(query, admin_emails).fetchall()])

@admin_bp.route('/admin/users/<email>', methods=['DELETE'])
@authenticate_admin
def admin_delete_user(email):
    delete_user_and_history(email)
    log_admin_action(request.authorization.username if request.authorization else "Admin", "DELETE_USER", f"Deleted user: {email}")
    return jsonify({'success': True})

@admin_bp.route('/admin/chats', methods=['GET'])
@authenticate_admin
def admin_chats():
    db = get_db()
    return jsonify({'chats': [dict(c) for c in db.execute('SELECT user_email as user, question, answer, timestamp, satisfaction, sources FROM chat_history ORDER BY timestamp DESC LIMIT 100').fetchall()]})

@admin_bp.route('/admin/chats/user/<email>', methods=['GET'])
@authenticate_admin
def admin_user_chats(email):
    db = get_db()
    return jsonify({'chats': [dict(c) for c in db.execute('SELECT question, answer, timestamp, satisfaction FROM chat_history WHERE user_email = ? ORDER BY timestamp DESC', (email,)).fetchall()]})
