"use client"

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { RoadSegment } from '@/types'
import { getGradeColor } from '@/lib/utils'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Search, Route, ArrowRight, Loader2, Calendar } from 'lucide-react'
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
      <Topbar title="Road Segments Directory" />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Cycle: Week {week}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {filteredRoads.length} Active Corridors
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              Monitored Urban Arterial Corridors
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Search by road or ID..." 
              className="pl-9 text-xs sm:text-sm h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Table Card */}
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600 mb-2" />
                <span className="text-sm font-medium">Loading road inventory for Week {week}...</span>
              </div>
            ) : filteredRoads.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No road segments match your search query.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 sm:px-6 py-3">Corridor &amp; Stretch</th>
                      <th className="px-3 sm:px-4 py-3">ID</th>
                      <th className="px-3 sm:px-4 py-3">Grade</th>
                      <th className="px-3 sm:px-4 py-3">Risk Index</th>
                      <th className="px-3 sm:px-4 py-3">Potholes</th>
                      <th className="px-3 sm:px-4 py-3 hidden md:table-cell">Authority</th>
                      <th className="px-3 sm:px-4 py-3">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoads.map(road => (
                      <tr key={road.segment_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 sm:px-6 py-3.5 font-medium">
                          <div className="text-slate-900 font-semibold">{road.road_name}</div>
                          <div className="text-[11px] text-slate-500 font-normal line-clamp-1">{road.sub_name}</div>
                        </td>
                        <td className="px-3 sm:px-4 py-3.5 text-slate-500 font-mono text-xs">
                          {road.segment_id}
                        </td>
                        <td className="px-3 sm:px-4 py-3.5">
                          <Badge style={{ backgroundColor: getGradeColor(road.current_week.grade), color: 'white' }}>
                            Grade {road.current_week.grade}
                          </Badge>
                        </td>
                        <td className="px-3 sm:px-4 py-3.5 font-bold text-slate-900">
                          {road.current_week.risk_score.toFixed(1)}
                        </td>
                        <td className="px-3 sm:px-4 py-3.5 font-medium text-slate-700">
                          {road.current_week.pothole_count}
                        </td>
                        <td className="px-3 sm:px-4 py-3.5 text-slate-600 hidden md:table-cell text-xs">
                          {road.authority_name.replace('Jaipur Municipal Corporation', 'JMC')}
                        </td>
                        <td className="px-3 sm:px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            road.current_week.status === 'overdue' 
                              ? 'bg-rose-100 text-rose-800' 
                              : road.current_week.status === 'reported'
                              ? 'bg-blue-100 text-blue-800'
                              : road.current_week.status === 'repaired' || road.current_week.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {road.current_week.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3.5 text-right">
                          <Link 
                            href={`/roads/${road.segment_id}`} 
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold text-xs"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
