"use client"

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { api } from '@/lib/api'
import { MapFeature, VehicleTelemetry } from '@/types'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, RotateCcw, Loader2, Filter, X, Play, Pause, Compass, Radio 
} from 'lucide-react'
import { useWeek } from '@/context/WeekContext'

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const y = Math.sin((lon2 - lon1) * rad) * Math.cos(lat2 * rad)
  const x =
    Math.cos(lat1 * rad) * Math.sin(lat2 * rad) -
    Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lon2 - lon1) * rad)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function getCompassDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(((heading %= 360) < 0 ? heading + 360 : heading) / 45) % 8
  return directions[index]
}

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

  // 5-Second GPS Vehicle Trajectory Simulation State
  const [vehicle, setVehicle] = useState<VehicleTelemetry | null>(null)
  const [travelledPath, setTravelledPath] = useState<[number, number][]>([])
  const [isSimulating, setIsSimulating] = useState<boolean>(true)
  const [activeRouteId, setActiveRouteId] = useState<string>('TR-01')
  const coordIndexRef = useRef<number>(0)
  const directionRef = useRef<number>(1) // 1 = forward (outbound), -1 = return (inbound)

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

  // Initialize or switch vehicle trajectory when active corridor or features change
  const setupVehicleOnRoute = useCallback((routeId: string, features: MapFeature[]) => {
    if (features.length === 0) return
    const route = features.find(f => f.properties.segment_id === routeId) || features[0]
    if (!route?.geometry?.coordinates?.length) return

    const coords: [number, number][] = route.geometry.coordinates.map(c => [c[1], c[0]])
    coordIndexRef.current = 0
    directionRef.current = 1
    const startPos = coords[0]
    const initialHeading = coords.length > 1 
      ? calculateBearing(startPos[0], startPos[1], coords[1][0], coords[1][1]) 
      : 180

    setVehicle({
      vehicle_id: 'BUS-001',
      latitude: Number(startPos[0].toFixed(6)),
      longitude: Number(startPos[1].toFixed(6)),
      timestamp: new Date().toISOString(),
      speed: 28.5,
      heading: Math.round(initialHeading),
      route_id: route.properties.segment_id,
      road_name: route.properties.road_name,
    })
    setTravelledPath([startPos])
  }, [])

  useEffect(() => {
    if (allFeatures.length > 0) {
      setupVehicleOnRoute(activeRouteId, allFeatures)
    }
  }, [allFeatures, activeRouteId, setupVehicleOnRoute])

  // Strictly 5-Second GPS Vehicle Movement Interval
  useEffect(() => {
    if (!isSimulating || allFeatures.length === 0) return

    const intervalId = setInterval(() => {
      const activeRoute = allFeatures.find(f => f.properties.segment_id === activeRouteId) || allFeatures[0]
      if (!activeRoute?.geometry?.coordinates?.length) return

      const coords: [number, number][] = activeRoute.geometry.coordinates.map(c => [c[1], c[0]])
      if (coords.length < 2) return

      const currIdx = coordIndexRef.current
      let nextIdx = currIdx + directionRef.current

      // Smooth terminal turnaround: reverse direction at the end of the arterial corridor
      if (nextIdx >= coords.length) {
        directionRef.current = -1
        nextIdx = Math.max(0, coords.length - 2)
      } else if (nextIdx < 0) {
        directionRef.current = 1
        nextIdx = Math.min(coords.length - 1, 1)
      }

      coordIndexRef.current = nextIdx
      const prevPos = coords[currIdx]
      const currentPos = coords[nextIdx]
      const heading = calculateBearing(prevPos[0], prevPos[1], currentPos[0], currentPos[1])

      // Realistic urban bus speed: 25-34 km/h with slight slowdown near terminal turns
      const isNearTurn = nextIdx === 0 || nextIdx === coords.length - 1
      const baseSpeed = isNearTurn ? 20.0 : 28.5
      const speedJitter = (Math.sin(nextIdx * 0.6) * 3.5) + ((Math.random() - 0.5) * 1.5)
      const speed = Math.max(16.0, Math.min(36.0, baseSpeed + speedJitter))

      const updatedVehicle: VehicleTelemetry = {
        vehicle_id: 'BUS-001',
        latitude: Number(currentPos[0].toFixed(6)),
        longitude: Number(currentPos[1].toFixed(6)),
        timestamp: new Date().toISOString(),
        speed: Number(speed.toFixed(1)),
        heading: Math.round(heading),
        route_id: activeRoute.properties.segment_id,
        road_name: activeRoute.properties.road_name,
      }

      setVehicle(updatedVehicle)
      setTravelledPath(prev => {
        const updated = [...prev, currentPos]
        return updated.length > 200 ? updated.slice(updated.length - 200) : updated
      })
    }, 5000)

    return () => clearInterval(intervalId)
  }, [isSimulating, allFeatures, activeRouteId])

  const resetSimulation = useCallback(() => {
    setupVehicleOnRoute(activeRouteId, allFeatures)
  }, [activeRouteId, allFeatures, setupVehicleOnRoute])

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
            <MapComponent 
              features={filteredFeatures} 
              vehicle={vehicle}
              travelledPath={travelledPath}
            />
          )}

          {/* Live Vehicle Telemetry HUD */}
          {vehicle && (
            <div className="absolute top-3 right-3 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 z-[1000] text-xs w-72 sm:w-80 pointer-events-auto">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/80 mb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {isSimulating && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSimulating ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  </span>
                  <span className="font-bold text-slate-100 text-xs tracking-wider">{vehicle.vehicle_id}</span>
                  <span className="text-[10px] bg-emerald-950/80 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-700/50 flex items-center space-x-1">
                    <Radio className="h-2.5 w-2.5 animate-pulse" />
                    <span>5s GPS</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    title={isSimulating ? "Pause Simulation" : "Resume Simulation"}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    {isSimulating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={resetSimulation}
                    title="Reset to Corridor Start"
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Corridor Selector */}
              <div className="mb-2.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Transit Corridor</span>
                  <span className="text-[10px] text-sky-400 font-medium">
                    {directionRef.current === 1 ? 'Forward / Outbound' : 'Return / Turnaround'}
                  </span>
                </div>
                <select
                  value={activeRouteId}
                  onChange={(e) => setActiveRouteId(e.target.value)}
                  className="w-full bg-slate-800/90 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                >
                  {allFeatures.map(f => (
                    <option key={f.properties.segment_id} value={f.properties.segment_id} className="bg-slate-900 text-slate-100">
                      {f.properties.segment_id} • {f.properties.road_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Live GPS:</span>
                  <span className="font-mono text-sky-300 font-semibold tracking-tight">
                    {vehicle.latitude.toFixed(6)}° N, {vehicle.longitude.toFixed(6)}° E
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Velocity:</span>
                  <span className="font-mono font-bold text-emerald-400">{vehicle.speed.toFixed(1)} km/h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Heading:</span>
                  <span className="font-mono text-slate-200 flex items-center">
                    <Compass className="h-3 w-3 mr-1 text-sky-400" />
                    {Math.round(vehicle.heading)}° {getCompassDirection(vehicle.heading)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800/80 text-[10px]">
                  <span className="text-slate-400">GPS Interval:</span>
                  <span className="text-slate-300 font-medium">Every 5.0 seconds</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">Trajectory Path:</span>
                  <span className="text-sky-400 font-semibold">{travelledPath.length} waypoints logged</span>
                </div>
              </div>
            </div>
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
