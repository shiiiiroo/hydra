"""
Криптографические примитивы аутентификации.

- Пароли хранятся только как bcrypt-хэш (passlib), никогда в открытом виде.
- Токены доступа — JWT (HS256), короткоживущие (по умолчанию 30 минут) +
  refresh-токен подольше для продления сессии без повторного ввода пароля.
- SECRET_KEY обязателен к замене в .env для прод — см. settings.py.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.settings import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_token(subject: str, role: str, expires_delta: timedelta, token_type: str = "access") -> str:
    now = datetime.utcnow()
    payload = {
        "sub": subject,
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(username: str, role: str) -> str:
    return create_token(username, role, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), "access")


def create_refresh_token(username: str, role: str) -> str:
    return create_token(username, role, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), "refresh")


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
