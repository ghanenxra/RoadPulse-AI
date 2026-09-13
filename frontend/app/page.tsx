"use client"

import React, { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api } from '@/lib/api'
import { OverviewMetrics, RoadSegment } from '@/types'
import { 
  AlertCircle, ArrowDown, ArrowUp, BarChart3, Map as MapIcon, 
  Route, ShieldAlert, Truck, UploadCloud, Calendar, ChevronRight, Loader2 
} from 'lucide-react'
import { formatNumber, getGradeColor } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useWeek } from '@/context/WeekContext'

const WEEK_DATES: Record<number, string> = {
  1: "August 17, 2026",
  2: "August 24, 2026",
  3: "August 31, 2026",
  4: "September 07, 2026",
}

export default function Dashboard() {
  const { week } = useWeek()
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [roads, setRoads] = useState<RoadSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const [metricsData, roadsData] = await Promise.all([
        api.getOverviewMetrics(week),
        api.getRoads(week)
      ])
      setMetrics(metricsData)
      setRoads(roadsData.slice(0, 6))
    } catch (e: any) {
      console.error('Failed to load dashboard data:', e)
      setErrorMsg(e?.message || 'Failed to connect to backend service')
    } finally {
      setLoading(false)
    }
  }, [week])

  useEffect(() => {
    loadData()
  }, [loadData])

  const gradeData = metrics ? [
    { name: 'Grade A', value: metrics.grade_distribution.A, fill: getGradeColor('A') },
    { name: 'Grade B', value: metrics.grade_distribution.B, fill: getGradeColor('B') },
    { name: 'Grade C', value: metrics.grade_distribution.C, fill: getGradeColor('C') },
    { name: 'Grade D', value: metrics.grade_distribution.D, fill: getGradeColor('D') },
    { name: 'Grade E', value: metrics.grade_distribution.E, fill: getGradeColor('E') },
  ] : []

  return (
    <>
      <Topbar title="Road Health Overview" />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        {/* Timeline Context Header */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Cycle: Week {week} of 4
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Survey Date: {WEEK_DATES[week]}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              Jaipur Municipal Road Condition Audit
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Corridor deterioration metrics, edge dashcam telemetry, and SLA intervention tracking.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Link
              href="/map"
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <MapIcon className="h-4 w-4 mr-1.5" />
              Open GIS Map
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300"
            >
              Export Report
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center bg-white rounded-xl border p-8 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <span className="text-sm font-medium">Updating data for Week {week}...</span>
          </div>
        ) : metrics ? (
          <>
            {/* KPI Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard
                title="Avg Risk Score"
                value={metrics.avg_risk_score.current.toFixed(1)}
                change={metrics.avg_risk_score.change_pct}
                invertColor
                icon={<BarChart3 />}
              />
              <KpiCard
                title="Dangerous Corridors"
                value={metrics.dangerous_segments.current}
                change={metrics.dangerous_segments.change_pct}
                invertColor
                icon={<AlertCircle />}
              />
              <KpiCard
                title="Total Potholes"
                value={formatNumber(metrics.total_potholes.current)}
                change={metrics.total_potholes.change_pct}
                invertColor
                icon={<MapIcon />}
              />
              <KpiCard
                title="Roads Surveyed"
                value={`${metrics.roads_surveyed.current} Segments`}
                change={metrics.roads_surveyed.change_pct}
                icon={<Route />}
              />
            </div>

            {/* KPI Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard
                title="Pending SLA Repairs"
                value={metrics.pending_repairs.current}
                change={metrics.pending_repairs.change_pct}
                invertColor
                icon={<ShieldAlert />}
              />
              <KpiCard
                title="Verified Fixes"
                value={metrics.verified_repairs.current}
                change={metrics.verified_repairs.change_pct}
                icon={<ShieldAlert className="text-emerald-500" />}
              />
              <KpiCard
                title="Uploads Processed"
                value={metrics.uploads_processed.current}
                change={metrics.uploads_processed.change_pct}
                icon={<UploadCloud />}
              />
              <KpiCard
                title="Survey Coverage"
                value={`${metrics.survey_coverage.current.toFixed(1)}%`}
                change={metrics.survey_coverage.change_pct}
                icon={<Truck />}
              />
            </div>

            {/* Charts & Priority Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Grade Distribution Chart */}
              <Card>
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
                  <CardTitle className="text-base sm:text-lg">Network Grade Distribution (Week {week})</CardTitle>
                  <CardDescription className="text-xs">
                    Grade A (&lt;20) to Critical Grade E (80-100)
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[280px] p-2 sm:p-6 pt-0 sm:pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <RechartsTooltip cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Priority Roads Table */}
              <Card>
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Critical Intervention Corridors</CardTitle>
                    <CardDescription className="text-xs">Sorted by highest composite risk index</CardDescription>
                  </div>
                  <Link href="/roads" className="text-xs text-blue-600 hover:underline flex items-center font-medium">
                    All Roads <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm text-left">
                      <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-y">
                        <tr>
                          <th className="px-3 sm:px-4 py-2.5">Corridor</th>
                          <th className="px-2 sm:px-4 py-2.5">Grade</th>
                          <th className="px-2 sm:px-4 py-2.5">Risk</th>
                          <th className="px-2 sm:px-4 py-2.5">Potholes</th>
                          <th className="px-2 sm:px-4 py-2.5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {roads.map((road) => (
                          <tr key={road.segment_id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-3 sm:px-4 py-2.5">
                              <div className="font-semibold text-slate-900">{road.road_name}</div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">{road.sub_name}</div>
                            </td>
                            <td className="px-2 sm:px-4 py-2.5">
                              <Badge style={{ backgroundColor: getGradeColor(road.current_week.grade), color: 'white' }}>
                                Grade {road.current_week.grade}
                              </Badge>
                            </td>
                            <td className="px-2 sm:px-4 py-2.5 font-bold text-slate-800">
                              {road.current_week.risk_score.toFixed(1)}
                            </td>
                            <td className="px-2 sm:px-4 py-2.5 text-slate-600 font-medium">
                              {road.current_week.pothole_count}
                            </td>
                            <td className="px-2 sm:px-4 py-2.5">
                              <Link
                                href={`/roads/${road.segment_id}`}
                                className="text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border text-slate-600 shadow-sm space-y-3">
            <div className="text-rose-600 font-semibold text-base">Backend Connection Notice</div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {errorMsg || "Unable to reach the FastAPI backend service on port 8000."}
            </p>
            <button
              onClick={() => loadData()}
              className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
            >
              Retry Loading
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function KpiCard({
  title,
  value,
  change,
  icon,
  invertColor = false,
}: {
  title: string
  value: string | number
  change: number
  icon: React.ReactNode
  invertColor?: boolean
}) {
  // If invertColor is true: decrease is GOOD (green), increase is BAD (red)
  const isPositive = change > 0
  const isNegative = change < 0

  let badgeColor = 'text-slate-500'
  if (isNegative) {
    badgeColor = invertColor ? 'text-emerald-600' : 'text-rose-600'
  } else if (isPositive) {
    badgeColor = invertColor ? 'text-rose-600' : 'text-emerald-600'
  }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between pb-1.5">
          <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">{title}</p>
          <div className="text-slate-400 shrink-0">{icon}</div>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{value}</h2>
          {change !== 0 && (
            <span className={`flex items-center text-xs font-semibold ${badgeColor}`}>
              {isNegative ? <ArrowDown className="mr-0.5 h-3.5 w-3.5" /> : <ArrowUp className="mr-0.5 h-3.5 w-3.5" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
