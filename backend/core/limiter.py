import os

try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    LIMITER_AVAILABLE = True
except ImportError:
    LIMITER_AVAILABLE = False

if LIMITER_AVAILABLE:
    limiter = Limiter(
        get_remote_address,
        default_limits=[],
        storage_uri="memory://"
    )
else:
    class _NoopLimiter:
        def limit(self, *a, **kw):
            return lambda f: f
    limiter = _NoopLimiter()
