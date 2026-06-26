from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import HydroObject, User
from app.auth_deps import get_current_user
from app import schemas
from app.config import STATUS_META, DISTRICT_ANCHORS

router = APIRouter(prefix="/api/stats", tags=["stats"])

STATUS_LABELS_RU = {
    "ok": "Исправное состояние",
    "watch": "Требует наблюдения",
    "repair": "Требует ремонта",
    "critical": "Аварийное состояние",
}


@router.get("/dashboard", response_model=schemas.DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total = db.query(func.count(HydroObject.id)).scalar() or 0

    counts = {row[0]: row[1] for row in db.query(HydroObject.status, func.count(HydroObject.id)).group_by(HydroObject.status).all()}
    avg_wear = db.query(func.avg(HydroObject.wear_percent)).scalar()
    districts_count = db.query(func.count(func.distinct(HydroObject.anchor_key))).scalar() or 0

    last_updated = (
        db.query(HydroObject)
        .order_by(HydroObject.updated_at.desc())
        .limit(5)
        .all()
    )

    return schemas.DashboardStats(
        total=total,
        ok=counts.get("ok", 0),
        watch=counts.get("watch", 0),
        repair=counts.get("repair", 0),
        critical=counts.get("critical", 0),
        avg_wear=round(avg_wear, 2) if avg_wear is not None else None,
        districts_count=districts_count,
        last_updated_objects=last_updated,
    )


@router.get("/analytics", response_model=schemas.AnalyticsOverview)
def analytics_overview(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    status_rows = db.query(HydroObject.status, func.count(HydroObject.id)).group_by(HydroObject.status).all()
    status_counts = {s: c for s, c in status_rows}
    by_status = [
        schemas.StatusCount(
            status=s,
            label=STATUS_LABELS_RU[s],
            count=status_counts.get(s, 0),
            color=STATUS_META[s]["color"],
        )
        for s in ["ok", "watch", "repair", "critical"]
    ]

    district_rows = (
        db.query(HydroObject.anchor_key, HydroObject.anchor_name, func.count(HydroObject.id))
        .group_by(HydroObject.anchor_key, HydroObject.anchor_name)
        .all()
    )
    crit_rows = dict(
        db.query(HydroObject.anchor_key, func.count(HydroObject.id))
        .filter(HydroObject.status == "critical")
        .group_by(HydroObject.anchor_key)
        .all()
    )
    by_district = [
        schemas.DistrictCount(
            anchor_key=k or "—", anchor_name=n or "—", count=c, critical_count=crit_rows.get(k, 0)
        )
        for k, n, c in district_rows
    ]
    by_district.sort(key=lambda d: d.count, reverse=True)

    objs_with_year = db.query(HydroObject.commission_year).filter(HydroObject.commission_year.isnot(None)).all()
    decade_counts: dict[int, int] = {}
    for (year,) in objs_with_year:
        decade = (year // 10) * 10
        decade_counts[decade] = decade_counts.get(decade, 0) + 1
    by_decade = [schemas.YearBucket(decade=d, count=c) for d, c in sorted(decade_counts.items())]

    top_risky = (
        db.query(HydroObject)
        .order_by(HydroObject.risk_score.desc())
        .limit(10)
        .all()
    )
    top_risky_out = [
        schemas.TopRisky(
            id=o.id, code=o.code, display_name=o.display_name,
            risk_score=o.risk_score, status=o.status, wear_percent=o.wear_percent,
        ) for o in top_risky
    ]

    avg_design = db.query(func.avg(HydroObject.kpd_design)).scalar()
    avg_actual = db.query(func.avg(HydroObject.kpd_actual)).scalar()

    total = db.query(func.count(HydroObject.id)).scalar() or 1
    needs_reconstruction = db.query(func.count(HydroObject.id)).filter(HydroObject.needs_reconstruction.is_(True)).scalar() or 0
    total_length = db.query(func.sum(HydroObject.length_before_km)).scalar()

    return schemas.AnalyticsOverview(
        by_status=by_status,
        by_district=by_district,
        by_decade=by_decade,
        top_risky=top_risky_out,
        avg_kpd_design=round(avg_design, 3) if avg_design is not None else None,
        avg_kpd_actual=round(avg_actual, 3) if avg_actual is not None else None,
        reconstruction_needed_share=round(needs_reconstruction / total, 3),
        total_length_km=round(total_length, 1) if total_length is not None else None,
    )
