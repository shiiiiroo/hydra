import { api, tokenStore } from './client';
import type {
  AnalyticsOverview, AuditLogItem, CategoriesOut, DashboardStats, HydroObjectDetail,
  MapPoint, PaginatedObjects, ReportDefinition, User,
} from '../types';

// --------------------------------------------------------------------------
// Auth
// --------------------------------------------------------------------------
export async function login(username: string, password: string) {
  const form = new URLSearchParams();
  form.set('username', username);
  form.set('password', password);
  const { data } = await api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  tokenStore.set(data.access_token, data.refresh_token);
  return data as { access_token: string; refresh_token: string; role: string; username: string };
}

export function logout() {
  tokenStore.clear();
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function changePassword(current_password: string, new_password: string) {
  await api.post('/auth/change-password', { current_password, new_password });
}

export async function listUsers(): Promise<User[]> {
  const { data } = await api.get('/auth/users');
  return data;
}

export async function createUser(payload: { username: string; password: string; role: string; full_name?: string; email?: string }): Promise<User> {
  const { data } = await api.post('/auth/users', payload);
  return data;
}

export async function updateUser(id: number, payload: Partial<{ role: string; is_active: boolean; full_name: string; email: string }>): Promise<User> {
  const { data } = await api.put(`/auth/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: number) {
  await api.delete(`/auth/users/${id}`);
}

export async function fetchAuditLog(): Promise<AuditLogItem[]> {
  const { data } = await api.get('/auth/audit-log');
  return data;
}

// --------------------------------------------------------------------------
// Objects
// --------------------------------------------------------------------------
export interface ObjectFilters {
  search?: string;
  status?: string;
  anchor_key?: string;
  significance?: string;
  wear_min?: number;
  wear_max?: number;
  year_min?: number;
  year_max?: number;
  sort_by?: string;
  sort_dir?: string;
  page?: number;
  page_size?: number;
}

export async function fetchObjects(filters: ObjectFilters): Promise<PaginatedObjects> {
  const { data } = await api.get('/objects', { params: filters });
  return data;
}

export async function fetchMapPoints(filters: Omit<ObjectFilters, 'page' | 'page_size' | 'sort_by' | 'sort_dir'>): Promise<MapPoint[]> {
  const { data } = await api.get('/objects/map', { params: filters });
  return data;
}

export async function fetchObject(id: number): Promise<HydroObjectDetail> {
  const { data } = await api.get(`/objects/${id}`);
  return data;
}

export async function createObject(payload: Record<string, unknown>): Promise<HydroObjectDetail> {
  const { data } = await api.post('/objects', payload);
  return data;
}

export async function updateObject(id: number, payload: Record<string, unknown>): Promise<HydroObjectDetail> {
  const { data } = await api.put(`/objects/${id}`, payload);
  return data;
}

export async function deleteObject(id: number) {
  await api.delete(`/objects/${id}`);
}

// --------------------------------------------------------------------------
// Stats / Categories / Reports
// --------------------------------------------------------------------------
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get('/stats/dashboard');
  return data;
}

export async function fetchAnalytics(): Promise<AnalyticsOverview> {
  const { data } = await api.get('/stats/analytics');
  return data;
}

export async function fetchCategories(): Promise<CategoriesOut> {
  const { data } = await api.get('/categories');
  return data;
}

export async function fetchReportDefinitions(): Promise<ReportDefinition[]> {
  const { data } = await api.get('/reports');
  return data;
}

export async function downloadReport(reportId: string, format: 'pdf' | 'csv', anchorKey?: string) {
  const { data, headers } = await api.get(`/reports/${reportId}/download`, {
    params: { format, anchor_key: anchorKey },
    responseType: 'blob',
  });
  triggerDownload(data, extractFilename(headers['content-disposition']) || `${reportId}.${format}`);
}

export async function downloadPassport(objectId: number, code: string) {
  const { data, headers } = await api.get(`/reports/objects/${objectId}/passport`, { responseType: 'blob' });
  triggerDownload(data, extractFilename(headers['content-disposition']) || `passport_${code}.pdf`);
}

function extractFilename(contentDisposition?: string): string | null {
  if (!contentDisposition) return null;
  const match = /filename="?([^"]+)"?/.exec(contentDisposition);
  return match ? match[1] : null;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --------------------------------------------------------------------------
// AI agent
// --------------------------------------------------------------------------
export async function askAI(question: string): Promise<{ answer: string; used_tools: string[]; provider: string }> {
  const { data } = await api.post('/ai/ask', { question });
  return data;
}

export async function aiStatus(): Promise<{ enabled: boolean; provider: string; active_provider: string }> {
  const { data } = await api.get('/ai/status');
  return data;
}
