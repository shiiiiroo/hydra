"""
Rule-based риск-скоринг гидротехнических объектов.

Никакого ML — чистая объяснимая формула из конфигурации (app/config.py),
как и требует бриф хакатона. Каждая функция здесь специально маленькая
и именованная, чтобы на защите можно было построчно объяснить жюри
"откуда взялась цифра".
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from app.config import SCORE_WEIGHTS, STATUS_THRESHOLDS, DEFECT_FLOOR_STATUS, STATUS_ORDER


def _clip(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def age_score(commission_year: Optional[int], today: Optional[date] = None) -> float:
    """Вклад возраста объекта. Чем старше — тем выше риск (линейно, с насыщением)."""
    today = today or date.today()
    w = SCORE_WEIGHTS
    if commission_year is None:
        age = w["age_floor_years"] + w["age_span_years"] * 0.45  # медианная заглушка
    else:
        age = today.year - commission_year
    fraction = _clip((age - w["age_floor_years"]) / w["age_span_years"])
    return fraction * w["age_max_points"]


def kpd_gap_score(kpd_design: Optional[float], kpd_actual: Optional[float]) -> float:
    """Вклад разрыва КПД проектного и фактического (деградация эффективности)."""
    w = SCORE_WEIGHTS
    if kpd_design is None or kpd_actual is None:
        gap = w["kpd_gap_span"] * 0.3  # медианная заглушка при отсутствии данных
    else:
        gap = max(0.0, kpd_design - kpd_actual)
    fraction = _clip(gap / w["kpd_gap_span"])
    return fraction * w["kpd_gap_max_points"]


def wear_score(wear_percent: Optional[float]) -> float:
    """Вклад процента износа из датасета (заполнен лишь для части записей)."""
    w = SCORE_WEIGHTS
    if wear_percent is None:
        return 0.0
    fraction = _clip(wear_percent / w["wear_span_percent"])
    return fraction * w["wear_max_points"]


def defect_score(condition_source: Optional[str]) -> float:
    """Бинарный флаг 'зафиксирован дефект' = исходное состояние 'не удов.'."""
    w = SCORE_WEIGHTS
    if condition_source and "не удов" in condition_source.lower():
        return w["defect_points"]
    return 0.0


def compute_risk_score(
    commission_year: Optional[int],
    kpd_design: Optional[float],
    kpd_actual: Optional[float],
    wear_percent: Optional[float],
    condition_source: Optional[str],
    today: Optional[date] = None,
) -> float:
    total = (
        age_score(commission_year, today)
        + kpd_gap_score(kpd_design, kpd_actual)
        + wear_score(wear_percent)
        + defect_score(condition_source)
    )
    return round(min(100.0, total), 1)


def score_to_status(score: float) -> str:
    t = STATUS_THRESHOLDS
    if score < t["ok_max"]:
        return "ok"
    if score < t["watch_max"]:
        return "watch"
    if score < t["repair_max"]:
        return "repair"
    return "critical"


def apply_defect_floor(status: str, condition_source: Optional[str]) -> str:
    """Если зафиксирован дефект ('не удов.'), статус не может быть лучше DEFECT_FLOOR_STATUS."""
    if not condition_source or "не удов" not in condition_source.lower():
        return status
    floor_idx = STATUS_ORDER.index(DEFECT_FLOOR_STATUS)
    cur_idx = STATUS_ORDER.index(status)
    return status if cur_idx >= floor_idx else DEFECT_FLOOR_STATUS


def evaluate(
    commission_year: Optional[int],
    kpd_design: Optional[float],
    kpd_actual: Optional[float],
    wear_percent: Optional[float],
    condition_source: Optional[str],
    today: Optional[date] = None,
) -> tuple[float, str]:
    """Возвращает (risk_score, status) — единая точка входа для импорта и API создания/правки объекта."""
    score = compute_risk_score(commission_year, kpd_design, kpd_actual, wear_percent, condition_source, today)
    status = score_to_status(score)
    status = apply_defect_floor(status, condition_source)
    return score, status
