"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Topbar } from "@/components/layout/Topbar"
import { 
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Clock, Shield,
  ArrowRight, Activity, MapPin, Bus, RefreshCw, FileText, ChevronRight
} from "lucide-react"
import { api } from "@/lib/api"
import { OverviewMetrics, RoadSegment } from "@/types"
import { useWeek } from "@/context/WeekContext"

export default function OverviewPage() {
  const { week } = useWeek()
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [roads, setRoads] = useState<RoadSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [metricsData, roadsData] = await Promise.all([
        api.getOverviewMetrics(week),
        api.getRoads(week),
      ])
      setMetrics(metricsData)
      setRoads(roadsData)
    } catch (err: any) {
      console.error("Dashboard fetch error:", err)
      setError(err.message || "Failed to load municipal telemetry")
    } finally {
      setLoading(false)
    }
  }, [week])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const topPriorityRoads = React.useMemo(() => {
    return [...roads]
      .sort((a, b) => (b.current_week?.risk_score ?? 0) - (a.current_week?.risk_score ?? 0))
      .slice(0, 5)
  }, [roads])

  const gradeCounts = React.useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 }
    roads.forEach((r) => {
      const g = (r.current_week?.grade || "C") as keyof typeof counts
      if (counts[g] !== undefined) counts[g]++
    })
    return counts
  }, [roads])

  return (
    <>
      <Topbar title="Transit Infrastructure Command Console" />

      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Error notification */}
        {error && (
          <div className="bg-[#faecea] border border-[#f0c0b8] p-4 rounded-xl flex items-center justify-between text-[#912d1e]">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-1 bg-[#1d4231] hover:bg-[#153325] text-[#faf8f4] text-xs font-semibold rounded-lg flex items-center space-x-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </button>
          </div>
        )}

        {/* SECTION 1: Asymmetric Command Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Primary Lead Metric: Composite Road Risk Index (7 Cols) */}
          <div className="lg:col-span-7 bg-[#faf8f4] rounded-xl p-5 sm:p-6 border border-[#ded7cb] shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#506457] block mb-1">
                  Primary Municipal Health Index · Week {week}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#12271c] tracking-tight">
                  Jaipur Transit Network Composite Risk
                </h2>
              </div>
              <span className="bg-[#e8f2ec] text-[#18432d] border border-[#c0dcc9] font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                Formula Weighted
              </span>
            </div>

            <div className="my-6">
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1d4231] font-mono">
                  {loading ? '--' : (metrics?.avg_risk_score.current ?? 0).toFixed(1)}
                </span>
                <span className="text-xs font-mono text-[#506457]">/ 100.0 Max Defect Index</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                {metrics?.avg_risk_score.change !== null && metrics?.avg_risk_score.change !== undefined && (
                  <span className={`inline-flex items-center text-xs font-mono font-semibold ${
                    metrics.avg_risk_score.change > 0 ? "text-[#912d1e]" : "text-[#207246]"
                  }`}>
                    {metrics.avg_risk_score.change > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 mr-1" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 mr-1" />
                    )}
                    {metrics.avg_risk_score.change > 0 ? "+" : ""}
                    {metrics.avg_risk_score.change.toFixed(1)} vs previous survey cycle
                  </span>
                )}
              </div>
            </div>

            {/* Formula Sub-Factor Weights Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-[#ded7cb]">
              <div className="bg-[#f4efe6] p-2.5 rounded-lg border border-[#ded7cb]">
                <span className="text-[10px] text-[#506457] font-mono uppercase block">Severity (40%)</span>
                <span className="font-mono font-bold text-[#12271c] text-sm">
                  {loading ? '--' : (roads.reduce((acc, r) => acc + (r.current_week?.severity_avg ?? 0), 0) / Math.max(roads.length, 1)).toFixed(1)}
                </span>
              </div>
              <div className="bg-[#f4efe6] p-2.5 rounded-lg border border-[#ded7cb]">
                <span className="text-[10px] text-[#506457] font-mono uppercase block">Density (25%)</span>
                <span className="font-mono font-bold text-[#12271c] text-sm">
                  {loading ? '--' : (roads.reduce((acc, r) => acc + (r.current_week?.density ?? 0), 0) / Math.max(roads.length, 1)).toFixed(1)}/km
                </span>
              </div>
              <div className="bg-[#f4efe6] p-2.5 rounded-lg border border-[#ded7cb]">
                <span className="text-[10px] text-[#506457] font-mono uppercase block">Active Buses</span>
                <span className="font-mono font-bold text-[#1d4231] text-sm">20 Units</span>
              </div>
              <div className="bg-[#f4efe6] p-2.5 rounded-lg border border-[#ded7cb]">
                <span className="text-[10px] text-[#506457] font-mono uppercase block">Survey Coverage</span>
                <span className="font-mono font-bold text-[#1d4231] text-sm">
                  {metrics?.survey_coverage?.current ?? 100}%
                </span>
              </div>
            </div>
          </div>

          {/* Civic SLA & Intervention Status (5 Cols) */}
          <div className="lg:col-span-5 bg-[#faf8f4] rounded-xl p-5 border border-[#ded7cb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-[#ded7cb]">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#506457]">
                Civic Accountability Ledger
              </span>
              <span className="font-mono text-[10px] text-[#912d1e] bg-[#faecea] border border-[#f0c0b8] px-2 py-0.5 rounded font-semibold">
                21-Day SLA Active
              </span>
            </div>

            <div className="my-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f4efe6] border border-[#ded7cb]">
                <div className="flex items-center space-x-2.5">
                  <Clock className="h-4 w-4 text-[#912d1e]" />
                  <div>
                    <div className="text-xs font-semibold text-[#12271c]">Overdue SLA Corridors</div>
                    <div className="text-[10px] text-[#506457]">Breached 21-day legal repair window</div>
                  </div>
                </div>
                <span className="text-lg font-mono font-black text-[#912d1e]">
                  {metrics?.accountability_snapshot?.overdue ?? 1}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f4efe6] border border-[#ded7cb]">
                <div className="flex items-center space-x-2.5">
                  <Shield className="h-4 w-4 text-[#a86c18]" />
                  <div>
                    <div className="text-xs font-semibold text-[#12271c]">Pending Contractor Repairs</div>
                    <div className="text-[10px] text-[#506457]">Dispatched to PWD / JDA / JMC</div>
                  </div>
                </div>
                <span className="text-lg font-mono font-black text-[#a86c18]">
                  {metrics?.pending_repairs.current ?? 4}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f4efe6] border border-[#ded7cb]">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[#207246]" />
                  <div>
                    <div className="text-xs font-semibold text-[#12271c]">AI Verified Restorations</div>
                    <div className="text-[10px] text-[#506457]">Confirmed smooth via follow-up bus pass</div>
                  </div>
                </div>
                <span className="text-lg font-mono font-black text-[#207246]">
                  {metrics?.verified_repairs.current ?? 2}
                </span>
              </div>
            </div>

            <Link
              href="/authority"
              className="text-xs text-[#1d4231] hover:text-[#12271c] font-semibold flex items-center justify-between pt-2 border-t border-[#ded7cb] transition-colors"
            >
              <span>Inspect Authority SLA Tracker</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* SECTION 2: Secondary Telemetry Bento Grid (4 Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#faf8f4] p-4 rounded-xl border border-[#ded7cb] shadow-sm">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Monitored Corridors
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-[#12271c] mt-1">
              {metrics?.roads_surveyed.current ?? 20}
            </div>
            <div className="text-[11px] text-[#207246] mt-1 font-mono">
              100% active transit grid
            </div>
          </div>

          <div className="bg-[#faf8f4] p-4 rounded-xl border border-[#ded7cb] shadow-sm">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Total Deduplicated Defects
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-[#12271c] mt-1">
              {metrics?.total_potholes.current ?? 0}
            </div>
            <div className="text-[11px] text-[#506457] mt-1 font-mono">
              DBSCAN merged (epsilon = 15m)
            </div>
          </div>

          <div className="bg-[#faf8f4] p-4 rounded-xl border border-[#ded7cb] shadow-sm">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Dangerous Corridors
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-[#912d1e] mt-1">
              {metrics?.dangerous_segments.current ?? 0}
            </div>
            <div className="text-[11px] text-[#912d1e] mt-1 font-mono">
              Grade D and E escalation
            </div>
          </div>

          <div className="bg-[#faf8f4] p-4 rounded-xl border border-[#ded7cb] shadow-sm">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              NVDR Ingestion Cycles
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-[#1d4231] mt-1">
              {metrics?.uploads_processed.current ?? 12}
            </div>
            <div className="text-[11px] text-[#506457] mt-1 font-mono">
              Auto depot batch sync
            </div>
          </div>
        </div>

        {/* SECTION 3: Asymmetric Distribution & Priority Dispatch Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Grade Distribution Matrix (4 Cols) */}
          <div className="lg:col-span-4 bg-[#faf8f4] rounded-xl p-5 border border-[#ded7cb] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#506457]">
                  Condition Grade Spectrum
                </span>
                <span className="text-xs font-mono text-[#506457]">Total: {roads.length}</span>
              </div>
              <p className="text-xs text-[#506457] mb-4">
                Five-tier classification standard aligned with IRC municipal carriageway ratings.
              </p>

              <div className="space-y-2.5">
                {[
                  { grade: "A", range: "0 - 20 (Pristine)", count: gradeCounts.A, color: "bg-[#207246]", bg: "bg-[#e6f4ea] text-[#1e5d3a] border-[#bde0ca]" },
                  { grade: "B", range: "21 - 40 (Minor Wear)", count: gradeCounts.B, color: "bg-[#48995b]", bg: "bg-[#eef8eb] text-[#2f6f34] border-[#cbe8c6]" },
                  { grade: "C", range: "41 - 60 (Moderate)", count: gradeCounts.C, color: "bg-[#c2822a]", bg: "bg-[#fef4e5] text-[#8c5610] border-[#f6d7ab]" },
                  { grade: "D", range: "61 - 80 (High Risk)", count: gradeCounts.D, color: "bg-[#c05621]", bg: "bg-[#faece8] text-[#9b3a1a] border-[#f2c3b8]" },
                  { grade: "E", range: "81 - 100 (Hazardous)", count: gradeCounts.E, color: "bg-[#912d1e]", bg: "bg-[#faecea] text-[#912d1e] border-[#f0c0b8]" },
                ].map((item) => (
                  <div key={item.grade} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] border ${item.bg}`}>
                        {item.grade}
                      </span>
                      <span className="text-[#506457] text-[11px]">{item.range}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1.5 bg-[#ede7dc] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color}`}
                          style={{ width: `${roads.length ? (item.count / roads.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="font-bold text-[#12271c] w-4 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#ded7cb] text-[11px] text-[#506457] flex justify-between items-center">
              <span>Severe Corridors (D + E):</span>
              <span className="font-mono font-bold text-[#912d1e]">
                {gradeCounts.D + gradeCounts.E} Segments
              </span>
            </div>
          </div>

          {/* Priority Corridor Dispatch Queue (8 Cols) */}
          <div className="lg:col-span-8 bg-[#faf8f4] rounded-xl p-5 border border-[#ded7cb] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-[#ded7cb]">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#506457] block mb-0.5">
                    Critical Repair Dispatch Queue
                  </span>
                  <h3 className="text-sm font-semibold text-[#12271c]">
                    Top Priority Transit Corridors Requiring Remediation
                  </h3>
                </div>
                <Link
                  href="/roads"
                  className="text-xs font-mono font-semibold text-[#1d4231] hover:underline inline-flex items-center"
                >
                  View All Corridors <ChevronRight className="h-3 w-3 ml-0.5" />
                </Link>
              </div>

              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] text-[#506457] uppercase tracking-wider border-b border-[#ded7cb]">
                      <th className="py-2.5 px-2">Corridor ID</th>
                      <th className="py-2.5 px-2">Road Name & Stretch</th>
                      <th className="py-2.5 px-2">Jurisdiction</th>
                      <th className="py-2.5 px-2 text-center">Grade</th>
                      <th className="py-2.5 px-2 text-right">Risk Score</th>
                      <th className="py-2.5 px-2 text-right">Potholes</th>
                      <th className="py-2.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede7dc]">
                    {topPriorityRoads.map((road) => (
                      <tr key={road.segment_id} className="hover:bg-[#f4efe6] transition-colors">
                        <td className="py-2.5 px-2 font-bold text-[#1d4231]">
                          {road.segment_id}
                        </td>
                        <td className="py-2.5 px-2 font-sans font-medium text-[#12271c]">
                          {road.road_name}{" "}
                          <span className="text-[11px] text-[#506457] font-normal block sm:inline">
                            ({road.sub_name})
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-[#506457] text-[11px] font-sans">
                          {road.authority_name}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            road.current_week?.grade === 'E' ? 'bg-[#faecea] text-[#912d1e] border-[#f0c0b8]' :
                            road.current_week?.grade === 'D' ? 'bg-[#faece8] text-[#9b3a1a] border-[#f2c3b8]' :
                            road.current_week?.grade === 'C' ? 'bg-[#fef4e5] text-[#8c5610] border-[#f6d7ab]' :
                            'bg-[#e6f4ea] text-[#1e5d3a] border-[#bde0ca]'
                          }`}>
                            {road.current_week?.grade || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-[#12271c]">
                          {road.current_week?.risk_score.toFixed(1) || '0.0'}
                        </td>
                        <td className="py-2.5 px-2 text-right text-[#506457]">
                          {road.current_week?.pothole_count || 0}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <Link
                            href={`/roads/${road.segment_id}`}
                            className="text-[#1d4231] hover:text-[#12271c] font-semibold text-[11px] underline"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-[#ded7cb] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-[#506457]">
              <span>Real-time dashcam telemetry synced daily via JCTSL depot charging hubs.</span>
              <Link
                href="/map"
                className="px-3 py-1.5 bg-[#1d4231] hover:bg-[#153325] text-[#faf8f4] font-semibold rounded-lg flex items-center shadow-xs transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 mr-1" /> Open Live GIS Map
              </Link>
            </div>
          </div>

        </div>

      </div>
    </>
  )
}
