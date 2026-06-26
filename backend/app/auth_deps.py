"""
Зависимости FastAPI для аутентификации и RBAC (role-based access control).

Паттерн: get_current_user читает Bearer-токен, проверяет подпись/срок
действия и подгружает живого пользователя из базы (а не доверяет только
содержимому токена) — так мгновенно работает деактивация пользователя
(is_active=False рвёт доступ немедленно, токен не нужно ждать пока истечёт).

require_role(...) — фабрика зависимостей для поэндпоинтной авторизации:
    @router.post(..., dependencies=[Depends(require_role("admin", "inspector"))])
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

ROLE_HIERARCHY = {"viewer": 0, "inspector": 1, "admin": 2}


def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Требуется аутентификация",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_error

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_error

    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise credentials_error
    return user


def get_optional_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User | None:
    """Для эндпоинтов, которые работают и без логина, но персонализируются если он есть."""
    if not token:
        return None
    try:
        return get_current_user(token, db)
    except HTTPException:
        return None


def require_role(*allowed_roles: str):
    """Допускает либо точное совпадение роли, либо роль выше в иерархии (admin может всё, что может inspector)."""
    min_level = min(ROLE_HIERARCHY[r] for r in allowed_roles)

    def dependency(user: User = Depends(get_current_user)) -> User:
        if ROLE_HIERARCHY.get(user.role, -1) < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав. Требуется роль: {' или '.join(allowed_roles)}",
            )
        return user

    return dependency
