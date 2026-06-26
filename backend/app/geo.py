"""
Генерация приближённых координат объектов.

В исходном датасете координат нет (см. app/config.py). Чтобы карта была
полезной визуализацией, а не пустым местом, каждому объекту детерминированно
(по его id) назначается опорная точка района + воспроизводимое случайное
смещение. Детерминированность важна: повторный импорт данных даёт те же
координаты, объект не "прыгает" по карте между запусками.
"""
from __future__ import annotations

import hashlib
import math
from typing import Tuple

from app.config import DISTRICT_ANCHORS, JITTER_DEG, BBOX


def _seeded_unit(seed: str) -> float:
    """Детерминированное псевдослучайное число в [0, 1) на основе строки seed."""
    h = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return int(h[:12], 16) / 0xFFFFFFFFFFFF


def pick_anchor(object_key: str) -> dict:
    idx = int(_seeded_unit(f"anchor:{object_key}") * len(DISTRICT_ANCHORS))
    idx = min(idx, len(DISTRICT_ANCHORS) - 1)
    return DISTRICT_ANCHORS[idx]


def generate_coordinates(object_key: str) -> Tuple[float, float, str, str]:
    """Возвращает (lat, lng, anchor_key, anchor_name)."""
    anchor = pick_anchor(object_key)
    angle = _seeded_unit(f"angle:{object_key}") * 2 * math.pi
    radius = _seeded_unit(f"radius:{object_key}") * JITTER_DEG
    lat = anchor["lat"] + radius * math.cos(angle)
    lng = anchor["lng"] + radius * math.sin(angle) * 1.3  # лёгкая коррекция на сжатие по долготе
    lat = max(BBOX["min_lat"], min(BBOX["max_lat"], lat))
    lng = max(BBOX["min_lng"], min(BBOX["max_lng"], lng))
    return round(lat, 5), round(lng, 5), anchor["key"], anchor["name"]
