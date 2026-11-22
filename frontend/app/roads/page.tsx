"use client"

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { RoadSegment } from '@/types'
import { getGradeColor } from '@/lib/utils'
import Link from 'next/link'
import { Search, ArrowRight, Loader2, Calendar, Route } from 'lucide-react'
import { useWeek } from '@/context/WeekContext'

export default function RoadsPage() {
  const { week } = useWeek()
  const [roads, setRoads] = useState<RoadSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const data = await api.getRoads(week)
        setRoads(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [week])

  const filteredRoads = roads.filter(r => 
    r.road_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.sub_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.segment_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      <Topbar title="Corridor Health Inventory" />

      <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] p-4 sm:p-5 rounded-xl border border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
                Cycle {week} Registry
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {filteredRoads.length} Active Corridors Logged
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 mt-1">
              Monitored Urban Arterial Transit Network
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous municipal road segment grading derived from bus-mounted vision telemetry.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input 
              type="text" 
              placeholder="Search by corridor name or ID..." 
              className="pl-9 text-xs h-9 bg-slate-950 border-slate-800 text-slate-100 font-mono focus:border-sky-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Table Container */}
        <div className="bg-[#0f172a] rounded-xl border border-slate-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center font-mono">
              <Loader2 className="h-6 w-6 animate-spin text-sky-400 mb-2" />
              <span className="text-xs">Loading corridor index for Cycle {week}...</span>
            </div>
          ) : filteredRoads.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs font-mono">
              No road segments match your query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-950/60 border-b border-slate-800">
                    <th className="px-4 py-3">Corridor Stretch</th>
                    <th className="px-3 py-3">Segment ID</th>
                    <th className="px-3 py-3 text-center">Grade</th>
                    <th className="px-3 py-3 text-right">Risk Score</th>
                    <th className="px-3 py-3 text-right">Potholes</th>
                    <th className="px-4 py-3 hidden md:table-cell">Civic Authority</th>
                    <th className="px-3 py-3">Workflow Status</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRoads.map(road => road.current_week && (
                    <tr key={road.segment_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-sans">
                        <div className="text-slate-100 font-semibold">{road.road_name}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{road.sub_name}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-400 text-xs">
                        {road.segment_id}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          road.current_week.grade === 'E' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                          road.current_week.grade === 'D' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                          road.current_week.grade === 'C' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          Grade {road.current_week.grade}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-100 text-sm">
                        {road.current_week.risk_score.toFixed(1)}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-300">
                        {road.current_week.pothole_count}
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell text-xs font-sans truncate max-w-[150px]">
                        {road.authority_name.replace('Jaipur Municipal Corporation', 'JMC')}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          road.current_week.status === 'overdue' 
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                            : road.current_week.status === 'reported'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : road.current_week.status === 'repaired' || road.current_week.status === 'verified'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {road.current_week.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link 
                          href={`/roads/${road.segment_id}`} 
                          className="inline-flex items-center text-sky-400 hover:text-sky-300 font-sans font-semibold text-xs"
                        >
                          <span>Forensics</span>
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
