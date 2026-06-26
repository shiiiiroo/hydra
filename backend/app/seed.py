"""
Создание учётных записей по умолчанию.

Запускается автоматически при старте приложения, если таблица users пуста.
Пароль администратора берётся из .env (ADMIN_PASSWORD) — НЕ хардкодится.
Если .env не настроен, используется заглушка с явным предупреждением в
логах, чтобы это нельзя было не заметить.
"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models import User
from app.security import hash_password
from app.settings import get_settings

logger = logging.getLogger("hydromonitor.seed")
settings = get_settings()


def seed_default_users(db: Session):
    if db.query(User).count() > 0:
        return  # уже инициализировано — не трогаем существующие учётки

    admin = User(
        username=settings.ADMIN_USERNAME,
        email=settings.ADMIN_EMAIL,
        full_name="Администратор системы",
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        role="admin",
    )
    db.add(admin)

    if settings.ADMIN_PASSWORD == "CHANGE_ME_ON_FIRST_LOGIN":
        logger.warning(
            "⚠️  ADMIN_PASSWORD не задан в .env — используется значение по "
            "умолчанию 'CHANGE_ME_ON_FIRST_LOGIN'. ОБЯЗАТЕЛЬНО смените пароль "
            "после первого входа или задайте ADMIN_PASSWORD в .env до первого запуска."
        )

    if settings.CREATE_DEMO_VIEWER:
        viewer = User(
            username=settings.DEMO_VIEWER_USERNAME,
            full_name="Демо-доступ только для чтения",
            password_hash=hash_password(settings.DEMO_VIEWER_PASSWORD),
            role="viewer",
        )
        db.add(viewer)

    db.commit()
    logger.info(f"Создана учётная запись администратора: {settings.ADMIN_USERNAME}")
