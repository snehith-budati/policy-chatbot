from flask import Blueprint, request, jsonify

from core.db import log_admin_action
from core.auth import authenticate_admin, ADMIN_EMAIL_MAPPINGS
from middleware.business_layer import (
    fetch_admin_dashboard_stats,
    fetch_admin_analytics_data,
    fetch_admin_model_metrics,
    fetch_admin_users,
    fetch_admin_chats,
    fetch_admin_user_chats,
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
    """Return per-model evaluation metrics plus system-wide averages using business layer."""
    admin_emails = list(ADMIN_EMAIL_MAPPINGS.values())
    metrics = fetch_admin_model_metrics(admin_emails)
    return jsonify(metrics)

@admin_bp.route('/admin/users', methods=['GET'])
@authenticate_admin
def admin_users():
    """Return list of non-admin verified users using business layer."""
    admin_emails = list(ADMIN_EMAIL_MAPPINGS.values())
    users = fetch_admin_users(admin_emails)
    return jsonify(users)

@admin_bp.route('/admin/users/<email>', methods=['DELETE'])
@authenticate_admin
def admin_delete_user(email):
    """Delete user and user chat history using business layer."""
    delete_user_and_history(email)
    log_admin_action(request.authorization.username if request.authorization else "Admin", "DELETE_USER", f"Deleted user: {email}")
    return jsonify({'success': True})

@admin_bp.route('/admin/chats', methods=['GET'])
@authenticate_admin
def admin_chats():
    """Return recent global chats using business layer."""
    chats = fetch_admin_chats()
    return jsonify({'chats': chats})

@admin_bp.route('/admin/chats/user/<email>', methods=['GET'])
@authenticate_admin
def admin_user_chats(email):
    """Return chats for a specific user using business layer."""
    chats = fetch_admin_user_chats(email)
    return jsonify({'chats': chats})
