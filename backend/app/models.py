from __future__ import annotations

from datetime import datetime, date

from sqlalchemy import (
    Column, Integer, Float, String, Text, Date, DateTime, ForeignKey, Boolean
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    """
    Учётные записи. Роли:
      - admin      — полный доступ, включая управление пользователями
      - inspector  — может создавать/редактировать объекты (полевой инспектор)
      - viewer     — только чтение (дашборд, карта, отчёты)
    Пароли хранятся только как bcrypt-хэш (см. app/security.py).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="viewer", nullable=False)  # admin | inspector | viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


class AuditLog(Base):
    """
    Сквозной журнал действий — кто, что и когда изменил. Отдельно от
    StatusHistory (которая чисто про изменение статуса объекта): сюда
    попадают создание/удаление объектов, изменения пользователей, входы и т.д.
    """
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    actor_username = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False)       # e.g. "object.create", "user.role_change", "auth.login"
    target_type = Column(String, nullable=True)    # e.g. "object", "user"
    target_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class HydroObject(Base):
    __tablename__ = "objects"

    id = Column(Integer, primary_key=True, index=True)

    # Тип сооружения. Текущий датасет содержит только каналы, но поле
    # сделано открытым, чтобы при появлении других данных (плотины,
    # гидропосты, шлюзы и т.д.) не требовалась миграция схемы.
    object_type = Column(String, default="channel", index=True)

    group_no = Column(Integer, nullable=True)          # "Группа объектов" в исходном файле
    number_in_group = Column(Integer, nullable=True)   # исходный "№" внутри группы
    code = Column(String, unique=True, index=True)      # стабильный человекочитаемый код, напр. "К-1-001"
    display_name = Column(String)                         # напр. "Канал № 1 (группа 1)"

    water_source = Column(String, nullable=True)
    commission_year = Column(Integer, nullable=True)

    capacity_m3s = Column(Float, nullable=True)

    length_before_km = Column(Float, nullable=True)
    length_before_earth_km = Column(Float, nullable=True)
    length_before_lined_km = Column(Float, nullable=True)
    length_after_km = Column(Float, nullable=True)

    area_ha = Column(Float, nullable=True)

    kpd_design = Column(Float, nullable=True)
    kpd_actual = Column(Float, nullable=True)

    district_raw = Column(String, nullable=True)        # "Район N" (обезличено в источнике)
    rural_okrug_raw = Column(String, nullable=True)

    wear_percent = Column(Float, nullable=True)
    condition_source = Column(String, nullable=True)    # "удов." / "не удов." из датасета

    cadastre_number = Column(String, nullable=True)
    gosakt_number = Column(String, nullable=True)

    significance = Column(String, default="medium")     # high / medium / low

    risk_score = Column(Float, default=0)
    status = Column(String, default="ok", index=True)    # ok / watch / repair / critical

    needs_reconstruction = Column(Boolean, default=True)

    # Синтетические (демо) данные — в источнике их нет:
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    anchor_key = Column(String, nullable=True)
    anchor_name = Column(String, nullable=True)
    coords_approximate = Column(Boolean, default=True)

    last_inspection_date = Column(Date, nullable=True)
    next_inspection_date = Column(Date, nullable=True)

    description = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    is_user_created = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    history = relationship(
        "StatusHistory", back_populates="hydro_object",
        cascade="all, delete-orphan", order_by="desc(StatusHistory.changed_at)"
    )


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    object_id = Column(Integer, ForeignKey("objects.id"), index=True)
    status = Column(String)
    risk_score = Column(Float, nullable=True)
    note = Column(String, nullable=True)
    changed_by_username = Column(String, nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow)

    hydro_object = relationship("HydroObject", back_populates="history")
