"use client"

import React, { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Sliders, Shield, Layers, HardDrive, CheckCircle2, 
  Cpu, MapPin, Sparkles, RefreshCw, Save
} from 'lucide-react'

export default function SettingsPage() {
  const [weights, setWeights] = useState({
    severity: 40,
    density: 25,
    trend: 20,
    context: 15
  })
  const [tileProvider, setTileProvider] = useState('osm')
  const [slaDays, setSlaDays] = useState(21)
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const totalWeight = weights.severity + weights.density + weights.trend + weights.context

  return (
    <>
      <Topbar title="System Configuration & Scoring Parameters" />
      
      <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
        
        {saved && (
          <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-4 rounded-lg flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium">Scoring weights and municipal parameters saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Formula Weights Card */}
          <Card className="bg-[#090d16] border border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-[#0f172a] border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-base font-bold text-slate-100">Road Health Index Formula Weights</CardTitle>
              </div>
              <CardDescription className="text-slate-400 text-xs font-mono">
                Formula: Risk Score = 0.40 * Severity + 0.25 * Density + 0.20 * Trend + 0.15 * Context
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5 bg-[#090d16]">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-200">Pothole Severity Weight</span>
                    <span className="font-mono text-cyan-400 font-bold">{weights.severity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={weights.severity}
                    onChange={(e) => setWeights({ ...weights, severity: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">Evaluates raw damage depth, aperture, and tire-impact hazard.</p>
                </div>

                <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-200">Spatial Density Weight</span>
                    <span className="font-mono text-cyan-400 font-bold">{weights.density}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={weights.density}
                    onChange={(e) => setWeights({ ...weights, density: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">Potholes detected per kilometer along each road segment.</p>
                </div>

                <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-200">Deterioration Trend Weight</span>
                    <span className="font-mono text-cyan-400 font-bold">{weights.trend}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={weights.trend}
                    onChange={(e) => setWeights({ ...weights, trend: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">Rate of week-over-week cluster growth and damage spread.</p>
                </div>

                <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-200">Environmental Context Weight</span>
                    <span className="font-mono text-cyan-400 font-bold">{weights.context}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={weights.context}
                    onChange={(e) => setWeights({ ...weights, context: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">Monsoon rainfall intensity and heavy commercial bus traffic factors.</p>
                </div>

              </div>

              <div className="flex justify-between items-center p-3 bg-[#0f172a] rounded-lg text-xs border border-slate-800 font-mono">
                <span className="text-slate-300">Total Weight Allocation:</span>
                <span className={`font-bold ${totalWeight === 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalWeight}% {totalWeight === 100 ? '(Balanced)' : '(Must equal 100%)'}
                </span>
              </div>

            </CardContent>
          </Card>

          {/* Road Health Grading Bands */}
          <Card className="bg-[#090d16] border border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-[#0f172a] border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-base font-bold text-slate-100">Road Health Grading Bands</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Standardized 5-tier municipal safety index utilized across maps and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 bg-[#090d16]">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="border border-slate-800 bg-[#0f172a] p-3 rounded-lg">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-1 font-mono">Grade A</Badge>
                  <div className="text-xs font-mono font-bold text-slate-200">0 to 20</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Good Condition</div>
                </div>
                <div className="border border-slate-800 bg-[#0f172a] p-3 rounded-lg">
                  <Badge className="bg-lime-500/10 text-lime-400 border border-lime-500/30 mb-1 font-mono">Grade B</Badge>
                  <div className="text-xs font-mono font-bold text-slate-200">21 to 40</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Minor Wear</div>
                </div>
                <div className="border border-slate-800 bg-[#0f172a] p-3 rounded-lg">
                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-1 font-mono">Grade C</Badge>
                  <div className="text-xs font-mono font-bold text-slate-200">41 to 60</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Moderate Risk</div>
                </div>
                <div className="border border-slate-800 bg-[#0f172a] p-3 rounded-lg">
                  <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/30 mb-1 font-mono">Grade D</Badge>
                  <div className="text-xs font-mono font-bold text-slate-200">61 to 80</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">High Risk</div>
                </div>
                <div className="border border-slate-800 bg-[#0f172a] p-3 rounded-lg col-span-2 sm:col-span-1">
                  <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/30 mb-1 font-mono">Grade E</Badge>
                  <div className="text-xs font-mono font-bold text-slate-200">81 to 100</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Severe Damage</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Municipal Parameters & Map Provider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <Card className="bg-[#090d16] border border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-[#0f172a] border-b border-slate-800 pb-3">
                <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                  Municipal SLA Window
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 bg-[#090d16]">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Repair Escalation Period (Days)
                  </label>
                  <input
                    type="number"
                    value={slaDays}
                    onChange={(e) => setSlaDays(parseInt(e.target.value))}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-md p-2 text-sm text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Segments breaching this threshold automatically trigger the Overdue status in the Authority Tracker.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#090d16] border border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-[#0f172a] border-b border-slate-800 pb-3">
                <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                  Geospatial Map Tile Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 bg-[#090d16]">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Primary Basemap
                  </label>
                  <Select value={tileProvider} onValueChange={setTileProvider}>
                    <SelectTrigger className="bg-[#0f172a] border-slate-700 text-slate-200 text-xs h-9">
                      <SelectValue placeholder="Select Tile Provider" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f172a] border-slate-700 text-slate-200 text-xs">
                      <SelectItem value="carto">CartoDB Dark Matter (High-Contrast Tactical Dark)</SelectItem>
                      <SelectItem value="osm">OpenStreetMap Standard Cartography</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Includes automatic fallback to vector canvas layer if network tiles are unreachable.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button 
              type="button" 
              variant="outline"
              className="bg-[#0f172a] border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Restore Defaults
            </Button>
            <Button 
              type="submit" 
              className="bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-1.5 text-xs shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>Save System Settings</span>
            </Button>
          </div>

        </form>

      </div>
    </>
  )
}
