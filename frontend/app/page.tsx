"use client"

import React, { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { OverviewMetrics, RoadSegment } from '@/types'
import { AlertCircle, ArrowDown, ArrowUp, BarChart3, Map, Route, ShieldAlert, Truck, UploadCloud } from 'lucide-react'
import { formatNumber, formatPercent, getGradeColor } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })

export default function Dashboard() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [roads, setRoads] = useState<RoadSegment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [metricsData, roadsData] = await Promise.all([
          api.getOverviewMetrics(),
          api.getRoads()
        ])
        setMetrics(metricsData)
        setRoads(roadsData.slice(0, 5)) // Top 5 priority
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) return <div className="p-8">Loading dashboard...</div>
  if (!metrics) return <div className="p-8">Failed to load data.</div>

  const gradeData = [
    { name: 'Grade A', value: metrics.grade_distribution.A, fill: getGradeColor('A') },
    { name: 'Grade B', value: metrics.grade_distribution.B, fill: getGradeColor('B') },
    { name: 'Grade C', value: metrics.grade_distribution.C, fill: getGradeColor('C') },
    { name: 'Grade D', value: metrics.grade_distribution.D, fill: getGradeColor('D') },
    { name: 'Grade E', value: metrics.grade_distribution.E, fill: getGradeColor('E') },
  ]

  return (
    <>
      <Topbar title="Road Health Overview" />
      <div className="p-6 space-y-6">
        
        {/* KPI Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Avg Risk Score" value={metrics.avg_risk_score.current.toFixed(1)} change={metrics.avg_risk_score.change_pct} icon={<BarChart3 />} />
          <KpiCard title="Dangerous Segments" value={metrics.dangerous_segments.current} change={metrics.dangerous_segments.change_pct} icon={<AlertCircle />} />
          <KpiCard title="Total Potholes" value={formatNumber(metrics.total_potholes.current)} change={metrics.total_potholes.change_pct} icon={<Map />} />
          <KpiCard title="Roads Surveyed" value={`${metrics.roads_surveyed.current} km`} change={metrics.roads_surveyed.change_pct} icon={<Route />} />
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Pending Repairs" value={metrics.pending_repairs.current} change={metrics.pending_repairs.change_pct} icon={<ShieldAlert />} />
          <KpiCard title="Verified Repairs" value={metrics.verified_repairs.current} change={metrics.verified_repairs.change_pct} icon={<ShieldAlert className="text-green-500" />} />
          <KpiCard title="Uploads Processed" value={metrics.uploads_processed.current} change={metrics.uploads_processed.change_pct} icon={<UploadCloud />} />
          <KpiCard title="Survey Coverage" value={`${metrics.survey_coverage.current.toFixed(1)}%`} change={metrics.survey_coverage.change_pct} icon={<Truck />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Road Health Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Priority Roads Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-2">Road</th>
                      <th className="px-4 py-2">Grade</th>
                      <th className="px-4 py-2">Risk</th>
                      <th className="px-4 py-2">Potholes</th>
                      <th className="px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roads.map(road => (
                      <tr key={road.segment_id} className="border-b">
                        <td className="px-4 py-2 font-medium">{road.road_name}</td>
                        <td className="px-4 py-2">
                          <Badge style={{ backgroundColor: getGradeColor(road.current_week.grade), color: 'white' }}>
                            {road.current_week.grade}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">{road.current_week.risk_score.toFixed(1)}</td>
                        <td className="px-4 py-2">{road.current_week.pothole_count}</td>
                        <td className="px-4 py-2">
                          <Link href={`/roads/${road.segment_id}`} className="text-blue-600 hover:underline">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function KpiCard({ title, value, change, icon }: { title: string, value: string|number, change: number, icon: React.ReactNode }) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  
  // For things like risk score and potholes, decrease is GOOD (green), increase is BAD (red)
  // We'll simplify and just show up/down arrows and neutral colors for now or infer
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="text-slate-400">{icon}</div>
        </div>
        <div className="flex items-baseline space-x-2">
          <h2 className="text-3xl font-bold tracking-tight">{value}</h2>
          <span className={`flex items-center text-sm font-medium ${isNegative ? 'text-green-600' : isPositive ? 'text-red-600' : 'text-slate-500'}`}>
            {isNegative ? <ArrowDown className="mr-1 h-4 w-4" /> : isPositive ? <ArrowUp className="mr-1 h-4 w-4" /> : null}
            {Math.abs(change).toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
