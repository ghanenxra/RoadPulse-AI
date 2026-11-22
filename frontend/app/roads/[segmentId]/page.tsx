"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Topbar } from "@/components/layout/Topbar"
import { api } from "@/lib/api"
import { RoadSegment, MapFeature } from "@/types"
import { 
  ArrowLeft, MapPin, AlertTriangle, ShieldCheck, Clock, FileVideo, 
  TrendingUp, TrendingDown, Layers, CheckCircle2, ChevronRight 
} from "lucide-react"
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from "recharts"

const MapComponent = dynamic(
  () => import("@/components/MapComponent"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-48 bg-[#ede7dc] rounded-lg flex items-center justify-center text-[#506457] text-xs font-mono">
        Loading mini GIS canvas...
      </div>
    )
  }
)

export default function RoadDetailPage() {
  const params = useParams()
  const segmentId = params?.segmentId as string

  const [road, setRoad] = useState<RoadSegment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRoadDetail() {
      if (!segmentId) return
      try {
        setLoading(true)
        const data = await api.getRoadDetail(segmentId, 4)
        setRoad(data)
      } catch (err: any) {
        console.error("Failed to load road forensic detail:", err)
        setError(err.message || "Failed to load corridor forensics")
      } finally {
        setLoading(false)
      }
    }
    loadRoadDetail()
  }, [segmentId])

  if (loading) {
    return (
      <>
        <Topbar title="Corridor Forensic Telemetry" />
        <div className="p-6 max-w-7xl mx-auto text-center text-[#506457] font-mono text-xs">
          Loading corridor forensics for {segmentId}...
        </div>
      </>
    )
  }

  if (error || !road) {
    return (
      <>
        <Topbar title="Corridor Forensic Telemetry" />
        <div className="p-6 max-w-7xl mx-auto space-y-4">
          <div className="bg-[#faecea] border border-[#f0c0b8] p-4 rounded-xl text-[#912d1e] text-xs">
            {error || `Road segment '${segmentId}' not found.`}
          </div>
          <Link href="/roads" className="text-xs font-mono text-[#1d4231] hover:underline inline-flex items-center">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Return to Corridors Directory
          </Link>
        </div>
      </>
    )
  }

  const mapFeature: MapFeature = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: road.coords
        ? road.coords.map((c) => [c[1], c[0]])
        : [
            [road.start_lon, road.start_lat],
            [road.end_lon, road.end_lat],
          ],
    },
    properties: {
      segment_id: road.segment_id,
      road_name: road.road_name,
      sub_name: road.sub_name,
      length_km: road.length_km,
      road_type: road.road_type,
      authority_id: road.authority_id,
      authority_name: road.authority_name,
      authority: road.authority_name,
      risk_score: road.current_week?.risk_score || 0,
      grade: road.current_week?.grade || "C",
      pothole_count: road.current_week?.pothole_count || 0,
      severity_avg: road.current_week?.severity_avg || 0,
      status: road.current_week?.status || "none",
      weekly_change: road.current_week?.weekly_change || null,
    },
  }

  const chartData = (road.weeks || []).map((w) => ({
    week: `W${w.week}`,
    risk_score: w.risk_score,
    potholes: w.pothole_count,
    severity: w.severity_avg,
    density: w.density,
    grade: w.grade,
  }))

  return (
    <>
      <Topbar title={`Corridor Forensics · ${road.road_name} (${road.segment_id})`} />

      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#ded7cb]">
          <div>
            <Link
              href="/roads"
              className="text-xs font-mono text-[#1d4231] hover:underline inline-flex items-center mb-1"
            >
              <ArrowLeft className="h-3 w-3 mr-1" /> Back to Roads Directory
            </Link>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#12271c]">{road.road_name}</h2>
              <span className="font-mono text-xs bg-[#ede7dc] text-[#1d4231] px-2 py-0.5 rounded font-bold">
                {road.segment_id}
              </span>
            </div>
            <p className="text-xs text-[#506457]">{road.sub_name} · {road.length_km.toFixed(1)} km · Ward: {road.ward || 'Central'}</p>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
              road.current_week?.grade === 'E' ? 'bg-[#faecea] text-[#912d1e] border-[#f0c0b8]' :
              road.current_week?.grade === 'D' ? 'bg-[#faece8] text-[#9b3a1a] border-[#f2c3b8]' :
              road.current_week?.grade === 'C' ? 'bg-[#fef4e5] text-[#8c5610] border-[#f6d7ab]' :
              'bg-[#e6f4ea] text-[#1e5d3a] border-[#bde0ca]'
            }`}>
              Grade {road.current_week?.grade || 'C'} ({road.current_week?.risk_score.toFixed(1) || '0.0'})
            </span>
            <span className="text-xs font-mono bg-[#ede7dc] text-[#12271c] px-2.5 py-1 rounded border border-[#ded7cb]">
              {road.authority_name}
            </span>
          </div>
        </div>

        {/* Top Forensic Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#faf8f4] p-4 rounded-xl border border-[#ded7cb] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Current Risk Score
            </span>
            <div className="text-2xl font-mono font-extrabold text-[#12271c] mt-1">
              {road.current_week?.risk_score.toFixed(1) || '0.0'}
            </div>
            <span className="text-[10px] text-[#506457] font-mono">0 - 100 Index</span>
          </div>

          <div className="bg-[#faf8f4] p-4 rounded-xl border border-[#ded7cb] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Pothole Density
            </span>
            <div className="text-2xl font-mono font-extrabold text-[#12271c] mt-1">
              {road.current_week?.density.toFixed(1) || '0.0'}/km
            </div>
            <span className="text-[10px] text-[#506457] font-mono">
              {road.current_week?.pothole_count || 0} defects detected
            </span>
          </div>

          <div className="bg-[#faf8f4] p-4 rounded-xl border border-[#ded7cb] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Average Severity
            </span>
            <div className="text-2xl font-mono font-extrabold text-[#a86c18] mt-1">
              {road.current_week?.severity_avg.toFixed(1) || '0.0'} / 5.0
            </div>
            <span className="text-[10px] text-[#506457] font-mono">Visual size proxy</span>
          </div>

          <div className="bg-[#faf8f4] p-4 rounded-xl border border-[#ded7cb] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Average Defect Depth
            </span>
            <div className="text-2xl font-mono font-extrabold text-[#1d4231] mt-1">
              {road.current_week?.depth_avg_cm ? `${road.current_week.depth_avg_cm.toFixed(1)} cm` : 'N/A'}
            </div>
            <span className="text-[10px] text-[#506457] font-mono">Optical monocular</span>
          </div>
        </div>

        {/* 4-Week Progression Chart & Mini Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Recharts Timeline (8 Cols) */}
          <div className="lg:col-span-8 bg-[#faf8f4] rounded-xl p-5 border border-[#ded7cb] shadow-sm flex flex-col justify-between">
            <div className="pb-3 border-b border-[#ded7cb] flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#506457] block mb-0.5">
                  Deterioration Curve
                </span>
                <h3 className="text-sm font-semibold text-[#12271c]">
                  4-Week Multi-Survey Risk Progression
                </h3>
              </div>
              <span className="text-xs font-mono text-[#506457]">Weekly Cycles</span>
            </div>

            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ded7cb" />
                  <XAxis dataKey="week" stroke="#506457" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                  <YAxis stroke="#506457" domain={[0, 100]} tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#faf8f4', 
                      borderColor: '#ded7cb', 
                      borderRadius: '8px', 
                      fontSize: '11px',
                      color: '#12271c'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Line 
                    type="monotone" 
                    dataKey="risk_score" 
                    name="Risk Score" 
                    stroke="#1d4231" 
                    strokeWidth={2.5} 
                    dot={{ fill: '#1d4231', r: 4 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="potholes" 
                    name="Defect Count" 
                    stroke="#a86c18" 
                    strokeWidth={2} 
                    dot={{ fill: '#a86c18', r: 3 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mini GIS Map (4 Cols) */}
          <div className="lg:col-span-4 bg-[#faf8f4] rounded-xl p-5 border border-[#ded7cb] shadow-sm flex flex-col justify-between space-y-3">
            <div className="pb-2 border-b border-[#ded7cb]">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#506457] block mb-0.5">
                GIS Segment Polyline
              </span>
              <h3 className="text-sm font-semibold text-[#12271c]">Geospatial Carriageway</h3>
            </div>

            <div className="h-48 w-full rounded-lg overflow-hidden border border-[#ded7cb]">
              <MapComponent features={[mapFeature]} height="100%" interactive={false} autoFitBounds={true} />
            </div>

            <div className="text-[11px] font-mono text-[#506457] flex justify-between">
              <span>Start: {road.start_lat.toFixed(4)}, {road.start_lon.toFixed(4)}</span>
              <span>End: {road.end_lat.toFixed(4)}, {road.end_lon.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Forensic Evidence Table */}
        <div className="bg-[#faf8f4] rounded-xl p-5 border border-[#ded7cb] shadow-sm">
          <div className="pb-3 border-b border-[#ded7cb] flex justify-between items-center">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#506457] block mb-0.5">
                AI Inference Log
              </span>
              <h3 className="text-sm font-semibold text-[#12271c]">
                Pothole Optical Detections (YOLOv8)
              </h3>
            </div>
            <span className="text-xs font-mono text-[#506457]">
              {road.detections?.length || 0} Detections Logged
            </span>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#f4efe6] text-[10px] text-[#506457] uppercase tracking-wider border-b border-[#ded7cb]">
                  <th className="py-2.5 px-3">Detection ID</th>
                  <th className="py-2.5 px-3">Frame</th>
                  <th className="py-2.5 px-3">GPS Latitude / Longitude</th>
                  <th className="py-2.5 px-3">Visual Severity</th>
                  <th className="py-2.5 px-3">Model Confidence</th>
                  <th className="py-2.5 px-3">Depth Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede7dc]">
                {road.detections && road.detections.length > 0 ? (
                  road.detections.slice(0, 8).map((det: any) => (
                    <tr key={det.detection_id} className="hover:bg-[#f4efe6] transition-colors">
                      <td className="py-2.5 px-3 text-[#1d4231] font-bold truncate max-w-[120px]">
                        {det.detection_id}
                      </td>
                      <td className="py-2.5 px-3 text-[#12271c]">
                        Frame {det.frame_number ?? 'Key'}
                      </td>
                      <td className="py-2.5 px-3 text-[#506457]">
                        {det.latitude?.toFixed(4)}, {det.longitude?.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          det.severity_label === 'High' ? 'bg-[#faecea] text-[#912d1e] border-[#f0c0b8]' :
                          det.severity_label === 'Medium' ? 'bg-[#fef4e5] text-[#8c5610] border-[#f6d7ab]' :
                          'bg-[#e6f4ea] text-[#1e5d3a] border-[#bde0ca]'
                        }`}>
                          {det.severity_label || 'Moderate'} ({det.severity?.toFixed(1) || '0.0'})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#1d4231] font-bold">
                        {Math.round((det.confidence || 0.85) * 100)}%
                      </td>
                      <td className="py-2.5 px-3 text-[#506457]">
                        {det.depth_cm ? `${det.depth_cm} cm` : 'Optical 2D'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#506457]">
                      No individual optical detections logged for this segment.
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
