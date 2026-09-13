import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { GRADE_CONFIG, STATUS_CONFIG } from "./constants"
import { WeeklyMetric } from "../types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatPercent(num: number): string {
  return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`
}

export function getGradeColor(grade: string): string {
  return GRADE_CONFIG[grade as keyof typeof GRADE_CONFIG]?.color || '#94a3b8'
}

export function getGradeLabel(grade: string): string {
  return GRADE_CONFIG[grade as keyof typeof GRADE_CONFIG]?.label || 'Unknown'
}

export function getStatusColor(status: string): string {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#94a3b8'
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function generateNarrative(weeks: WeeklyMetric[]): string {
  if (!weeks || weeks.length === 0) return 'No data available.'
  const first = weeks[0]
  const last = weeks[weeks.length - 1]
  
  let narrative = `Road condition started at Grade ${first.grade} (score ${first.risk_score}) in Week ${first.week}. `
  if (last.risk_score > first.risk_score) {
    narrative += `It has deteriorated to Grade ${last.grade} (score ${last.risk_score}) in Week ${last.week}. `
  } else if (last.risk_score < first.risk_score) {
    narrative += `It has improved to Grade ${last.grade} (score ${last.risk_score}) in Week ${last.week}. `
  } else {
    narrative += `It remains at Grade ${last.grade} in Week ${last.week}. `
  }
  
  if (last.status && last.status !== 'none') {
    narrative += `Current status: ${STATUS_CONFIG[last.status as keyof typeof STATUS_CONFIG]?.label || last.status}.`
  }
  
  return narrative
}
