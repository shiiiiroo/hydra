from __future__ import annotations

from datetime import date, datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class StatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    risk_score: Optional[float] = None
    note: Optional[str] = None
    changed_at: datetime


class ObjectListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    display_name: str
    object_type: str
    district_raw: Optional[str] = None
    anchor_name: Optional[str] = None
    water_source: Optional[str] = None
    commission_year: Optional[int] = None
    wear_percent: Optional[float] = None
    condition_source: Optional[str] = None
    risk_score: float
    status: str
    significance: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class ObjectDetail(ObjectListItem):
    group_no: Optional[int] = None
    number_in_group: Optional[int] = None
    capacity_m3s: Optional[float] = None
    length_before_km: Optional[float] = None
    length_before_earth_km: Optional[float] = None
    length_before_lined_km: Optional[float] = None
    length_after_km: Optional[float] = None
    area_ha: Optional[float] = None
    kpd_design: Optional[float] = None
    kpd_actual: Optional[float] = None
    rural_okrug_raw: Optional[str] = None
    cadastre_number: Optional[str] = None
    gosakt_number: Optional[str] = None
    needs_reconstruction: bool
    coords_approximate: bool
    last_inspection_date: Optional[date] = None
    next_inspection_date: Optional[date] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    is_user_created: bool
    created_at: datetime
    updated_at: datetime
    history: List[StatusHistoryOut] = []


class ObjectCreate(BaseModel):
    display_name: str
    object_type: str = "channel"
    district_raw: Optional[str] = None
    water_source: Optional[str] = None
    commission_year: Optional[int] = None
    capacity_m3s: Optional[float] = None
    length_before_km: Optional[float] = None
    area_ha: Optional[float] = None
    kpd_design: Optional[float] = None
    kpd_actual: Optional[float] = None
    wear_percent: Optional[float] = None
    condition_source: Optional[str] = "удов."
    significance: str = "medium"
    lat: Optional[float] = None
    lng: Optional[float] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None


class ObjectUpdate(BaseModel):
    display_name: Optional[str] = None
    district_raw: Optional[str] = None
    water_source: Optional[str] = None
    commission_year: Optional[int] = None
    capacity_m3s: Optional[float] = None
    length_before_km: Optional[float] = None
    area_ha: Optional[float] = None
    kpd_design: Optional[float] = None
    kpd_actual: Optional[float] = None
    wear_percent: Optional[float] = None
    condition_source: Optional[str] = None
    significance: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    note: Optional[str] = None  # комментарий, попадёт в историю изменений


class PaginatedObjects(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ObjectListItem]


class DashboardStats(BaseModel):
    total: int
    ok: int
    watch: int
    repair: int
    critical: int
    avg_wear: Optional[float] = None
    districts_count: int
    last_updated_objects: List[ObjectListItem]


class StatusCount(BaseModel):
    status: str
    label: str
    count: int
    color: str


class DistrictCount(BaseModel):
    anchor_key: str
    anchor_name: str
    count: int
    critical_count: int


class YearBucket(BaseModel):
    decade: int
    count: int


class TopRisky(BaseModel):
    id: int
    code: str
    display_name: str
    risk_score: float
    status: str
    wear_percent: Optional[float] = None


class AnalyticsOverview(BaseModel):
    by_status: List[StatusCount]
    by_district: List[DistrictCount]
    by_decade: List[YearBucket]
    top_risky: List[TopRisky]
    avg_kpd_design: Optional[float] = None
    avg_kpd_actual: Optional[float] = None
    reconstruction_needed_share: float
    total_length_km: Optional[float] = None


class CategoryTypeInfo(BaseModel):
    object_type: str
    label: str
    count: int


class CategoryStatusInfo(BaseModel):
    status: str
    label: str
    color: str
    criteria: str
    inspection_months: int
    count: int


class CategorySignificanceInfo(BaseModel):
    significance: str
    label: str
    description: str
    count: int


class CategoriesOut(BaseModel):
    types: List[CategoryTypeInfo]
    statuses: List[CategoryStatusInfo]
    significance: List[CategorySignificanceInfo]


# --------------------------------------------------------------------------
# Auth / Users
# --------------------------------------------------------------------------

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    username: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None


class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "viewer"  # admin | inspector | viewer


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_username: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime
