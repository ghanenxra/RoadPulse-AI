"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { api } from '@/lib/api'
import { MapFeature } from '@/types'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, RotateCcw, Loader2 
} from 'lucide-react'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-slate-500 bg-slate-100">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      Loading geospatial road network...
    </div>
  )
})

export default function MapPage() {
  const [allFeatures, setAllFeatures] = useState<MapFeature[]>([])
  const [selectedWeek, setSelectedWeek] = useState<number>(4)
  const [selectedGrades, setSelectedGrades] = useState<Record<string, boolean>>({
    A: true, B: true, C: true, D: true, E: true
  })
  const [selectedAuthority, setSelectedAuthority] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [worseningOnly, setWorseningOnly] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)

  async function loadMap(week: number) {
    try {
      setLoading(true)
      const data = await api.getMapData(week)
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
    loadMap(selectedWeek)
  }, [selectedWeek])

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
        const query = searchTerm.toLowerCase()
        const match = p.road_name.toLowerCase().includes(query) || 
                      p.sub_name.toLowerCase().includes(query) || 
                      p.segment_id.toLowerCase().includes(query)
        if (!match) return false
      }
      if (worseningOnly && p.weekly_change <= 0) {
        return false
      }
      return true
    })
  }, [allFeatures, selectedGrades, selectedAuthority, searchTerm, worseningOnly])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Topbar title="Interactive Road Health GIS Map" />
      
      <div className="flex-1 flex flex-col md:flex-row h-full relative overflow-hidden">
        
        <div className="w-full md:w-80 bg-white border-r p-4 overflow-y-auto z-10 shadow-md flex flex-col justify-between shrink-0">
          <div className="space-y-5">
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Survey Week Cycle
                </h3>
                <span className="text-xs text-blue-600 font-semibold font-mono">Week {selectedWeek}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map(w => (
                  <Button
                    key={w}
                    size="sm"
                    variant={selectedWeek === w ? 'default' : 'outline'}
                    className={selectedWeek === w ? 'bg-slate-900 text-white text-xs font-bold' : 'text-xs text-slate-700'}
                    onClick={() => setSelectedWeek(w)}
                  >
                    W{w}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Road Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search road or segment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Health Grade
                </h3>
                <span className="text-[11px] text-gray-400">Multi-select</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { grade: 'A', label: 'Grade A (0–20 Good)', color: '#22c55e' },
                  { grade: 'B', label: 'Grade B (21–40 Fair)', color: '#84cc16' },
                  { grade: 'C', label: 'Grade C (41–60 Moderate)', color: '#eab308' },
                  { grade: 'D', label: 'Grade D (61–80 Poor)', color: '#f97316' },
                  { grade: 'E', label: 'Grade E (81–100 Dangerous)', color: '#ef4444' },
                ].map(item => (
                  <label 
                    key={item.grade} 
                    className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedGrades[item.grade]}
                        onChange={() => toggleGrade(item.grade)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span className="font-medium text-slate-800">{item.label}</span>
                    </div>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Municipal Authority
              </h3>
              <select
                value={selectedAuthority}
                onChange={(e) => setSelectedAuthority(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white text-slate-800 font-medium"
              >
                <option value="all">All Jurisdictions (Citywide)</option>
                <option value="Greater">JMC Greater</option>
                <option value="Heritage">JMC Heritage</option>
                <option value="PWD">PWD Jaipur Division</option>
                <option value="Development">Jaipur Development Authority (JDA)</option>
              </select>
            </div>

            <div className="pt-2 border-t">
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={worseningOnly}
                  onChange={(e) => setWorseningOnly(e.target.checked)}
                  className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5"
                />
                <span>Show Worsening Roads Only</span>
              </label>
            </div>

          </div>

          <div className="pt-4 border-t mt-4 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Showing <strong>{filteredFeatures.length}</strong> of {allFeatures.length} segments
            </span>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-7 text-blue-600">
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>

        </div>

        <div className="flex-1 bg-slate-100 relative h-full">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500 bg-slate-100">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading map data for Week {selectedWeek}...
            </div>
          ) : (
            <MapComponent features={filteredFeatures} />
          )}
          
          <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-xs p-3.5 rounded-lg shadow-lg border border-slate-200 z-[1000] text-xs max-w-xs pointer-events-auto">
            <div className="font-bold text-slate-900 mb-2 flex items-center justify-between">
              <span>Road Condition Grade</span>
              <span className="text-[10px] text-gray-500 font-mono">Week {selectedWeek}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-3.5 h-3.5 bg-emerald-500 rounded mr-2"></span>A (Good)</span>
                <span className="text-gray-500 font-mono text-[11px]">0–20</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-3.5 h-3.5 bg-lime-500 rounded mr-2"></span>B (Fair)</span>
                <span className="text-gray-500 font-mono text-[11px]">21–40</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-3.5 h-3.5 bg-amber-500 rounded mr-2"></span>C (Moderate)</span>
                <span className="text-gray-500 font-mono text-[11px]">41–60</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-3.5 h-3.5 bg-orange-500 rounded mr-2"></span>D (Poor)</span>
                <span className="text-gray-500 font-mono text-[11px]">61–80</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-3.5 h-3.5 bg-rose-500 rounded mr-2"></span>E (Dangerous)</span>
                <span className="text-gray-500 font-mono text-[11px]">81–100</span>
              </div>
            </div>
            <div className="text-[10px] text-gray-400 mt-2 pt-1.5 border-t">
              Click segment polyline for full deterioration history
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
