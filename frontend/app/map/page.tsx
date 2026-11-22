"use client"

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { api } from '@/lib/api'
import { MapFeature, VehicleTelemetry } from '@/types'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, RotateCcw, Loader2, Filter, X, Play, Pause, Compass, Radio, Bus, ChevronDown, ChevronUp 
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    <div className="flex items-center justify-center h-full text-slate-400 bg-[#090d16]">
      <Loader2 className="h-6 w-6 animate-spin mr-2 text-sky-400" />
      <span className="font-mono text-xs">Loading GIS road network...</span>
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
  const [isTelemetryCollapsed, setIsTelemetryCollapsed] = useState<boolean>(false)
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

      // Urban transit speed: 25-34 km/h with slowdown near turns
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
      if (worseningOnly && (p.weekly_change === null || p.weekly_change <= 0)) return false
      return true
    })
  }, [allFeatures, selectedGrades, selectedAuthority, searchTerm, worseningOnly])

  const filterContent = (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5 bg-[#0b101b] text-slate-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">GIS Controls</span>
          <h2 className="font-bold text-slate-100 text-sm">Geospatial Filters</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-7 text-sky-400 hover:text-sky-300 hover:bg-slate-800 px-2 font-mono">
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      {/* Search Input */}
      <div>
        <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">Search Corridor</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input 
            placeholder="Tonk Road, TR-01..." 
            className="pl-8 text-xs h-8 bg-slate-900 border-slate-800 text-slate-100 font-mono"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grade Filters */}
      <div>
        <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">Condition Grade (A to E)</label>
        <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
          {[
            { grade: 'A', label: 'Grade A (<20.0) Good', color: 'bg-emerald-500' },
            { grade: 'B', label: 'Grade B (21-40) Fair', color: 'bg-lime-500' },
            { grade: 'C', label: 'Grade C (41-60) Moderate', color: 'bg-amber-500' },
            { grade: 'D', label: 'Grade D (61-80) Poor', color: 'bg-orange-500' },
            { grade: 'E', label: 'Grade E (81+) Critical', color: 'bg-rose-500' },
          ].map(item => (
            <label key={item.grade} className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer border border-transparent hover:border-slate-800">
              <input 
                type="checkbox" 
                checked={selectedGrades[item.grade]} 
                onChange={() => toggleGrade(item.grade)}
                className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
              <span className="text-[11px] text-slate-300 font-medium">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Authority Filter via Radix Select */}
      <div>
        <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">Responsible Authority</label>
        <Select value={selectedAuthority} onValueChange={(val) => setSelectedAuthority(val)}>
          <SelectTrigger className="w-full text-xs h-8 bg-slate-900 border-slate-800 text-slate-200 font-mono">
            <SelectValue placeholder="All Authorities" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 font-mono text-xs">
            <SelectItem value="all">All Authorities</SelectItem>
            <SelectItem value="JMC Greater">JMC Greater</SelectItem>
            <SelectItem value="JMC Heritage">JMC Heritage</SelectItem>
            <SelectItem value="PWD">PWD Rajasthan</SelectItem>
            <SelectItem value="JDA">Jaipur Development Authority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Worsening Toggle */}
      <div>
        <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-900/60">
          <input 
            type="checkbox" 
            checked={worseningOnly}
            onChange={(e) => setWorseningOnly(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 focus:ring-offset-0"
          />
          <span className="font-medium text-[11px]">Deteriorating corridors only</span>
        </label>
      </div>

      {/* Result Count Summary */}
      <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono flex justify-between items-center">
        <span>Active Display:</span>
        <span className="font-semibold text-slate-100">{filteredFeatures.length} of {allFeatures.length}</span>
      </div>

      {showMobileFilters && (
        <Button 
          className="w-full mt-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs h-8"
          onClick={() => setShowMobileFilters(false)}
        >
          Apply Filters
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#090d16]">
      <Topbar title="GIS Road Health Map" />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-72 lg:w-80 shrink-0 border-r border-slate-800 bg-[#0b101b] flex-col z-10">
          {filterContent}
        </aside>

        {/* Mobile Filter Toggle Button */}
        <button
          onClick={() => setShowMobileFilters(true)}
          className="md:hidden absolute top-3 left-3 z-[1000] bg-slate-900 text-slate-200 shadow-xl border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center space-x-1.5 hover:bg-slate-800"
        >
          <Filter className="h-3.5 w-3.5 text-sky-400" />
          <span>Filters ({filteredFeatures.length})</span>
        </button>

        {/* Mobile Filter Slide-over Drawer */}
        {showMobileFilters && (
          <div className="md:hidden fixed inset-0 z-[2000] flex">
            <div 
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
              onClick={() => setShowMobileFilters(false)}
            />
            <div className="relative w-full max-w-xs bg-[#0b101b] border-r border-slate-800 h-full shadow-2xl z-10 flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950">
                <span className="font-bold text-xs text-slate-100 uppercase tracking-wider">Map Filters</span>
                <button 
                  onClick={() => setShowMobileFilters(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white"
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
        <div className="flex-1 bg-[#090d16] relative h-full">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 bg-[#090d16]">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-sky-400" />
              <span className="font-mono text-xs">Loading GIS network for Cycle {week}...</span>
            </div>
          ) : (
            <MapComponent 
              features={filteredFeatures} 
              vehicle={vehicle}
              travelledPath={travelledPath}
            />
          )}

          {/* Live Vehicle Telemetry HUD - Expanded */}
          {vehicle && !isTelemetryCollapsed && (
            <div className="absolute top-3 right-3 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-800 z-[1000] text-xs w-72 sm:w-80 pointer-events-auto transition-all duration-200 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2 w-2">
                    {isSimulating && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulating ? 'bg-sky-400' : 'bg-amber-400'}`}></span>
                  </span>
                  <span className="font-bold text-slate-100 text-xs tracking-wider">{vehicle.vehicle_id}</span>
                  <span className="text-[9px] bg-sky-950/80 text-sky-400 font-semibold px-1.5 py-0.5 rounded border border-sky-800/60 flex items-center space-x-1">
                    <Radio className="h-2.5 w-2.5 animate-pulse" />
                    <span>5s GPS</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    title={isSimulating ? "Pause Simulation" : "Resume Simulation"}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    {isSimulating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={resetSimulation}
                    title="Reset to Corridor Start"
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setIsTelemetryCollapsed(true)}
                    title="Collapse Telemetry HUD"
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    aria-label="Collapse Telemetry HUD"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Corridor Selector */}
              <div className="mb-2.5">
                <div className="flex justify-between items-center mb-1 text-[10px]">
                  <span className="uppercase tracking-wider text-slate-400">Transit Corridor</span>
                  <span className="text-sky-400">
                    {directionRef.current === 1 ? 'Outbound' : 'Return'}
                  </span>
                </div>
                <Select value={activeRouteId} onValueChange={(val) => setActiveRouteId(val)}>
                  <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono h-8">
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-slate-200 font-mono text-xs max-h-56">
                    {allFeatures.map(f => (
                      <SelectItem key={f.properties.segment_id} value={f.properties.segment_id}>
                        {f.properties.segment_id} · {f.properties.road_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 text-[11px] bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Live GPS:</span>
                  <span className="text-sky-300 font-semibold tracking-tight">
                    {vehicle.latitude.toFixed(6)}° N, {vehicle.longitude.toFixed(6)}° E
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Velocity:</span>
                  <span className="font-bold text-emerald-400">{vehicle.speed.toFixed(1)} km/h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Heading:</span>
                  <span className="text-slate-200 flex items-center">
                    <Compass className="h-3 w-3 mr-1 text-sky-400" />
                    {Math.round(vehicle.heading)}° {getCompassDirection(vehicle.heading)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[10px]">
                  <span className="text-slate-500">Sampling Rate:</span>
                  <span className="text-slate-300">Every 5.0s</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500">Waypoints Logged:</span>
                  <span className="text-sky-400 font-semibold">{travelledPath.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Live Vehicle Telemetry - Collapsed Bottom Button */}
          {vehicle && isTelemetryCollapsed && (
            <button
              onClick={() => setIsTelemetryCollapsed(false)}
              title="Expand Live Vehicle Telemetry (BUS-001)"
              className="absolute bottom-4 left-4 z-[1000] bg-slate-900/95 hover:bg-slate-800 text-white px-3 py-2 rounded-xl shadow-2xl border border-slate-800 flex items-center space-x-2.5 transition-all duration-150 font-mono"
            >
              <span className="relative flex h-2 w-2">
                {isSimulating && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulating ? 'bg-sky-400' : 'bg-amber-400'}`}></span>
              </span>
              <div className="p-1 rounded bg-sky-500/10 text-sky-400">
                <Bus className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xs text-slate-100">{vehicle.vehicle_id}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">{vehicle.speed.toFixed(1)} km/h</span>
                </div>
                <span className="text-[10px] text-slate-400 max-w-[130px] truncate hidden sm:inline">{vehicle.road_name || activeRouteId}</span>
              </div>
              <ChevronUp className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
            </button>
          )}
          
          {/* Tactical Map Legend */}
          <div className="absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur-md p-2.5 sm:p-3 rounded-lg shadow-xl border border-slate-800 z-[1000] text-xs max-w-[210px] sm:max-w-xs pointer-events-auto font-mono">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-wider">
              <span>Condition Legend</span>
              <span className="text-[10px] text-slate-500">Risk Scale</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-2.5 h-1.5 rounded-full bg-emerald-500 mr-2" />Grade A</span>
                <span className="text-slate-400 text-[10px]">&lt; 20.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-2.5 h-1.5 rounded-full bg-lime-500 mr-2" />Grade B</span>
                <span className="text-slate-400 text-[10px]">21 - 40</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-2.5 h-1.5 rounded-full bg-amber-500 mr-2" />Grade C</span>
                <span className="text-slate-400 text-[10px]">41 - 60</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-2.5 h-1.5 rounded-full bg-orange-500 mr-2" />Grade D</span>
                <span className="text-slate-400 text-[10px]">61 - 80</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><span className="w-2.5 h-1.5 rounded-full bg-rose-500 mr-2" />Grade E</span>
                <span className="text-slate-400 text-[10px]">81 - 100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
