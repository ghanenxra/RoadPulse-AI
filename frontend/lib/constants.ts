export const GRADE_CONFIG = {
  A: { label: 'Good', color: '#22c55e', bgColor: '#dcfce7', range: '0-20' },
  B: { label: 'Fair', color: '#84cc16', bgColor: '#ecfccb', range: '21-40' },
  C: { label: 'Moderate', color: '#eab308', bgColor: '#fef9c3', range: '41-60' },
  D: { label: 'Poor', color: '#f97316', bgColor: '#ffedd5', range: '61-80' },
  E: { label: 'Dangerous', color: '#ef4444', bgColor: '#fee2e2', range: '81-100' },
} as const;

export const STATUS_CONFIG = {
  none: { label: 'No Action', color: '#94a3b8' },
  reported: { label: 'Reported', color: '#3b82f6' },
  acknowledged: { label: 'Acknowledged', color: '#8b5cf6' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  repaired: { label: 'Repaired', color: '#22c55e' },
  verified: { label: 'Verified', color: '#10b981' },
  overdue: { label: 'Overdue', color: '#ef4444' },
  failed_verification: { label: 'Failed', color: '#dc2626' },
} as const;

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://roadpulse-ai-wjsk.onrender.com'
    : 'http://127.0.0.1:8000');

export const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: 'LayoutDashboard' },
  { href: '/map', label: 'Road Health Map', icon: 'Map' },
  { href: '/roads', label: 'Road Segments', icon: 'Route' },
  { href: '/processing', label: 'Processing Center', icon: 'Cog' },
  { href: '/reports', label: 'Reports', icon: 'FileText' },
  { href: '/authority', label: 'Authority Tracker', icon: 'Shield' },
  { href: '/demo', label: 'Demo Data', icon: 'Database' },
  { href: '/settings', label: 'Settings', icon: 'Settings' },
] as const;
