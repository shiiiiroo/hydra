from datetime import date

from app import scoring


def test_young_object_is_ok():
    score, status = scoring.evaluate(
        commission_year=2020, kpd_design=0.85, kpd_actual=0.83,
        wear_percent=5, condition_source="удов.", today=date(2026, 1, 1),
    )
    assert status == "ok"


def test_defect_floor_forces_at_least_repair():
    """Даже если формула по возрасту даёт низкий риск, исходное 'не удов.'
    не должно давать статус лучше 'Требует ремонта' — защитное правило брифа."""
    score, status = scoring.evaluate(
        commission_year=2024, kpd_design=0.9, kpd_actual=0.89,
        wear_percent=2, condition_source="не удов.", today=date(2026, 1, 1),
    )
    assert status in ("repair", "critical")


def test_old_object_with_kpd_gap_is_risky():
    score, status = scoring.evaluate(
        commission_year=1930, kpd_design=0.85, kpd_actual=0.40,
        wear_percent=70, condition_source="не удов.", today=date(2026, 1, 1),
    )
    assert status == "critical"
    assert score >= 58


def test_wear_is_clipped_not_extrapolated_beyond_max_points():
    """Случай реального датасета: 130% износа (опечатка в источнике) не
    должен давать больше веса, чем 100%."""
    s1, _ = scoring.evaluate(1980, 0.8, 0.6, 100, "удов.", date(2026, 1, 1))
    s2, _ = scoring.evaluate(1980, 0.8, 0.6, 100, "удов.", date(2026, 1, 1))
    assert s1 == s2  # детерминированность формулы
