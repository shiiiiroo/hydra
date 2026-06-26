export type Role = 'admin' | 'inspector' | 'viewer';
export type Status = 'ok' | 'watch' | 'repair' | 'critical';
export type Significance = 'high' | 'medium' | 'low';

export interface User {
  id: number;
  username: string;
  email?: string | null;
  full_name?: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export interface StatusHistoryItem {
  id: number;
  status: Status;
  risk_score?: number | null;
  note?: string | null;
  changed_at: string;
}

export interface HydroObjectListItem {
  id: number;
  code: string;
  display_name: string;
  object_type: string;
  district_raw?: string | null;
  anchor_name?: string | null;
  water_source?: string | null;
  commission_year?: number | null;
  wear_percent?: number | null;
  condition_source?: string | null;
  risk_score: number;
  status: Status;
  significance: Significance;
  lat?: number | null;
  lng?: number | null;
}

export interface HydroObjectDetail extends HydroObjectListItem {
  group_no?: number | null;
  number_in_group?: number | null;
  capacity_m3s?: number | null;
  length_before_km?: number | null;
  length_before_earth_km?: number | null;
  length_before_lined_km?: number | null;
  length_after_km?: number | null;
  area_ha?: number | null;
  kpd_design?: number | null;
  kpd_actual?: number | null;
  rural_okrug_raw?: string | null;
  cadastre_number?: string | null;
  gosakt_number?: string | null;
  needs_reconstruction: boolean;
  coords_approximate: boolean;
  last_inspection_date?: string | null;
  next_inspection_date?: string | null;
  description?: string | null;
  photo_url?: string | null;
  is_user_created: boolean;
  created_at: string;
  updated_at: string;
  history: StatusHistoryItem[];
}

export interface MapPoint {
  id: number;
  code: string;
  display_name: string;
  object_type: string;
  status: Status;
  risk_score: number;
  district_raw?: string | null;
  anchor_key?: string | null;
  anchor_name?: string | null;
  lat: number;
  lng: number;
  wear_percent?: number | null;
  commission_year?: number | null;
}

export interface PaginatedObjects {
  total: number;
  page: number;
  page_size: number;
  items: HydroObjectListItem[];
}

export interface DashboardStats {
  total: number;
  ok: number;
  watch: number;
  repair: number;
  critical: number;
  avg_wear?: number | null;
  districts_count: number;
  last_updated_objects: HydroObjectListItem[];
}

export interface StatusCount { status: Status; label: string; count: number; color: string; }
export interface DistrictCount { anchor_key: string; anchor_name: string; count: number; critical_count: number; }
export interface YearBucket { decade: number; count: number; }
export interface TopRisky { id: number; code: string; display_name: string; risk_score: number; status: Status; wear_percent?: number | null; }

export interface AnalyticsOverview {
  by_status: StatusCount[];
  by_district: DistrictCount[];
  by_decade: YearBucket[];
  top_risky: TopRisky[];
  avg_kpd_design?: number | null;
  avg_kpd_actual?: number | null;
  reconstruction_needed_share: number;
  total_length_km?: number | null;
}

export interface CategoryTypeInfo { object_type: string; label: string; count: number; }
export interface CategoryStatusInfo { status: Status; label: string; color: string; criteria: string; inspection_months: number; count: number; }
export interface CategorySignificanceInfo { significance: Significance; label: string; description: string; count: number; }
export interface CategoriesOut {
  types: CategoryTypeInfo[];
  statuses: CategoryStatusInfo[];
  significance: CategorySignificanceInfo[];
}

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  formats: string[];
  needs_district: boolean;
}

export interface AuditLogItem {
  id: number;
  actor_username?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: string | null;
  created_at: string;
}
