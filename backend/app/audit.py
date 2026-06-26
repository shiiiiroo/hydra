from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models import AuditLog


def log_action(
    db: Session,
    actor_username: Optional[str],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
):
    """Записывает запись в сквозной журнал действий. Не бросает исключений —
    сбой логирования никогда не должен ронять основной запрос."""
    try:
        db.add(AuditLog(
            actor_username=actor_username, action=action, target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            details=details, ip_address=ip_address,
        ))
        db.commit()
    except Exception:
        db.rollback()
