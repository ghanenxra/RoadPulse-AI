"use client"

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { api } from '@/lib/api'
import { OverviewMetrics, RoadSegment } from '@/types'
import { 
  ArrowDown, ArrowUp, Map as MapIcon, 
  Route, ShieldAlert, Truck, UploadCloud, ChevronRight, Loader2,
  AlertOctagon, CheckCircle2, Clock, Gauge, ShieldCheck, ArrowUpRight
} from 'lucide-react'
import { formatNumber, getGradeColor } from '@/lib/utils'
import { useWeek } from '@/context/WeekContext'

const CYCLE_TIMESTAMPS: Record<number, string> = {
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const [metricsData, roadsData] = await Promise.all([
        api.getOverviewMetrics(week),
        api.getRoads(week)
      ])
      setMetrics(metricsData)
      setRoads(roadsData.slice(0, 5))
    } catch (e: any) {
      console.error('Failed to load command overview:', e)
      setErrorMsg(e?.message || 'Failed to connect to backend service')
    } finally {
      setLoading(false)
    }
  }, [week])

  useEffect(() => {
    loadData()
  }, [loadData])

  const gradeDistribution = metrics?.grade_distribution || { A: 0, B: 0, C: 0, D: 0, E: 0 }
  const totalGraded = Object.values(gradeDistribution).reduce((a, b) => a + b, 0) || 1

  return (
    <>
      <Topbar title="Transit Infrastructure Command" />

      <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Command Context Bar */}
        <div className="bg-[#0f172a] rounded-xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
                Audit Cycle {week} of 4
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {CYCLE_TIMESTAMPS[week]}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 mt-1">
              Jaipur Urban Road Health Command
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
              Automated transit bus edge telemetry, pavement risk index calculations, and statutory SLA enforcement for civic authorities.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Link
              href="/map"
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-950 bg-sky-400 hover:bg-sky-300 transition-colors shadow-xs"
            >
              <MapIcon className="h-3.5 w-3.5 mr-1.5" />
              GIS Health Map
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-colors"
            >
              Audit Dossiers
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={loadData} className="underline text-rose-200 font-semibold hover:text-white">Retry</button>
          </div>
        )}

        {/* Asymmetric Hero: One Thing Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Main Leading Metric (7 Cols) */}
          <div className="lg:col-span-7 bg-[#0f172a] rounded-xl p-5 border border-slate-800 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
                  Primary Composite Index
                </span>
                <h3 className="text-sm font-semibold text-slate-200">
                  Municipal Network Risk Score
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider border ${
                (metrics?.avg_risk_score.current || 0) > 60
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : (metrics?.avg_risk_score.current || 0) > 40
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                Grade {(metrics?.avg_risk_score.current || 0) > 80 ? 'E' : (metrics?.avg_risk_score.current || 0) > 60 ? 'D' : (metrics?.avg_risk_score.current || 0) > 40 ? 'C' : (metrics?.avg_risk_score.current || 0) > 20 ? 'B' : 'A'}
              </span>
            </div>

            <div className="my-6">
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-100 font-mono">
                  {loading ? '--' : (metrics?.avg_risk_score.current ?? 0).toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-400">/ 100.0</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                {metrics?.avg_risk_score.change !== null && metrics?.avg_risk_score.change !== undefined && (
                  <span className={`inline-flex items-center text-xs font-mono font-semibold ${
                    metrics.avg_risk_score.change > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {metrics.avg_risk_score.change > 0 ? (
                      <ArrowUp className="h-3.5 w-3.5 mr-0.5" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 mr-0.5" />
                    )}
                    {Math.abs(metrics.avg_risk_score.change).toFixed(1)} pts vs Cycle {week > 1 ? week - 1 : 1}
                  </span>
                )}
                <span className="text-slate-600 text-xs">•</span>
                <span className="text-[11px] text-slate-400">
                  Calculated from severity (40%), density (25%), trend (20%), rainfall (15%)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Surveyed Corridors</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {metrics?.roads_surveyed.current || 0} routes
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Total Potholes</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {formatNumber(metrics?.total_potholes.current || 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Survey Coverage</span>
                <span className="font-mono font-bold text-sky-400 text-sm">
                  {metrics?.survey_coverage?.current ?? 100}%
                </span>
              </div>
            </div>
          </div>

          {/* Civic SLA & Intervention Status (5 Cols) */}
          <div className="lg:col-span-5 bg-[#0f172a] rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Civic Accountability Ledger
              </span>
              <Link href="/authority" className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center">
                Full Ledger <ArrowUpRight className="h-3 w-3 ml-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Open Repair Tickets</span>
                <span className="text-2xl font-bold font-mono text-slate-100 mt-1 block">
                  {metrics?.accountability_snapshot.reported ? (
                    metrics.accountability_snapshot.reported + 
                    metrics.accountability_snapshot.acknowledged + 
                    metrics.accountability_snapshot.in_progress
                  ) : 0}
                </span>
                <span className="text-[10px] text-amber-400 font-medium">Statutory 21-Day SLA</span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Overdue Breaches</span>
                <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
                  {metrics?.accountability_snapshot.overdue || 0}
                </span>
                <span className="text-[10px] text-rose-400 font-medium">Escalated to PWD / JMC</span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Claimed Repaired</span>
                <span className="text-2xl font-bold font-mono text-slate-200 mt-1 block">
                  {metrics?.accountability_snapshot.claimed_repaired || 0}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Awaiting Bus Verification</span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">AI Verified Fixed</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  {metrics?.accountability_snapshot.verified || 0}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Confirmed by Transit Cycle</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Automated Municipal Dispatch</span>
              <span className="text-slate-400 font-mono">PWD • JDA • JMC Greater • JMC Heritage</span>
            </div>
          </div>
        </div>

        {/* Secondary Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Pothole Density</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {((metrics?.total_potholes.current || 0) / Math.max(metrics?.roads_surveyed.current || 1, 1)).toFixed(1)}
              </span>
              <span className="text-xs font-mono text-slate-400">per corridor</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Average defect load across urban arterial routes</p>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Severe Distress Corridors</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-rose-400">
                {metrics?.dangerous_segments.current || 0}
              </span>
              <span className="text-xs font-mono text-rose-400 font-semibold">Grade D or E</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Critical risk index requiring priority resurfacing</p>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Edge Ingestion Stream</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-sky-400">
                {metrics?.processing_status.completed || 0}
              </span>
              <span className="text-xs font-mono text-slate-400">runs processed</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {metrics?.processing_status.total_frames || 0} frames evaluated by YOLOv8
            </p>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Verification Success Rate</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {metrics?.accountability_snapshot.verified && (metrics.accountability_snapshot.verified + (metrics.accountability_snapshot.failed_verification || 0)) > 0
                  ? Math.round((metrics.accountability_snapshot.verified / (metrics.accountability_snapshot.verified + metrics.accountability_snapshot.failed_verification)) * 100)
                  : 100}%
              </span>
              <span className="text-xs font-mono text-emerald-400">Audit Grade</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Re-inspected during subsequent bus runs</p>
          </div>
        </div>

        {/* Detailed Lower Breakdown: Distribution & Critical Corridors */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Grade Distribution Bar (5 Cols) */}
          <div className="lg:col-span-5 bg-[#0f172a] rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
                Condition Classification
              </span>
              <h3 className="text-sm font-semibold text-slate-200">
                Municipal Grade Distribution
              </h3>
            </div>

            <div className="space-y-3 my-5">
              {[
                { grade: 'A', label: 'Good (<20.0)', count: gradeDistribution.A, color: 'bg-emerald-500' },
                { grade: 'B', label: 'Fair (21-40)', count: gradeDistribution.B, color: 'bg-lime-500' },
                { grade: 'C', label: 'Moderate (41-60)', count: gradeDistribution.C, color: 'bg-amber-500' },
                { grade: 'D', label: 'Poor (61-80)', count: gradeDistribution.D, color: 'bg-orange-500' },
                { grade: 'E', label: 'Critical (81+)', count: gradeDistribution.E, color: 'bg-rose-500' },
              ].map((item) => {
                const pct = Math.round((item.count / totalGraded) * 100)
                return (
                  <div key={item.grade} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300 flex items-center">
                        <span className={`w-2 h-2 rounded-full ${item.color} mr-2`} />
                        Grade {item.grade} · {item.label}
                      </span>
                      <span className="font-mono font-bold text-slate-200">
                        {item.count} <span className="text-slate-500 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div className={`${item.color} h-1.5 rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
              <span>Standard Municipal Classification</span>
              <span className="font-mono text-slate-400">Total: {totalGraded} segments</span>
            </div>
          </div>

          {/* Highest Risk Corridors Table (7 Cols) */}
          <div className="lg:col-span-7 bg-[#0f172a] rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                  Priority Dispatch Queue
                </span>
                <h3 className="text-sm font-semibold text-slate-200">
                  Critical Corridors Requiring Repair
                </h3>
              </div>
              <Link href="/roads" className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center">
                All Roads <ArrowUpRight className="h-3 w-3 ml-0.5" />
              </Link>
            </div>

            <div className="overflow-x-auto my-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 font-mono text-[10px] uppercase border-b border-slate-800">
                    <th className="py-2.5 px-2">Corridor</th>
                    <th className="py-2.5 px-2">Authority</th>
                    <th className="py-2.5 px-2 text-center">Grade</th>
                    <th className="py-2.5 px-2 text-right">Risk Index</th>
                    <th className="py-2.5 px-2 text-right">Potholes</th>
                    <th className="py-2.5 px-2 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {roads.map((road) => (
                    <tr key={road.segment_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-2 font-medium text-slate-200">
                        <div className="truncate max-w-[160px] sm:max-w-[220px]">
                          {road.road_name}
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">{road.sub_name}</span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-400 text-[11px] truncate max-w-[120px]">
                        {road.authority_name}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          road.current_week?.grade === 'E' ? 'bg-rose-500/20 text-rose-400' :
                          road.current_week?.grade === 'D' ? 'bg-orange-500/20 text-orange-400' :
                          road.current_week?.grade === 'C' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {road.current_week?.grade || 'N/A'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-100">
                        {road.current_week?.risk_score.toFixed(1) || '0.0'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-300">
                        {road.current_week?.pothole_count || 0}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <Link 
                          href={`/roads/${road.segment_id}`}
                          className="text-sky-400 hover:text-sky-300 font-sans text-xs underline font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
              <span>Ranked by severity, defect frequency, and degradation trend</span>
              <Link href="/authority" className="text-xs text-sky-400 hover:text-sky-300 font-medium">
                Issue Tickets →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
