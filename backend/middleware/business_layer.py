from core.db import get_db
from middleware.db_middleware import (
    fetch_admin_dashboard_stats,
    fetch_admin_analytics_data,
    delete_user_and_history,
    fetch_all_policies,
    fetch_policy_by_name,
    delete_policy_record,
    fetch_policy_chunks_for_compare,
    fetch_user_by_email,
    check_user_has_feedback,
    fetch_pending_otp,
    save_pending_otp,
    mark_user_verified,
    save_chat_record,
    update_chat_satisfaction,
    save_user_feedback,
    save_policy_with_chunks,
    reset_all_database_records
)


def fetch_admin_model_metrics(admin_emails):
    db = get_db()
    placeholders = ', '.join(['%s'] * len(admin_emails))

    rows = db.execute(f'''
        SELECT
            COALESCE(model_used, 'Phi-3 Mini') AS model_name,
            COUNT(*) AS total_queries,
            ROUND(CAST(AVG(CASE WHEN duration > 0 THEN duration END) AS numeric), 2) AS avg_latency,
            ROUND(CAST(AVG(CASE WHEN confidence > 0 THEN confidence END) AS numeric), 4) AS avg_confidence,
            SUM(CASE WHEN satisfaction = TRUE THEN 1 ELSE 0 END) AS positive,
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
        avg_conf = float(r['avg_confidence'] or 0)
        models.append({
            'model': r['model_name'],
            'total_queries': r['total_queries'],
            'avg_latency': float(r['avg_latency'] or 0),
            'avg_confidence': round(avg_conf * 100, 1),
            'satisfaction_rate': satisfaction,
            'rated_count': rated,
        })

    overall = db.execute(f'''
        SELECT
            COUNT(*) AS total_queries,
            ROUND(CAST(AVG(CASE WHEN duration > 0 THEN duration END) AS numeric), 2) AS avg_latency,
            ROUND(CAST(AVG(CASE WHEN confidence > 0 THEN confidence END) AS numeric), 4) AS avg_confidence,
            SUM(CASE WHEN satisfaction = TRUE THEN 1 ELSE 0 END) AS positive,
            SUM(CASE WHEN satisfaction IS NOT NULL THEN 1 ELSE 0 END) AS rated
        FROM chat_history
        WHERE user_email NOT IN ({placeholders})
    ''', admin_emails).fetchone()

    o_rated = overall['rated'] or 0
    o_positive = overall['positive'] or 0
    avg = {
        'total_queries': overall['total_queries'] or 0,
        'avg_latency': float(overall['avg_latency'] or 0),
        'avg_confidence': round(float(overall['avg_confidence'] or 0) * 100, 1),
        'satisfaction_rate': round(o_positive / o_rated * 100, 1) if o_rated > 0 else None,
    }

    return {'models': models, 'overall': avg}


def fetch_admin_users(admin_emails):
    db = get_db()
    placeholders = ', '.join(['%s'] * len(admin_emails))
    query = f'SELECT email, created_at, total_queries FROM users WHERE verified = 1 AND email NOT IN ({placeholders}) ORDER BY created_at DESC'
    return [dict(u) for u in db.execute(query, admin_emails).fetchall()]


def fetch_admin_chats(limit=100):
    db = get_db()
    query = 'SELECT user_email as user, question, answer, timestamp, satisfaction, sources FROM chat_history ORDER BY timestamp DESC LIMIT %s'
    return [dict(c) for c in db.execute(query, (limit,)).fetchall()]


def fetch_admin_user_chats(email):
    db = get_db()
    query = 'SELECT question, answer, timestamp, satisfaction FROM chat_history WHERE user_email = %s ORDER BY timestamp DESC'
    return [dict(c) for c in db.execute(query, (email,)).fetchall()]


def fetch_system_counts():
    db = get_db()
    vector_count = db.execute('SELECT COUNT(*) as count FROM embeddings').fetchone()['count']
    policy_count = db.execute('SELECT COUNT(*) as count FROM policies').fetchone()['count']
    return {
        'vectors': vector_count,
        'policies': policy_count
    }
