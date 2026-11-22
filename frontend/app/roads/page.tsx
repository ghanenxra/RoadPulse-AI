"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Topbar } from "@/components/layout/Topbar"
import { api } from "@/lib/api"
import { RoadSegment } from "@/types"
import { useWeek } from "@/context/WeekContext"
import { 
  Search, Filter, ArrowUpDown, ChevronRight, MapPin, 
  AlertCircle, CheckCircle2, Shield, RefreshCw 
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function RoadsDirectoryPage() {
  const { week } = useWeek()
  const [roads, setRoads] = useState<RoadSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedAuth, setSelectedAuth] = useState("all")
  const [selectedGrade, setSelectedGrade] = useState("all")
  const [sortField, setSortField] = useState<"risk" | "potholes" | "name">("risk")
  const [sortAsc, setSortAsc] = useState(false)

  const fetchRoads = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getRoads(week)
      setRoads(data)
    } catch (err) {
      console.error("Failed to load corridors:", err)
    } finally {
      setLoading(false)
    }
  }, [week])

  useEffect(() => {
    fetchRoads()
  }, [fetchRoads])

  const filteredRoads = React.useMemo(() => {
    return roads
      .filter((r) => {
        const matchesSearch =
          r.road_name.toLowerCase().includes(search.toLowerCase()) ||
          r.sub_name.toLowerCase().includes(search.toLowerCase()) ||
          r.segment_id.toLowerCase().includes(search.toLowerCase())
        const matchesAuth = selectedAuth === "all" || r.authority_id === selectedAuth
        const matchesGrade = selectedGrade === "all" || r.current_week?.grade === selectedGrade
        return matchesSearch && matchesAuth && matchesGrade
      })
      .sort((a, b) => {
        let valA: any = 0
        let valB: any = 0
        if (sortField === "risk") {
          valA = a.current_week?.risk_score ?? 0
          valB = b.current_week?.risk_score ?? 0
        } else if (sortField === "potholes") {
          valA = a.current_week?.pothole_count ?? 0
          valB = b.current_week?.pothole_count ?? 0
        } else {
          valA = a.road_name
          valB = b.road_name
        }
        if (valA < valB) return sortAsc ? -1 : 1
        if (valA > valB) return sortAsc ? 1 : -1
        return 0
      })
  }, [roads, search, selectedAuth, selectedGrade, sortField, sortAsc])

  const authorities = React.useMemo(() => {
    const map = new Map<string, string>()
    roads.forEach((r) => {
      if (r.authority_id && r.authority_name) {
        map.set(r.authority_id, r.authority_name)
      }
    })
    return Array.from(map.entries())
  }, [roads])

  return (
    <>
      <Topbar title="Transit Corridors & Forensic Directory" />

      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Metric Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#faf8f4] p-3.5 rounded-xl border border-[#ded7cb] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Monitored Corridors
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[#12271c] mt-0.5">
              {roads.length}
            </div>
            <span className="text-[10px] text-[#207246] font-mono">100% route coverage</span>
          </div>

          <div className="bg-[#faf8f4] p-3.5 rounded-xl border border-[#ded7cb] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Total Deduplicated Potholes
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[#12271c] mt-0.5">
              {roads.reduce((acc, r) => acc + (r.current_week?.pothole_count || 0), 0)}
            </div>
            <span className="text-[10px] text-[#506457] font-mono">DBSCAN merged</span>
          </div>

          <div className="bg-[#faf8f4] p-3.5 rounded-xl border border-[#ded7cb] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Dangerous Corridors
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[#912d1e] mt-0.5">
              {roads.filter((r) => ['D', 'E'].includes(r.current_week?.grade || '')).length}
            </div>
            <span className="text-[10px] text-[#912d1e] font-mono">Grade D and E</span>
          </div>

          <div className="bg-[#faf8f4] p-3.5 rounded-xl border border-[#ded7cb] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#506457]">
              Average Risk Score
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[#1d4231] mt-0.5">
              {(roads.reduce((acc, r) => acc + (r.current_week?.risk_score || 0), 0) / Math.max(roads.length, 1)).toFixed(1)}
            </div>
            <span className="text-[10px] text-[#506457] font-mono">Formula weighted</span>
          </div>
        </div>

        {/* Directory Table Card */}
        <div className="bg-[#faf8f4] rounded-xl border border-[#ded7cb] shadow-sm overflow-hidden">
          
          {/* Controls Header */}
          <div className="p-4 border-b border-[#ded7cb] flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-[#faf8f4]">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#506457]" />
              <input
                type="text"
                placeholder="Search road name, stretch, or corridor ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#f4efe6] border border-[#ded7cb] rounded-lg text-xs font-sans text-[#12271c] placeholder:text-[#83978a] focus:outline-none focus:ring-1 focus:ring-[#1d4231]"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-40 sm:w-48">
                <Select value={selectedAuth} onValueChange={setSelectedAuth}>
                  <SelectTrigger className="h-8 text-xs bg-[#f4efe6] border-[#ded7cb] text-[#12271c]">
                    <SelectValue placeholder="All Authorities" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] text-xs">
                    <SelectItem value="all">All Authorities</SelectItem>
                    {authorities.map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-32">
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger className="h-8 text-xs bg-[#f4efe6] border-[#ded7cb] text-[#12271c]">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] text-xs">
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="A">Grade A</SelectItem>
                    <SelectItem value="B">Grade B</SelectItem>
                    <SelectItem value="C">Grade C</SelectItem>
                    <SelectItem value="D">Grade D</SelectItem>
                    <SelectItem value="E">Grade E</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <button
                onClick={fetchRoads}
                className="p-1.5 bg-[#f4efe6] border border-[#ded7cb] rounded-lg text-[#506457] hover:text-[#12271c] hover:bg-[#ede7dc] transition-colors"
                title="Refresh Directory"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#f4efe6] text-[10px] text-[#506457] uppercase tracking-wider border-b border-[#ded7cb]">
                  <th 
                    className="py-3 px-3 cursor-pointer hover:text-[#12271c]"
                    onClick={() => {
                      if (sortField === "name") setSortAsc(!sortAsc)
                      else { setSortField("name"); setSortAsc(true) }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Corridor & Stretch</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Jurisdiction</th>
                  <th className="py-3 px-3 text-center">Grade</th>
                  <th 
                    className="py-3 px-3 text-right cursor-pointer hover:text-[#12271c]"
                    onClick={() => {
                      if (sortField === "risk") setSortAsc(!sortAsc)
                      else { setSortField("risk"); setSortAsc(false) }
                    }}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Risk Score</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-3 text-right cursor-pointer hover:text-[#12271c]"
                    onClick={() => {
                      if (sortField === "potholes") setSortAsc(!sortAsc)
                      else { setSortField("potholes"); setSortAsc(false) }
                    }}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Defects</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">Avg Severity</th>
                  <th className="py-3 px-3 text-right">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede7dc]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#506457]">
                      Loading corridor directory...
                    </td>
                  </tr>
                ) : filteredRoads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#506457]">
                      No road corridors match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRoads.map((road) => (
                    <tr key={road.segment_id} className="hover:bg-[#f4efe6] transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#1d4231] font-mono">
                            {road.segment_id}
                          </span>
                          <div>
                            <div className="font-sans font-semibold text-[#12271c]">
                              {road.road_name}
                            </div>
                            <div className="text-[11px] text-[#506457] font-sans">
                              {road.sub_name} · {road.length_km.toFixed(1)} km
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-sans text-[#506457] text-[11px]">
                        {road.authority_name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          road.current_week?.grade === 'E' ? 'bg-[#faecea] text-[#912d1e] border-[#f0c0b8]' :
                          road.current_week?.grade === 'D' ? 'bg-[#faece8] text-[#9b3a1a] border-[#f2c3b8]' :
                          road.current_week?.grade === 'C' ? 'bg-[#fef4e5] text-[#8c5610] border-[#f6d7ab]' :
                          road.current_week?.grade === 'B' ? 'bg-[#eef8eb] text-[#2f6f34] border-[#cbe8c6]' :
                          'bg-[#e6f4ea] text-[#1e5d3a] border-[#bde0ca]'
                        }`}>
                          Grade {road.current_week?.grade || 'C'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#12271c]">
                        {road.current_week?.risk_score.toFixed(1) || '0.0'}
                      </td>
                      <td className="py-3 px-3 text-right text-[#506457]">
                        {road.current_week?.pothole_count || 0}
                      </td>
                      <td className="py-3 px-3 text-right text-[#506457]">
                        {road.current_week?.severity_avg.toFixed(1) || '0.0'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-[10px] capitalize text-[#506457] bg-[#ede7dc] px-2 py-0.5 rounded font-sans font-medium">
                          {(road.current_week?.status || 'none').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Link
                          href={`/roads/${road.segment_id}`}
                          className="px-2.5 py-1 bg-[#1d4231] hover:bg-[#153325] text-[#faf8f4] font-semibold text-[11px] rounded transition-colors inline-flex items-center space-x-1"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </>
  )
}
