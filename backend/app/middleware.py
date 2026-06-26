"""
Базовые security-заголовки (аналог helmet.js для Express). Не заменяют
HTTPS-терминацию на реверс-прокси, но это стандартный минимум, который
ожидают увидеть в любом security-чеклисте.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "0"  # современные браузеры игнорируют, оставлено для legacy-сканеров
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response
