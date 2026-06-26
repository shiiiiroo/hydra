"""
Импорт реального датасета РГП "Казводхоз" (датасет.xls, лист "каналы")
в базу HydroMonitor с расчётом риск-скора, статуса, координат и
синтетических дат осмотра.

Запуск:
    python -m app.data_import

Идемпотентен: пересоздаёт таблицы и грузит данные с нуля. Безопасно
гонять повторно во время разработки/демо.
"""
from __future__ import annotations

import hashlib
import os
from datetime import date, timedelta

import pandas as pd

from app.database import Base, engine, SessionLocal
from app.models import HydroObject, StatusHistory
from app import scoring, geo
from app.config import STATUS_META

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "data", "dataset.xls")

# Индексы столбцов на листе "каналы" (см. RESEARCH в репозитории/чат) ---
COL_NUM = 0
COL_YEAR = 1
COL_WATER_SOURCE = 2
COL_CAPACITY = 3
COL_LEN_BEFORE_TOTAL = 4
COL_LEN_BEFORE_EARTH = 5
COL_LEN_BEFORE_LINED = 6
COL_ACT = 7
COL_LEN_AFTER_TOTAL = 8
COL_AREA = 11
COL_KPD_DESIGN = 14
COL_KPD_ACTUAL = 15
COL_DISTRICT = 16
COL_OKRUG = 17
COL_WEAR = 18
COL_CONDITION = 19
COL_CADASTRE = 20
COL_GOSAKT = 21

DATA_START_ROW = 7  # 0-indexed; первые 7 строк -- заголовки/шапка таблицы


def _num(v):
    try:
        f = float(v)
        if pd.isna(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def _int(v):
    n = _num(v)
    return int(n) if n is not None else None


def _str(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


def _seeded_days(seed: str, lo: int, hi: int) -> int:
    h = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    frac = int(h[12:20], 16) / 0xFFFFFFFF
    return lo + int(frac * (hi - lo))


def _significance(capacity, area):
    if (capacity is not None and capacity >= 5) or (area is not None and area >= 1500):
        return "high"
    if (capacity is not None and capacity < 0.3) and (area is None or area < 100):
        return "low"
    return "medium"


INSPECTION_RANGES = {
    "ok": (30, 300),
    "watch": (60, 300),
    "repair": (90, 400),
    "critical": (150, 500),
}


def parse_dataset() -> list[dict]:
    raw = pd.read_excel(DATASET_PATH, engine="xlrd", sheet_name="каналы", header=None)
    rows = raw.iloc[DATA_START_ROW:]

    records = []
    group_no = 1
    today = date.today()

    for _, row in rows.iterrows():
        num_raw = row[COL_NUM]
        district = _str(row[COL_DISTRICT])

        # Не запись объекта: либо заголовок группы ("Группа объектов N"),
        # либо строка-подытог (нет района => агрегирующая строка).
        if isinstance(num_raw, str) and "Группа объектов" in num_raw:
            group_no += 1
            continue
        if district is None:
            continue
        try:
            number_in_group = int(num_raw)
        except (TypeError, ValueError):
            continue

        commission_year = _int(row[COL_YEAR])
        capacity = _num(row[COL_CAPACITY])
        len_before_total = _num(row[COL_LEN_BEFORE_TOTAL])
        len_before_earth = _num(row[COL_LEN_BEFORE_EARTH])
        len_before_lined = _num(row[COL_LEN_BEFORE_LINED])
        len_after_total = _num(row[COL_LEN_AFTER_TOTAL])
        area = _num(row[COL_AREA])
        kpd_design = _num(row[COL_KPD_DESIGN])
        kpd_actual = _num(row[COL_KPD_ACTUAL])
        okrug = _str(row[COL_OKRUG])
        wear_raw = _num(row[COL_WEAR])
        # ВАЖНО: в исходном файле столбец "Процент износа" хранится как доля
        # (ячейка отформатирована как "0%" в Excel), т.е. 0.3 означает 30%,
        # не 0.3%. Проверено через xlrd с formatting_info=True на исходном
        # файле. Без этого умножения почти все объекты получали бы
        # неправдоподобно низкий износ (~0.3% для каналов 1930-х годов).
        wear = round(min(wear_raw * 100, 100), 1) if wear_raw is not None else None
        condition = _str(row[COL_CONDITION]) or "удов."
        cadastre = _str(row[COL_CADASTRE])
        gosakt = _str(row[COL_GOSAKT])

        code = f"K-{group_no}-{number_in_group:03d}"
        risk_score, status = scoring.evaluate(
            commission_year, kpd_design, kpd_actual, wear, condition, today
        )
        lat, lng, anchor_key, anchor_name = geo.generate_coordinates(code)

        days_ago = _seeded_days(code, *INSPECTION_RANGES[status])
        last_inspection = today - timedelta(days=days_ago)
        interval_months = STATUS_META[status]["inspection_months"]
        next_inspection = last_inspection + timedelta(days=30 * interval_months)

        records.append(dict(
            group_no=group_no,
            number_in_group=number_in_group,
            code=code,
            display_name=f"Канал № {number_in_group} (группа {group_no})",
            object_type="channel",
            water_source=_str(row[COL_WATER_SOURCE]),
            commission_year=commission_year,
            capacity_m3s=capacity,
            length_before_km=len_before_total,
            length_before_earth_km=len_before_earth,
            length_before_lined_km=len_before_lined,
            length_after_km=len_after_total,
            area_ha=area,
            kpd_design=kpd_design,
            kpd_actual=kpd_actual,
            district_raw=district,
            rural_okrug_raw=okrug,
            wear_percent=wear,
            condition_source=condition,
            cadastre_number=cadastre,
            gosakt_number=gosakt,
            significance=_significance(capacity, area),
            risk_score=risk_score,
            status=status,
            needs_reconstruction=len_after_total is None,
            lat=lat,
            lng=lng,
            anchor_key=anchor_key,
            anchor_name=anchor_name,
            coords_approximate=True,
            last_inspection_date=last_inspection,
            next_inspection_date=next_inspection,
            is_user_created=False,
        ))

    return records


def run_import():
    print(f"Чтение датасета: {DATASET_PATH}")
    records = parse_dataset()
    print(f"Распознано объектов: {len(records)}")

    # Создаём схему, если её ещё нет (первый запуск).
    Base.metadata.create_all(bind=engine)

    # Намеренно НЕ трогаем таблицы users/audit_log при повторном импорте —
    # drop_all() по всей базе удалил бы все учётные записи. Очищаем только
    # объекты и их историю статусов.
    StatusHistory.__table__.drop(bind=engine, checkfirst=True)
    HydroObject.__table__.drop(bind=engine, checkfirst=True)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for rec in records:
            obj = HydroObject(**rec)
            db.add(obj)
            db.flush()
            db.add(StatusHistory(
                object_id=obj.id,
                status=obj.status,
                risk_score=obj.risk_score,
                note="Импорт из датасет.xls и расчёт риск-скора",
            ))
        db.commit()
        print(f"Загружено в базу: {len(records)} объектов")
    finally:
        db.close()


if __name__ == "__main__":
    run_import()
