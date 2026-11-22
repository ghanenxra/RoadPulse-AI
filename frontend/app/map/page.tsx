"use client"

import React, { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Topbar } from "@/components/layout/Topbar"
import { api } from "@/lib/api"
import { MapFeature } from "@/types"
import { useWeek } from "@/context/WeekContext"
import { 
  Filter, Layers, Info, Navigation, Shield, AlertTriangle, 
  RefreshCw, CheckCircle2, ChevronRight, X 
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const MapComponent = dynamic(
  () => import("@/components/MapComponent"),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#ede7dc] text-[#506457] font-mono text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-[#1d4231] border-t-transparent animate-spin mb-3" />
        <span>Initializing CartoDB Voyager GIS Canvas...</span>
      </div>
    ) 
  }
)

export default function MapPage() {
  const { week } = useWeek()
  const [features, setFeatures] = useState<MapFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAuthority, setSelectedAuthority] = useState<string>("all")
  const [selectedGrade, setSelectedGrade] = useState<string>("all")
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const fetchMapData = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getMapData(week)
      setFeatures(data.features || [])
    } catch (err) {
      console.error("Failed to load map data:", err)
    } finally {
      setLoading(false)
    }
  }, [week])

  useEffect(() => {
    fetchMapData()
  }, [fetchMapData])

  const filteredFeatures = React.useMemo(() => {
    return features.filter((f) => {
      const auth = f.properties.authority || f.properties.authority_name || ""
      if (selectedAuthority !== "all" && auth !== selectedAuthority) {
        return false
      }
      if (selectedGrade !== "all" && f.properties.grade !== selectedGrade) {
        return false
      }
      return true
    })
  }, [features, selectedAuthority, selectedGrade])

  const authorityOptions = React.useMemo(() => {
    const set = new Set<string>()
    features.forEach((f) => {
      const auth = f.properties.authority || f.properties.authority_name
      if (auth) {
        set.add(auth)
      }
    })
    return Array.from(set).sort()
  }, [features])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f5f2eb]">
      <Topbar title="GIS Road Health Cartography" />

      <div className="relative flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden">
        
        {/* Full-bleed Leaflet Map */}
        <MapComponent features={filteredFeatures} height="100%" interactive={true} />

        {/* Floating Telemetry & Filters HUD */}
        <div className="absolute top-3 left-3 right-3 sm:right-auto sm:left-4 z-20 flex flex-col space-y-2 pointer-events-none">
          <div className="bg-[#faf8f4]/95 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-[#ded7cb] shadow-lg pointer-events-auto w-full sm:w-96 text-xs font-mono">
            
            <div className="flex items-center justify-between pb-2.5 border-b border-[#ded7cb]">
              <div className="flex items-center space-x-2">
                <Navigation className="h-4 w-4 text-[#1d4231]" />
                <span className="font-bold text-[#12271c] font-sans text-sm">Jaipur Transit GIS</span>
              </div>
              <span className="text-[10px] bg-[#ede7dc] text-[#1d4231] px-2 py-0.5 rounded font-bold uppercase">
                Week {week}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 my-2.5 text-center">
              <div className="bg-[#f4efe6] p-2 rounded-lg border border-[#ded7cb]">
                <div className="text-[9px] text-[#506457] uppercase">Corridors</div>
                <div className="text-base font-bold text-[#12271c] mt-0.5">{filteredFeatures.length}</div>
              </div>
              <div className="bg-[#f4efe6] p-2 rounded-lg border border-[#ded7cb]">
                <div className="text-[9px] text-[#506457] uppercase">Defects</div>
                <div className="text-base font-bold text-[#12271c] mt-0.5">
                  {filteredFeatures.reduce((acc, f) => acc + (f.properties.pothole_count || 0), 0)}
                </div>
              </div>
              <div className="bg-[#f4efe6] p-2 rounded-lg border border-[#ded7cb]">
                <div className="text-[9px] text-[#912d1e] uppercase">Dangerous</div>
                <div className="text-base font-bold text-[#912d1e] mt-0.5">
                  {filteredFeatures.filter((f) => ['D', 'E'].includes(f.properties.grade)).length}
                </div>
              </div>
            </div>

            {/* Filter Trigger on Mobile, Direct on Desktop */}
            <div className="hidden sm:grid grid-cols-2 gap-2 pt-2 border-t border-[#ded7cb]">
              <div>
                <label className="text-[9px] text-[#506457] block mb-1 uppercase font-semibold">
                  Authority
                </label>
                <Select value={selectedAuthority} onValueChange={setSelectedAuthority}>
                  <SelectTrigger className="h-7 text-[11px] bg-[#f4efe6] border-[#ded7cb] text-[#12271c]">
                    <SelectValue placeholder="All Authorities" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] text-xs">
                    <SelectItem value="all">All Authorities</SelectItem>
                    {authorityOptions.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[9px] text-[#506457] block mb-1 uppercase font-semibold">
                  Grade Spectrum
                </label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger className="h-7 text-[11px] bg-[#f4efe6] border-[#ded7cb] text-[#12271c]">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] text-xs">
                    <SelectItem value="all">All Grades (A - E)</SelectItem>
                    <SelectItem value="A">Grade A (Pristine)</SelectItem>
                    <SelectItem value="B">Grade B (Minor Wear)</SelectItem>
                    <SelectItem value="C">Grade C (Moderate)</SelectItem>
                    <SelectItem value="D">Grade D (High Risk)</SelectItem>
                    <SelectItem value="E">Grade E (Hazardous)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mobile Filter Toggle */}
            <div className="sm:hidden pt-1">
              <button
                onClick={() => setFilterDrawerOpen(true)}
                className="w-full flex items-center justify-center space-x-1 py-1.5 bg-[#f4efe6] border border-[#ded7cb] rounded-lg text-xs font-semibold text-[#12271c]"
              >
                <Filter className="h-3 w-3" />
                <span>Filter Map Layers</span>
              </button>
            </div>

          </div>
        </div>

        {/* Floating Condition Legend HUD */}
        <div className="absolute bottom-4 left-3 sm:left-4 z-20 pointer-events-auto">
          <div className="bg-[#faf8f4]/95 backdrop-blur-md rounded-xl p-3 border border-[#ded7cb] shadow-lg text-[10px] font-mono space-y-1.5">
            <div className="text-[9px] uppercase tracking-wider text-[#506457] font-bold">Condition Rating</div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-1.5 rounded-full bg-[#207246]" />
              <span className="text-[#12271c]">Grade A (0 - 20) Pristine</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-1.5 rounded-full bg-[#3d8e57]" />
              <span className="text-[#12271c]">Grade B (21 - 40) Minor Wear</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-1.5 rounded-full bg-[#c2822a]" />
              <span className="text-[#12271c]">Grade C (41 - 60) Moderate</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-1.5 rounded-full bg-[#c05621]" />
              <span className="text-[#12271c]">Grade D (61 - 80) High Risk</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-1.5 rounded-full bg-[#9e3427]" />
              <span className="text-[#912d1e] font-bold">Grade E (81 - 100) Hazardous</span>
            </div>
          </div>
        </div>

      </div>

      {/* Mobile Filters Drawer */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden bg-black/40 backdrop-blur-xs">
          <div className="bg-[#faf8f4] border-t border-[#ded7cb] rounded-t-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#ded7cb]">
              <h3 className="text-sm font-bold text-[#12271c]">Filter Map Corridors</h3>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="p-1 rounded-md text-[#506457] hover:bg-[#ede7dc]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#506457] block mb-1 uppercase font-semibold">
                  Responsible Jurisdiction
                </label>
                <Select value={selectedAuthority} onValueChange={setSelectedAuthority}>
                  <SelectTrigger className="w-full bg-[#f4efe6] border-[#ded7cb] text-[#12271c] text-xs">
                    <SelectValue placeholder="All Authorities" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] text-xs">
                    <SelectItem value="all">All Authorities</SelectItem>
                    {authorityOptions.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-[#506457] block mb-1 uppercase font-semibold">
                  Condition Rating Grade
                </label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger className="w-full bg-[#f4efe6] border-[#ded7cb] text-[#12271c] text-xs">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] text-xs">
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="A">Grade A (Pristine)</SelectItem>
                    <SelectItem value="B">Grade B (Minor Wear)</SelectItem>
                    <SelectItem value="C">Grade C (Moderate)</SelectItem>
                    <SelectItem value="D">Grade D (High Risk)</SelectItem>
                    <SelectItem value="E">Grade E (Hazardous)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <button
              onClick={() => setFilterDrawerOpen(false)}
              className="w-full py-2.5 bg-[#1d4231] hover:bg-[#153325] text-[#faf8f4] text-xs font-semibold rounded-lg shadow-sm"
            >
              Apply Filter Selection
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
