import { API_BASE } from './constants';
import * as types from '../types';

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {};
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options?.signal || controller.signal,
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Backend request timed out after 6 seconds. Please check that FastAPI is running on port 8000.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  getOverviewMetrics: (week?: number) => 
    fetchAPI<types.OverviewMetrics>(`/api/metrics/overview${week ? `?week=${week}` : ''}`),
    
  getWeeklyTrends: () => 
    fetchAPI<types.WeeklyTrend[]>('/api/metrics/weekly'),
    
  getRoads: (week?: number) => 
    fetchAPI<types.RoadSegment[]>(`/api/roads${week ? `?week=${week}` : ''}`),
    
  getRoadDetail: (segmentId: string) => 
    fetchAPI<types.RoadSegment>(`/api/roads/${segmentId}`),
    
  getMapData: (week?: number) => 
    fetchAPI<{ type: string; features: types.MapFeature[] }>(`/api/map${week ? `?week=${week}` : ''}`),
  
  getJobs: () => 
    fetchAPI<types.ProcessingJob[]>('/api/jobs'),
    
  uploadVideo: (formData: FormData) => 
    fetchAPI<{ job_id: string; message: string }>('/api/upload', {
      method: 'POST',
      body: formData,
    }),
  
  getAuthorityIssues: (status?: string, authorityId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (authorityId) params.append('authority_id', authorityId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<types.IssueReport[]>(`/api/authority/issues${qs}`);
  },
  
  getAuthoritySummary: () => 
    fetchAPI<{
      by_status: Record<string, number>;
      by_authority: Array<{
        authority_id: string;
        name: string;
        zone: string;
        total_issues: number;
        open_issues: number;
        verified_repairs: number;
        overdue_issues: number;
        avg_response_days: number;
      }>;
      total_reports: number;
      overdue_count: number;
      verified_count: number;
    }>('/api/authority/summary'),
    
  updateIssueStatus: (issueId: string, status: string, notes?: string) => 
    fetchAPI<types.IssueReport>(`/api/authority/issues/${issueId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    }),
    
  loadDemoData: () => 
    fetchAPI<{ success: boolean; message: string }>('/api/demo/load', { method: 'POST' }),
    
  resetDemoData: () => 
    fetchAPI<{ success: boolean; message: string }>('/api/demo/reset', { method: 'POST' }),
    
  simulateUpload: () => 
    fetchAPI<{ success: boolean; job_id?: string; message: string }>('/api/demo/simulate-upload', { method: 'POST' }),
    
  simulateRepair: (segmentId: string, week: number = 4) => 
    fetchAPI<{ success: boolean; message: string }>(`/api/demo/simulate-repair`, {
      method: 'POST',
      body: JSON.stringify({ segment_id: segmentId, week }),
    }),
    
  triggerVerification: (issueId: string) => 
    fetchAPI<{ success: boolean; result?: string; message: string }>(`/api/demo/simulate-verification`, {
      method: 'POST',
      body: JSON.stringify({ issue_id: issueId }),
    }),
    
  simulateReport: (segmentId: string) => 
    fetchAPI<{ success: boolean; message: string }>('/api/demo/simulate-report', {
      method: 'POST',
      body: JSON.stringify({ segment_id: segmentId }),
    }),
    
  simulateAcknowledge: (issueId: string) => 
    fetchAPI<{ success: boolean; message: string }>('/api/demo/simulate-acknowledge', {
      method: 'POST',
      body: JSON.stringify({ issue_id: issueId }),
    }),
    
  generateWeeklyReport: (week: number = 4) => 
    fetchAPI<{ success: boolean; url: string; filename: string; download_url: string }>(`/api/reports/generate?week=${week}`, {
      method: 'POST',
    }),
    
  getPDFReportUrl: (week: number = 4) => 
    `${API_BASE}/api/reports/weekly?week=${week}`,
    
  getCSVExportUrl: (type: string, week?: number) => 
    `${API_BASE}/api/exports/csv?type=${type}${week ? `&week=${week}` : ''}`,
};
