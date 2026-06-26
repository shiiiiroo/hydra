"""
Общий rate-limiter (slowapi/limits) — защита от brute-force на login и от
грубого злоупотребления API. Лимиты настраиваются в .env (Settings).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
