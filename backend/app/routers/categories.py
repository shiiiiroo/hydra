from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import HydroObject, User
from app.auth_deps import get_current_user
from app import schemas
from app.config import STATUS_THRESHOLDS, STATUS_META

router = APIRouter(prefix="/api/categories", tags=["categories"])

TYPE_LABELS = {
    "channel": "Канал",
    "dam": "Плотина",
    "sluice": "Шлюз",
    "hydropost": "Гидропост",
    "intake": "Водозабор",
    "pump_station": "Насосная станция",
    "other": "Другое",
}

STATUS_LABELS = {
    "ok": "Исправное состояние",
    "watch": "Требует наблюдения",
    "repair": "Требует ремонта",
    "critical": "Аварийное состояние",
}

STATUS_CRITERIA = {
    "ok": f"Риск-скор < {STATUS_THRESHOLDS['ok_max']} (молодой объект, малый разрыв КПД, дефекты не зафиксированы)",
    "watch": f"Риск-скор {STATUS_THRESHOLDS['ok_max']}–{STATUS_THRESHOLDS['watch_max']}",
    "repair": (
        f"Риск-скор {STATUS_THRESHOLDS['watch_max']}–{STATUS_THRESHOLDS['repair_max']}, "
        f"либо исходное техническое состояние = «не удов.» (защитный порог)"
    ),
    "critical": f"Риск-скор ≥ {STATUS_THRESHOLDS['repair_max']}",
}

SIGNIFICANCE_LABELS = {
    "high": "Высокая",
    "medium": "Средняя",
    "low": "Низкая",
}

SIGNIFICANCE_DESCRIPTIONS = {
    "high": "Пропускная способность ≥ 5 м³/с или подвешенная площадь ≥ 1500 га",
    "medium": "Промежуточные значения пропускной способности и площади",
    "low": "Пропускная способность < 0.3 м³/с и площадь < 100 га",
}


@router.get("", response_model=schemas.CategoriesOut)
def get_categories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    type_rows = db.query(HydroObject.object_type, func.count(HydroObject.id)).group_by(HydroObject.object_type).all()
    types = [
        schemas.CategoryTypeInfo(object_type=t, label=TYPE_LABELS.get(t, t), count=c)
        for t, c in type_rows
    ]

    status_rows = dict(db.query(HydroObject.status, func.count(HydroObject.id)).group_by(HydroObject.status).all())
    statuses = [
        schemas.CategoryStatusInfo(
            status=s,
            label=STATUS_LABELS[s],
            color=STATUS_META[s]["color"],
            criteria=STATUS_CRITERIA[s],
            inspection_months=STATUS_META[s]["inspection_months"],
            count=status_rows.get(s, 0),
        )
        for s in ["ok", "watch", "repair", "critical"]
    ]

    sig_rows = dict(db.query(HydroObject.significance, func.count(HydroObject.id)).group_by(HydroObject.significance).all())
    significance = [
        schemas.CategorySignificanceInfo(
            significance=s,
            label=SIGNIFICANCE_LABELS[s],
            description=SIGNIFICANCE_DESCRIPTIONS[s],
            count=sig_rows.get(s, 0),
        )
        for s in ["high", "medium", "low"]
    ]

    return schemas.CategoriesOut(types=types, statuses=statuses, significance=significance)
