/**
 * @hopegestion/api-client — Dashboard API
 * Compatible web + mobile
 */
import { apiCall } from './core';

export interface DashboardKPIs {
  total_biens: number;
  total_locataires: number;
  total_locations_actives: number;
  loyers_encaisses_mois: number;
  loyers_en_retard: number;
  taux_occupation: number;
  tickets_ouverts: number;
  revenus_mois: number;
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  return apiCall<DashboardKPIs>('/dashboard/kpis');
}

export interface AlertItem {
  id: number;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  created_at: string;
}

export async function getAlerts(unreadOnly = false): Promise<AlertItem[]> {
  const query = unreadOnly ? '?unread=true' : '';
  const data = await apiCall<{ alerts: AlertItem[] }>(`/alertes${query}`);
  return data.alerts || [];
}

export async function markAlertRead(id: number): Promise<void> {
  return apiCall<void>(`/alertes/${id}/read`, { method: 'POST' });
}

export async function markAllAlertsRead(): Promise<void> {
  return apiCall<void>('/alertes/read-all', { method: 'POST' });
}
