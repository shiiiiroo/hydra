from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import HydroObject, StatusHistory, User
from app import schemas, scoring, geo
from app.config import STATUS_ORDER, STATUS_META
from app.auth_deps import get_current_user, require_role
from app.audit import log_action

router = APIRouter(prefix="/api/objects", tags=["objects"])

SORTABLE_FIELDS = {
    "id": HydroObject.id,
    "code": HydroObject.code,
    "commission_year": HydroObject.commission_year,
    "wear_percent": HydroObject.wear_percent,
    "risk_score": HydroObject.risk_score,
    "status": HydroObject.status,
    "capacity_m3s": HydroObject.capacity_m3s,
    "district_raw": HydroObject.district_raw,
}


def _apply_filters(
    query,
    search: Optional[str],
    status_: Optional[str],
    anchor_key: Optional[str],
    significance: Optional[str],
    wear_min: Optional[float],
    wear_max: Optional[float],
    year_min: Optional[int],
    year_max: Optional[int],
):
    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            HydroObject.code.ilike(like),
            HydroObject.display_name.ilike(like),
            HydroObject.district_raw.ilike(like),
            HydroObject.cadastre_number.ilike(like),
        ))
    if status_:
        statuses = [s.strip() for s in status_.split(",") if s.strip()]
        if statuses:
            query = query.filter(HydroObject.status.in_(statuses))
    if anchor_key:
        keys = [k.strip() for k in anchor_key.split(",") if k.strip()]
        if keys:
            query = query.filter(HydroObject.anchor_key.in_(keys))
    if significance:
        sigs = [s.strip() for s in significance.split(",") if s.strip()]
        if sigs:
            query = query.filter(HydroObject.significance.in_(sigs))
    if wear_min is not None:
        query = query.filter(HydroObject.wear_percent >= wear_min)
    if wear_max is not None:
        query = query.filter(HydroObject.wear_percent <= wear_max)
    if year_min is not None:
        query = query.filter(HydroObject.commission_year >= year_min)
    if year_max is not None:
        query = query.filter(HydroObject.commission_year <= year_max)
    return query


@router.get("", response_model=schemas.PaginatedObjects)
def list_objects(
    search: Optional[str] = None,
    status: Optional[str] = Query(None, description="CSV: ok,watch,repair,critical"),
    anchor_key: Optional[str] = Query(None, description="CSV район-якорей"),
    significance: Optional[str] = None,
    wear_min: Optional[float] = None,
    wear_max: Optional[float] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    sort_by: str = "risk_score",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(HydroObject)
    query = _apply_filters(query, search, status, anchor_key, significance, wear_min, wear_max, year_min, year_max)

    total = query.count()

    col = SORTABLE_FIELDS.get(sort_by, HydroObject.risk_score)
    query = query.order_by(col.desc() if sort_dir == "desc" else col.asc())

    page = max(1, page)
    page_size = max(1, min(200, page_size))
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return schemas.PaginatedObjects(total=total, page=page, page_size=page_size, items=items)


@router.get("/map")
def list_objects_for_map(
    search: Optional[str] = None,
    status: Optional[str] = None,
    anchor_key: Optional[str] = None,
    significance: Optional[str] = None,
    wear_min: Optional[float] = None,
    wear_max: Optional[float] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(HydroObject)
    query = _apply_filters(query, search, status, anchor_key, significance, wear_min, wear_max, year_min, year_max)
    items = query.all()
    return [
        {
            "id": o.id,
            "code": o.code,
            "display_name": o.display_name,
            "object_type": o.object_type,
            "status": o.status,
            "risk_score": o.risk_score,
            "district_raw": o.district_raw,
            "anchor_key": o.anchor_key,
            "anchor_name": o.anchor_name,
            "lat": o.lat,
            "lng": o.lng,
            "wear_percent": o.wear_percent,
            "commission_year": o.commission_year,
        }
        for o in items
    ]


@router.get("/{object_id}", response_model=schemas.ObjectDetail)
def get_object(object_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    obj = db.query(HydroObject).get(object_id)
    if not obj:
        raise HTTPException(404, "Объект не найден")
    return obj


@router.post("", response_model=schemas.ObjectDetail)
def create_object(
    payload: schemas.ObjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "inspector")),
):
    risk_score, status = scoring.evaluate(
        payload.commission_year, payload.kpd_design, payload.kpd_actual,
        payload.wear_percent, payload.condition_source,
    )

    last = db.query(HydroObject).order_by(HydroObject.id.desc()).first()
    next_seq = (last.id + 1) if last else 1
    code = f"U-{next_seq:04d}"  # U = пользовательский объект (вручную добавлен)

    if payload.lat is not None and payload.lng is not None:
        lat, lng, anchor_key, anchor_name = payload.lat, payload.lng, "manual", "Указано вручную"
        coords_approx = False
    else:
        lat, lng, anchor_key, anchor_name = geo.generate_coordinates(code)
        coords_approx = True

    today = date.today()
    interval_months = STATUS_META[status]["inspection_months"]

    obj = HydroObject(
        code=code,
        display_name=payload.display_name,
        object_type=payload.object_type,
        district_raw=payload.district_raw,
        water_source=payload.water_source,
        commission_year=payload.commission_year,
        capacity_m3s=payload.capacity_m3s,
        length_before_km=payload.length_before_km,
        area_ha=payload.area_ha,
        kpd_design=payload.kpd_design,
        kpd_actual=payload.kpd_actual,
        wear_percent=payload.wear_percent,
        condition_source=payload.condition_source,
        significance=payload.significance,
        risk_score=risk_score,
        status=status,
        needs_reconstruction=True,
        lat=lat,
        lng=lng,
        anchor_key=anchor_key,
        anchor_name=anchor_name,
        coords_approximate=coords_approx,
        last_inspection_date=today,
        next_inspection_date=today,
        description=payload.description,
        photo_url=payload.photo_url,
        is_user_created=True,
    )
    db.add(obj)
    db.flush()
    db.add(StatusHistory(
        object_id=obj.id, status=status, risk_score=risk_score,
        note="Объект создан пользователем", changed_by_username=user.username,
    ))
    db.commit()
    db.refresh(obj)
    log_action(db, user.username, "object.create", "object", obj.id, f"code={obj.code}")
    return obj


@router.put("/{object_id}", response_model=schemas.ObjectDetail)
def update_object(
    object_id: int,
    payload: schemas.ObjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin", "inspector")),
):
    obj = db.query(HydroObject).get(object_id)
    if not obj:
        raise HTTPException(404, "Объект не найден")

    data = payload.model_dump(exclude_unset=True, exclude={"note"})
    for field, value in data.items():
        setattr(obj, field, value)

    risk_score, status = scoring.evaluate(
        obj.commission_year, obj.kpd_design, obj.kpd_actual, obj.wear_percent, obj.condition_source,
    )
    status_changed = status != obj.status
    obj.risk_score = risk_score
    obj.status = status
    obj.updated_at = datetime.utcnow()

    if status_changed or payload.note:
        db.add(StatusHistory(
            object_id=obj.id, status=status, risk_score=risk_score,
            note=payload.note or ("Статус пересчитан после изменения данных" if status_changed else None),
            changed_by_username=user.username,
        ))

    db.commit()
    db.refresh(obj)
    log_action(db, user.username, "object.update", "object", obj.id, str(data))
    return obj


@router.delete("/{object_id}")
def delete_object(
    object_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    obj = db.query(HydroObject).get(object_id)
    if not obj:
        raise HTTPException(404, "Объект не найден")
    code = obj.code
    db.delete(obj)
    db.commit()
    log_action(db, user.username, "object.delete", "object", object_id, f"code={code}")
    return {"ok": True}
