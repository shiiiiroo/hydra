"""
"Инструменты" (tools) для AI-агента — обычные Python-функции поверх той же
базы, которой пользуется REST API. Это сделано отдельным слоем специально:

  - Сегодня (без ключа API) их вызывает StubProvider по простым правилам
    (см. stub_provider.py) — агент уже отвечает на реальные вопросы по
    реальным данным, без какой-либо LLM.
  - Завтра, когда появится ключ Anthropic/Gemini, ровно ЭТИ ЖЕ функции
    становятся tool-définitions для function calling (см. anthropic_provider.py) —
    не нужно переписывать бизнес-логику, только подключить провайдера.

Если добавляете новую способность агенту — добавляйте функцию сюда,
она автоматически становится доступна обоим провайдерам.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models import HydroObject
from app.config import STATUS_META

STATUS_LABELS = {
    "ok": "исправное состояние", "watch": "требует наблюдения",
    "repair": "требует ремонта", "critical": "аварийное состояние",
}


def get_dashboard_summary(db: Session) -> dict:
    """Сводные счётчики по всей базе объектов."""
    total = db.query(HydroObject).count()
    counts = {s: db.query(HydroObject).filter(HydroObject.status == s).count() for s in STATUS_META}
    return {"total": total, "by_status": counts}


def search_objects(
    db: Session,
    query: Optional[str] = None,
    status: Optional[str] = None,
    anchor_key: Optional[str] = None,
    limit: int = 10,
) -> list[dict]:
    """Поиск объектов по коду/названию/району, статусу и/или району-якорю."""
    q = db.query(HydroObject)
    if query:
        like = f"%{query}%"
        q = q.filter(HydroObject.code.ilike(like) | HydroObject.display_name.ilike(like) | HydroObject.district_raw.ilike(like))
    if status:
        q = q.filter(HydroObject.status == status)
    if anchor_key:
        q = q.filter(HydroObject.anchor_key == anchor_key)
    rows = q.order_by(HydroObject.risk_score.desc()).limit(min(limit, 50)).all()
    return [
        {"id": o.id, "code": o.code, "name": o.display_name, "district": o.district_raw,
         "status": STATUS_LABELS.get(o.status, o.status), "risk_score": o.risk_score}
        for o in rows
    ]


def get_object_detail(db: Session, object_id: int) -> Optional[dict]:
    """Полная информация по одному объекту (для ответа на вопрос про конкретный канал)."""
    o = db.query(HydroObject).get(object_id)
    if not o:
        return None
    return {
        "id": o.id, "code": o.code, "name": o.display_name, "district": o.district_raw,
        "water_source": o.water_source, "commission_year": o.commission_year,
        "wear_percent": o.wear_percent, "condition_source": o.condition_source,
        "status": STATUS_LABELS.get(o.status, o.status), "risk_score": o.risk_score,
        "next_inspection_date": str(o.next_inspection_date) if o.next_inspection_date else None,
    }


def get_top_risky(db: Session, limit: int = 10) -> list[dict]:
    """Топ объектов по риск-скору — для вопросов вида 'какие объекты самые проблемные'."""
    rows = db.query(HydroObject).order_by(HydroObject.risk_score.desc()).limit(min(limit, 50)).all()
    return [{"code": o.code, "district": o.district_raw, "risk_score": o.risk_score, "status": STATUS_LABELS.get(o.status, o.status)} for o in rows]


# Машиночитаемое описание инструментов в формате, совместимом с Anthropic
# tool-use (JSON Schema). StubProvider игнорирует это и работает по
# ключевым словам; AnthropicProvider передаёт это напрямую в API.
TOOL_DEFINITIONS = [
    {
        "name": "get_dashboard_summary",
        "description": "Получить сводные счётчики объектов по статусам (сколько всего, сколько аварийных и т.д.)",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "search_objects",
        "description": "Найти объекты по тексту, статусу или району",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "текст поиска по коду/названию/района. Не включай этот параметр, если поиск по тексту не нужен."},
                "status": {
                    "type": "string",
                    "description": (
                        "Один из: ok, watch, repair, critical. "
                        "Если фильтр по статусу не нужен — не включай этот параметр вообще, "
                        "не передавай пустую строку."
                    ),
                },
                "anchor_key": {"type": "string", "description": "ключ района. Не включай этот параметр, если фильтр по району не нужен."},
                "limit": {"type": "integer", "default": 10},
            },
        },
    },
    {
        "name": "get_object_detail",
        "description": "Получить полную информацию по одному объекту по его id",
        "input_schema": {"type": "object", "properties": {"object_id": {"type": "integer"}}, "required": ["object_id"]},
    },
    {
        "name": "get_top_risky",
        "description": "Получить список самых рискованных объектов по риск-скору",
        "input_schema": {"type": "object", "properties": {"limit": {"type": "integer", "default": 10}}},
    },
]

TOOL_FUNCTIONS = {
    "get_dashboard_summary": get_dashboard_summary,
    "search_objects": search_objects,
    "get_object_detail": get_object_detail,
    "get_top_risky": get_top_risky,
}
