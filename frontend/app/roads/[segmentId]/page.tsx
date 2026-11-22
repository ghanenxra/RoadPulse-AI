"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { api } from '@/lib/api'
import { RoadSegment, MapFeature } from '@/types'
import { useWeek } from '@/context/WeekContext'
import { ArrowLeft, MapPin, Camera, Download, FileText, Loader2, AlertCircle, ShieldAlert } from 'lucide-react'
import dynamic from 'next/dynamic'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import Link from 'next/link'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-48 bg-[#090d16] flex items-center justify-center text-xs font-mono text-slate-500">Loading GIS polyline...</div>
})

export default function RoadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const segmentId = params.segmentId as string
  const { week } = useWeek()
  
  const [road, setRoad] = useState<RoadSegment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const data = await api.getRoadDetail(segmentId, week)
        setRoad(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (segmentId) loadData()
  }, [segmentId, week])

  if (loading) {
    return (
      <>
        <Topbar title="Corridor Forensic Analysis" />
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-slate-400 font-mono">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400 mb-2" />
          <p className="text-xs">Loading forensic telemetry for {segmentId}...</p>
        </div>
      </>
    )
  }

  if (!road || !road.current_week) {
    return (
      <>
        <Topbar title="Corridor Forensic Analysis" />
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center font-mono">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-400">
            <AlertCircle className="h-6 w-6 text-slate-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-100">Corridor Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Could not find forensic data for segment {segmentId} in Cycle {week}.
          </p>
          <button 
            onClick={() => router.push('/roads')} 
            className="mt-4 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-sky-400 hover:text-sky-300 font-semibold"
          >
            ← Back to Directory
          </button>
        </div>
      </>
    )
  }

  const feature: MapFeature = {
    type: 'Feature',
    properties: {
      segment_id: road.segment_id,
      road_name: road.road_name,
      sub_name: road.sub_name,
      risk_score: road.current_week.risk_score,
      grade: road.current_week.grade,
      pothole_count: road.current_week.pothole_count,
      authority: road.authority_name,
      status: road.current_week.status,
      weekly_change: road.current_week.weekly_change
    },
    geometry: {
      type: 'LineString',
      coordinates: (road.coords && road.coords.length > 0
        ? road.coords
        : [[road.start_lat, road.start_lon], [road.end_lat, road.end_lon]]
      ).map(c => [c[1], c[0]])
    }
  }

  const chartData = road.weeks.map(w => ({
    name: `Cycle ${w.week}`,
    potholes: w.pothole_count,
    risk: w.risk_score,
    grade: w.grade
  }))

  return (
    <>
      <Topbar title={`${road.road_name} (${road.segment_id})`} />

      <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] p-4 sm:p-5 rounded-xl border border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <Link 
                href="/roads" 
                className="text-xs text-slate-400 hover:text-sky-400 transition-colors font-mono inline-flex items-center"
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Road Directory
              </Link>
              <span className="text-slate-600 text-xs">/</span>
              <span className="text-[10px] font-mono uppercase bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                {road.segment_id}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 mt-1">
              {road.road_name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {road.sub_name} · Managed by {road.authority_name}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider border ${
              road.current_week.grade === 'E' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
              road.current_week.grade === 'D' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
              road.current_week.grade === 'C' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
              'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              Grade {road.current_week.grade} · Score {road.current_week.risk_score.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Telemetry Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800 font-mono">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Corridor Length</span>
            <span className="text-2xl font-bold text-slate-100">{road.length_km.toFixed(2)} km</span>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">Full carriage surveyed</p>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800 font-mono">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Pothole Count</span>
            <span className="text-2xl font-bold text-slate-100">{road.current_week.pothole_count}</span>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">{road.current_week.severe_count} severe defects</p>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800 font-mono">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Spatial Density</span>
            <span className="text-2xl font-bold text-sky-400">
              {(road.current_week.density || (road.current_week.pothole_count / Math.max(road.length_km, 0.5))).toFixed(1)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">defects per kilometer</p>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-800 font-mono">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Cycle-over-Cycle Trend</span>
            <span className={`text-2xl font-bold ${
              (road.current_week.trend || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {(road.current_week.trend || 0) > 0 ? '+' : ''}{(road.current_week.trend || 0).toFixed(1)}%
            </span>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">Degradation trajectory</p>
          </div>
        </div>

        {/* Charts and Spatial Geometry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Historical Degradation Chart (7 cols) */}
          <div className="lg:col-span-7 bg-[#0f172a] rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                  Multi-Cycle Trajectory
                </span>
                <h3 className="text-sm font-semibold text-slate-200">
                  Risk Score &amp; Defect Progression
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Cycles 1 to 4</span>
            </div>

            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} fontFamily="monospace" />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} fontFamily="monospace" domain={[0, 100]} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                    labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
                  />
                  <Bar dataKey="potholes" name="Defect Count" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={28} />
                  <Line type="monotone" dataKey="risk" name="Risk Score (0-100)" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4, fill: '#f43f5e' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex justify-between">
              <span>Risk score combines severity, density, trend, rainfall</span>
              <span className="text-slate-400">Jaipur Transit Bus NVDR</span>
            </div>
          </div>

          {/* Mini Corridor GIS Map (5 cols) */}
          <div className="lg:col-span-5 bg-[#0f172a] rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                  Vector Geometry
                </span>
                <h3 className="text-sm font-semibold text-slate-200">
                  OpenStreetMap Alignment
                </h3>
              </div>
              <span className="text-[10px] font-mono text-sky-400">OSRM Snapped</span>
            </div>

            <div className="h-64 rounded-lg overflow-hidden border border-slate-800 my-4 relative">
              <MapComponent 
                features={[feature]} 
                height="100%" 
                interactive={false}
                autoFitBounds={true}
              />
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex justify-between">
              <span>Start: {road.start_lat.toFixed(4)}, {road.start_lon.toFixed(4)}</span>
              <span>End: {road.end_lat.toFixed(4)}, {road.end_lon.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Forensic Evidence Table */}
        <div className="bg-[#0f172a] rounded-xl p-5 border border-slate-800 shadow-sm">
          <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                AI Inference Log
              </span>
              <h3 className="text-sm font-semibold text-slate-200">
                Pothole Optical Detections (YOLOv8)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {road.detections?.length || 0} Detections Logged
            </span>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  <th className="py-2.5 px-3">Detection ID</th>
                  <th className="py-2.5 px-3">Frame</th>
                  <th className="py-2.5 px-3">GPS Latitude / Longitude</th>
                  <th className="py-2.5 px-3">Visual Severity</th>
                  <th className="py-2.5 px-3">Model Confidence</th>
                  <th className="py-2.5 px-3">Depth Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {road.detections && road.detections.length > 0 ? (
                  road.detections.slice(0, 8).map((det: any) => (
                    <tr key={det.detection_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-sky-400 truncate max-w-[120px]">
                        {det.detection_id}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {det.frame_number ? `Frame #${det.frame_number}` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {det.latitude ? `${det.latitude.toFixed(5)}, ${det.longitude.toFixed(5)}` : 'Interpolated along road polyline'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          det.severity_label === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                          det.severity_label === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {det.severity_label} ({det.severity.toFixed(2)})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {(det.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {det.depth_cm ? `${det.depth_cm} cm` : 'Optical (Monocular)'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No discrete detections recorded for Cycle {week}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
