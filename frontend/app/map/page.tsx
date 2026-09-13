"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { api } from '@/lib/api'
import { MapFeature } from '@/types'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, RotateCcw, Loader2, Filter, X 
} from 'lucide-react'
import { useWeek } from '@/context/WeekContext'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-slate-500 bg-slate-100">
      <Loader2 className="h-6 w-6 animate-spin mr-2 text-blue-600" />
      Loading geospatial road network...
    </div>
  )
})

export default function MapPage() {
  const { week } = useWeek()
  const [allFeatures, setAllFeatures] = useState<MapFeature[]>([])
  const [selectedGrades, setSelectedGrades] = useState<Record<string, boolean>>({
    A: true, B: true, C: true, D: true, E: true
  })
  const [selectedAuthority, setSelectedAuthority] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [worseningOnly, setWorseningOnly] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  async function loadMap(currentWeek: number) {
    try {
      setLoading(true)
      const data = await api.getMapData(currentWeek)
      if (data && data.features) {
        setAllFeatures(data.features)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMap(week)
  }, [week])

  const toggleGrade = (grade: string) => {
    setSelectedGrades(prev => ({ ...prev, [grade]: !prev[grade] }))
  }

  const resetFilters = () => {
    setSelectedGrades({ A: true, B: true, C: true, D: true, E: true })
    setSelectedAuthority('all')
    setSearchTerm('')
    setWorseningOnly(false)
  }

  const filteredFeatures = useMemo(() => {
    return allFeatures.filter(f => {
      const p = f.properties
      if (!selectedGrades[p.grade]) return false
      if (selectedAuthority !== 'all' && !p.authority.toLowerCase().includes(selectedAuthority.toLowerCase())) {
        return false
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchName = p.road_name.toLowerCase().includes(term)
        const matchSub = p.sub_name.toLowerCase().includes(term)
        const matchId = p.segment_id.toLowerCase().includes(term)
        if (!matchName && !matchSub && !matchId) return false
      }
      if (worseningOnly && p.weekly_change <= 0) return false
      return true
    })
  }, [allFeatures, selectedGrades, selectedAuthority, searchTerm, worseningOnly])

  const filterContent = (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b">
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Geospatial Filters</h2>
          <p className="text-xs text-slate-500">Survey Cycle: Week {week}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-7 text-blue-600 px-2">
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      {/* Search Input */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Search Corridor</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <Input 
            placeholder="e.g. Tonk Road, TR-01..." 
            className="pl-8 text-xs h-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grade Filters */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Condition Grade (A–E)</label>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {[
            { grade: 'A', label: 'Grade A (<20)', color: 'bg-emerald-500' },
            { grade: 'B', label: 'Grade B (21-40)', color: 'bg-lime-500' },
            { grade: 'C', label: 'Grade C (41-60)', color: 'bg-amber-500' },
            { grade: 'D', label: 'Grade D (61-80)', color: 'bg-orange-500' },
            { grade: 'E', label: 'Grade E (81+)', color: 'bg-rose-500' },
          ].map(item => (
            <label key={item.grade} className="flex items-center space-x-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedGrades[item.grade]} 
                onChange={() => toggleGrade(item.grade)}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
              <span className="text-[11px] font-medium text-slate-700">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Authority Filter */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Responsible Authority</label>
        <select 
          className="w-full text-xs h-8 rounded-md border border-input bg-background px-2 py-1"
          value={selectedAuthority}
          onChange={(e) => setSelectedAuthority(e.target.value)}
        >
          <option value="all">All Authorities</option>
          <option value="JMC Greater">JMC Greater</option>
          <option value="JMC Heritage">JMC Heritage</option>
          <option value="PWD">PWD Rajasthan</option>
          <option value="JDA">Jaipur Development Authority</option>
        </select>
      </div>

      {/* Worsening Toggle */}
      <div>
        <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
          <input 
            type="checkbox" 
            checked={worseningOnly}
            onChange={(e) => setWorseningOnly(e.target.checked)}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="font-medium">Show only deteriorating roads</span>
        </label>
      </div>

      {/* Result Count Summary */}
      <div className="pt-2 border-t text-xs text-slate-500 flex justify-between items-center">
        <span>Showing:</span>
        <span className="font-semibold text-slate-900">{filteredFeatures.length} of {allFeatures.length} segments</span>
      </div>

      {showMobileFilters && (
        <Button 
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-xs h-9 text-white"
          onClick={() => setShowMobileFilters(false)}
        >
          Apply &amp; View Map
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Road Health Map" />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-72 lg:w-80 shrink-0 border-r bg-white flex-col z-10">
          {filterContent}
        </aside>

        {/* Mobile Filter Toggle Button */}
        <button
          onClick={() => setShowMobileFilters(true)}
          className="md:hidden absolute top-3 left-3 z-[1000] bg-white text-slate-800 shadow-md border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center space-x-1.5 hover:bg-slate-50"
        >
          <Filter className="h-3.5 w-3.5 text-blue-600" />
          <span>Filters ({filteredFeatures.length})</span>
        </button>

        {/* Mobile Filter Slide-over Drawer */}
        {showMobileFilters && (
          <div className="md:hidden fixed inset-0 z-[2000] flex">
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setShowMobileFilters(false)}
            />
            <div className="relative w-full max-w-xs bg-white h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between p-3 border-b bg-slate-50">
                <span className="font-bold text-sm text-slate-800">Map Filters</span>
                <button 
                  onClick={() => setShowMobileFilters(false)}
                  className="p-1 rounded-md text-slate-500 hover:text-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filterContent}
              </div>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div className="flex-1 bg-slate-100 relative h-full">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500 bg-slate-100">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-blue-600" />
              Loading map data for Week {week}...
            </div>
          ) : (
            <MapComponent features={filteredFeatures} />
          )}
          
          {/* Map Legend */}
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-xs p-2.5 sm:p-3.5 rounded-lg shadow-lg border border-slate-200 z-[1000] text-xs max-w-[210px] sm:max-w-xs pointer-events-auto">
            <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between">
              <span className="text-xs">Condition Grade</span>
              <span className="text-[10px] text-blue-600 font-semibold">Week {week}</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-3 h-3 bg-emerald-500 rounded mr-1.5"></span>A (Good)</span>
                <span className="text-gray-400 font-mono text-[10px]">0–20</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-3 h-3 bg-lime-500 rounded mr-1.5"></span>B (Fair)</span>
                <span className="text-gray-400 font-mono text-[10px]">21–40</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-3 h-3 bg-amber-500 rounded mr-1.5"></span>C (Moderate)</span>
                <span className="text-gray-400 font-mono text-[10px]">41–60</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-3 h-3 bg-orange-500 rounded mr-1.5"></span>D (Poor)</span>
                <span className="text-gray-400 font-mono text-[10px]">61–80</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-3 h-3 bg-rose-500 rounded mr-1.5"></span>E (Dangerous)</span>
                <span className="text-gray-400 font-mono text-[10px]">81–100</span>
              </div>
            </div>
            <div className="text-[10px] text-gray-400 mt-1.5 pt-1 border-t hidden sm:block">
              Click segment for detail &amp; 4-week timeline
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
