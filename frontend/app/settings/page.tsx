"use client"

import React, { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
      
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium">Scoring weights and municipal parameters saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-900 text-white rounded-t-lg">
              <div className="flex items-center space-x-2">
                <Sliders className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-lg">Road Health Index Formula Weights</CardTitle>
              </div>
              <CardDescription className="text-slate-300">
                Formula: Risk Score = 0.40 × Severity + 0.25 × Density + 0.20 × Trend + 0.15 × Context
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-800">Pothole Severity Weight</span>
                    <span className="font-mono text-blue-600 font-bold">{weights.severity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={weights.severity}
                    onChange={(e) => setWeights({ ...weights, severity: parseInt(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-500">Evaluates raw damage depth, aperture, and tire-impact hazard.</p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-800">Spatial Density Weight</span>
                    <span className="font-mono text-blue-600 font-bold">{weights.density}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={weights.density}
                    onChange={(e) => setWeights({ ...weights, density: parseInt(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-500">Potholes detected per kilometer along each road segment.</p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-800">Deterioration Trend Weight</span>
                    <span className="font-mono text-blue-600 font-bold">{weights.trend}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={weights.trend}
                    onChange={(e) => setWeights({ ...weights, trend: parseInt(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-500">Rate of week-over-week cluster growth and damage spread.</p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-800">Environmental Context Weight</span>
                    <span className="font-mono text-blue-600 font-bold">{weights.context}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={weights.context}
                    onChange={(e) => setWeights({ ...weights, context: parseInt(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-500">Monsoon rainfall intensity and heavy commercial bus traffic factors.</p>
                </div>

              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-xs border">
                <span>Total Weight Allocation:</span>
                <span className={`font-mono font-bold ${totalWeight === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {totalWeight}% {totalWeight === 100 ? '(Balanced)' : '(Must equal 100%)'}
                </span>
              </div>

            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-slate-800" />
                <CardTitle className="text-base">Road Health Grading Bands</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Standardized 5-tier municipal safety index utilized across maps and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="border border-emerald-200 bg-emerald-50/60 p-3 rounded-lg">
                  <Badge className="bg-emerald-600 text-white mb-1">Grade A</Badge>
                  <div className="text-xs font-bold text-slate-900">0 – 20</div>
                  <div className="text-[11px] text-gray-500">Good Condition</div>
                </div>
                <div className="border border-lime-200 bg-lime-50/60 p-3 rounded-lg">
                  <Badge className="bg-lime-600 text-white mb-1">Grade B</Badge>
                  <div className="text-xs font-bold text-slate-900">21 – 40</div>
                  <div className="text-[11px] text-gray-500">Minor Wear</div>
                </div>
                <div className="border border-amber-200 bg-amber-50/60 p-3 rounded-lg">
                  <Badge className="bg-amber-600 text-white mb-1">Grade C</Badge>
                  <div className="text-xs font-bold text-slate-900">41 – 60</div>
                  <div className="text-[11px] text-gray-500">Moderate Risk</div>
                </div>
                <div className="border border-orange-200 bg-orange-50/60 p-3 rounded-lg">
                  <Badge className="bg-orange-600 text-white mb-1">Grade D</Badge>
                  <div className="text-xs font-bold text-slate-900">61 – 80</div>
                  <div className="text-[11px] text-gray-500">High Risk</div>
                </div>
                <div className="border border-rose-200 bg-rose-50/60 p-3 rounded-lg col-span-2 sm:col-span-1">
                  <Badge className="bg-rose-600 text-white mb-1">Grade E</Badge>
                  <div className="text-xs font-bold text-slate-900">81 – 100</div>
                  <div className="text-[11px] text-gray-500">Severe / Dangerous</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-gray-500">
                  Municipal SLA Window
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Repair Escalation Period (Days)
                  </label>
                  <input
                    type="number"
                    value={slaDays}
                    onChange={(e) => setSlaDays(parseInt(e.target.value))}
                    className="w-full border rounded-md p-2 text-sm"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Segments breaching this threshold automatically trigger the Overdue status in the Authority Tracker.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-gray-500">
                  Geospatial Map Tile Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Primary Basemap
                  </label>
                  <select
                    value={tileProvider}
                    onChange={(e) => setTileProvider(e.target.value)}
                    className="w-full border rounded-md p-2 text-sm bg-white"
                  >
                    <option value="osm">OpenStreetMap Standard Cartography (Default)</option>
                    <option value="carto">CartoDB Positron (High-Contrast GIS Light)</option>
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Includes automatic fallback to vector canvas layer if network tiles are unreachable.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="outline">Restore Defaults</Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white flex items-center space-x-1.5">
              <Save className="h-4 w-4" />
              <span>Save System Settings</span>
            </Button>
          </div>

        </form>

      </div>
    </>
  )
}
