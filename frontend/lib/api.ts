import { API_BASE } from './constants';
import * as types from '../types';

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export const api = {
  getOverviewMetrics: (week?: number) => fetchAPI<types.OverviewMetrics>(`/api/metrics/overview${week ? `?week=${week}` : ''}`),
  getWeeklyTrends: () => fetchAPI<types.WeeklyTrend[]>('/api/metrics/weekly'),
  getRoads: (week?: number) => fetchAPI<types.RoadSegment[]>(`/api/roads${week ? `?week=${week}` : ''}`),
  getRoadDetail: (segmentId: string) => fetchAPI<types.RoadSegment>(`/api/roads/${segmentId}`),
  getMapData: (week?: number) => fetchAPI<{type: string, features: types.MapFeature[]}>(`/api/map${week ? `?week=${week}` : ''}`),
  
  getJobs: () => fetchAPI<types.ProcessingJob[]>('/api/jobs'),
  uploadVideo: (formData: FormData) => fetchAPI<{job_id: string}>('/api/jobs', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data', // Let browser set boundary
    }
  }),
  
  getAuthorityIssues: () => fetchAPI<types.IssueReport[]>('/api/authority/issues'),
  getAuthoritySummary: () => fetchAPI<any>('/api/authority/summary'),
  updateIssueStatus: (issueId: string, status: string, notes?: string) => 
    fetchAPI<types.IssueReport>(`/api/authority/issues/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    }),
    
  simulateUpload: () => fetchAPI<{job_id: string}>('/api/demo/simulate-upload', { method: 'POST' }),
  simulateRepair: (segmentId: string, week: number) => fetchAPI<{success: boolean}>(`/api/demo/simulate-repair`, {
    method: 'POST',
    body: JSON.stringify({ segment_id: segmentId, week })
  }),
  triggerVerification: (issueId: string) => fetchAPI<{success: boolean}>(`/api/demo/simulate-verification`, {
    method: 'POST',
    body: JSON.stringify({ issue_id: issueId })
  }),
  
  generateWeeklyReport: (week: number) => fetchAPI<{url: string}>(`/api/reports/generate?week=${week}`, { method: 'POST' }),
};
