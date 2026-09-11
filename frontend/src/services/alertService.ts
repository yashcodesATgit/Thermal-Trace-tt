import type { Alert } from '../types/alert';
import api from './api';

export interface AlertsQueryResult {
  alerts: Alert[];
  total: number;
  unackCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch structured alert data from Express backend including authoritative counts.
 * Phase 4: calls GET /api/v1/alerts
 */
export async function fetchAlertsData(date?: string, page: number = 1, pageSize: number = 20): Promise<AlertsQueryResult> {
  const response = await api.get('/api/v1/alerts', {
    params: { page, page_size: pageSize, date_str: date },
  });
  const data = response.data;
  const alertItems: Alert[] = (data.data || []).map((row: any) => ({
    id: row.id,
    hotspotId: row.hotspotId || row.hotspot_id,
    facilityId: row.facilityId || row.facility_id,
    severity: row.severity,
    title: row.title,
    message: row.message,
    timestamp: row.timestamp,
    acknowledged: row.acknowledged
  }));

  const pagination = data.pagination || {};
  const total = typeof pagination.total === 'number' ? pagination.total : alertItems.length;
  const unackCount = typeof pagination.unacknowledged_total === 'number'
    ? pagination.unacknowledged_total
    : alertItems.filter((a) => !a.acknowledged).length;

  return {
    alerts: alertItems,
    total,
    unackCount,
    page: pagination.page || page,
    pageSize: pagination.page_size || pageSize,
    totalPages: pagination.total_pages || Math.ceil(total / (pagination.page_size || pageSize || 1))
  };
}

export async function fetchAlerts(date?: string): Promise<Alert[]> {
  const result = await fetchAlertsData(date, 1, 20);
  return result.alerts;
}
