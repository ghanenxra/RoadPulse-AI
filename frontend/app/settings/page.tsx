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
  const [tileProvider, setTileProvider] = useState('voyager')
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
          <div className="bg-[#e8f2ec] border border-[#bde2cb] text-[#18432d] p-4 rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-[#207246]" />
            <span className="text-sm font-medium">Scoring weights and municipal parameters saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Formula Weights Card */}
          <Card className="bg-[#faf8f4] border border-[#ded7cb] shadow-sm overflow-hidden">
            <CardHeader className="bg-[#f4efe6] border-b border-[#ded7cb] pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="h-5 w-5 text-[#1d4231]" />
                <CardTitle className="text-base font-bold text-[#12271c]">Road Health Index Formula Weights</CardTitle>
              </div>
              <CardDescription className="text-[#506457] text-xs font-mono">
                Formula: Risk Score = 0.40 * Severity + 0.25 * Density + 0.20 * Trend + 0.15 * Context
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5 bg-[#faf8f4]">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-[#f4efe6] p-4 rounded-lg border border-[#ded7cb]">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-[#12271c]">Pothole Severity Weight</span>
                    <span className="font-mono text-[#1d4231] font-bold">{weights.severity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={weights.severity}
                    onChange={(e) => setWeights({ ...weights, severity: parseInt(e.target.value) })}
                    className="w-full accent-[#1d4231] cursor-pointer"
                  />
                  <p className="text-[11px] text-[#506457] mt-1 font-mono">Evaluates raw damage depth, aperture, and tire-impact hazard.</p>
                </div>

                <div className="bg-[#f4efe6] p-4 rounded-lg border border-[#ded7cb]">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-[#12271c]">Spatial Density Weight</span>
                    <span className="font-mono text-[#1d4231] font-bold">{weights.density}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={weights.density}
                    onChange={(e) => setWeights({ ...weights, density: parseInt(e.target.value) })}
                    className="w-full accent-[#1d4231] cursor-pointer"
                  />
                  <p className="text-[11px] text-[#506457] mt-1 font-mono">Potholes detected per kilometer along each road segment.</p>
                </div>

                <div className="bg-[#f4efe6] p-4 rounded-lg border border-[#ded7cb]">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-[#12271c]">Deterioration Trend Weight</span>
                    <span className="font-mono text-[#1d4231] font-bold">{weights.trend}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={weights.trend}
                    onChange={(e) => setWeights({ ...weights, trend: parseInt(e.target.value) })}
                    className="w-full accent-[#1d4231] cursor-pointer"
                  />
                  <p className="text-[11px] text-[#506457] mt-1 font-mono">Rate of week-over-week cluster growth and damage spread.</p>
                </div>

                <div className="bg-[#f4efe6] p-4 rounded-lg border border-[#ded7cb]">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-[#12271c]">Environmental Context Weight</span>
                    <span className="font-mono text-[#1d4231] font-bold">{weights.context}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={weights.context}
                    onChange={(e) => setWeights({ ...weights, context: parseInt(e.target.value) })}
                    className="w-full accent-[#1d4231] cursor-pointer"
                  />
                  <p className="text-[11px] text-[#506457] mt-1 font-mono">Monsoon rainfall intensity and heavy commercial bus traffic factors.</p>
                </div>

              </div>

              <div className="flex justify-between items-center p-3 bg-[#f4efe6] rounded-lg text-xs border border-[#ded7cb] font-mono">
                <span className="text-[#12271c]">Total Weight Allocation:</span>
                <span className={`font-bold ${totalWeight === 100 ? 'text-[#207246]' : 'text-[#912d1e]'}`}>
                  {totalWeight}% {totalWeight === 100 ? '(Balanced 100%)' : '(Must equal 100%)'}
                </span>
              </div>

            </CardContent>
          </Card>

          {/* Road Health Grading Bands */}
          <Card className="bg-[#faf8f4] border border-[#ded7cb] shadow-sm overflow-hidden">
            <CardHeader className="bg-[#f4efe6] border-b border-[#ded7cb] pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-[#1d4231]" />
                <CardTitle className="text-base font-bold text-[#12271c]">Road Health Grading Bands</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#506457]">
                Standardized 5-tier municipal safety index utilized across maps and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 bg-[#faf8f4]">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="border border-[#ded7cb] bg-[#f4efe6] p-3 rounded-lg">
                  <Badge className="bg-[#e6f4ea] text-[#1e5d3a] border border-[#bde0ca] mb-1 font-mono">Grade A</Badge>
                  <div className="text-xs font-mono font-bold text-[#12271c]">0 to 20</div>
                  <div className="text-[11px] text-[#506457] mt-0.5">Pristine State</div>
                </div>
                <div className="border border-[#ded7cb] bg-[#f4efe6] p-3 rounded-lg">
                  <Badge className="bg-[#eef8eb] text-[#2f6f34] border border-[#cbe8c6] mb-1 font-mono">Grade B</Badge>
                  <div className="text-xs font-mono font-bold text-[#12271c]">21 to 40</div>
                  <div className="text-[11px] text-[#506457] mt-0.5">Minor Wear</div>
                </div>
                <div className="border border-[#ded7cb] bg-[#f4efe6] p-3 rounded-lg">
                  <Badge className="bg-[#fef4e5] text-[#8c5610] border border-[#f6d7ab] mb-1 font-mono">Grade C</Badge>
                  <div className="text-xs font-mono font-bold text-[#12271c]">41 to 60</div>
                  <div className="text-[11px] text-[#506457] mt-0.5">Moderate Risk</div>
                </div>
                <div className="border border-[#ded7cb] bg-[#f4efe6] p-3 rounded-lg">
                  <Badge className="bg-[#faece8] text-[#9b3a1a] border border-[#f2c3b8] mb-1 font-mono">Grade D</Badge>
                  <div className="text-xs font-mono font-bold text-[#12271c]">61 to 80</div>
                  <div className="text-[11px] text-[#506457] mt-0.5">High Risk</div>
                </div>
                <div className="border border-[#ded7cb] bg-[#f4efe6] p-3 rounded-lg col-span-2 sm:col-span-1">
                  <Badge className="bg-[#faecea] text-[#912d1e] border border-[#f0c0b8] mb-1 font-mono">Grade E</Badge>
                  <div className="text-xs font-mono font-bold text-[#12271c]">81 to 100</div>
                  <div className="text-[11px] text-[#506457] mt-0.5">Severe Damage</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Municipal Parameters & Map Provider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <Card className="bg-[#faf8f4] border border-[#ded7cb] shadow-sm overflow-hidden">
              <CardHeader className="bg-[#f4efe6] border-b border-[#ded7cb] pb-3">
                <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-[#12271c]">
                  Municipal SLA Window
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 bg-[#faf8f4]">
                <div>
                  <label className="text-xs font-semibold text-[#12271c] block mb-1">
                    Repair Escalation Period (Days)
                  </label>
                  <input
                    type="number"
                    value={slaDays}
                    onChange={(e) => setSlaDays(parseInt(e.target.value))}
                    className="w-full bg-[#f4efe6] border border-[#ded7cb] rounded-md p-2 text-sm text-[#12271c] font-mono focus:border-[#1d4231] focus:outline-none"
                  />
                  <p className="text-[11px] text-[#506457] mt-1 font-mono">
                    Segments breaching this threshold automatically trigger the Overdue status in the Authority Tracker.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#faf8f4] border border-[#ded7cb] shadow-sm overflow-hidden">
              <CardHeader className="bg-[#f4efe6] border-b border-[#ded7cb] pb-3">
                <CardTitle className="text-xs font-mono font-semibold uppercase tracking-wider text-[#12271c]">
                  Geospatial Map Tile Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 bg-[#faf8f4]">
                <div>
                  <label className="text-xs font-semibold text-[#12271c] block mb-1">
                    Primary Basemap
                  </label>
                  <Select value={tileProvider} onValueChange={setTileProvider}>
                    <SelectTrigger className="bg-[#f4efe6] border-[#ded7cb] text-[#12271c] text-xs h-9">
                      <SelectValue placeholder="Select Tile Provider" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] text-xs">
                      <SelectItem value="voyager">CartoDB Voyager (Forest Green & Warm Beige Organic)</SelectItem>
                      <SelectItem value="osm">OpenStreetMap Standard Cartography</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-[#506457] mt-1 font-mono">
                    Warm terrain cartography with crisp road vectors and natural vegetation hues.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button 
              type="button" 
              variant="outline"
              className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] hover:bg-[#ede7dc] text-xs"
            >
              Restore Defaults
            </Button>
            <Button 
              type="submit" 
              className="bg-[#1d4231] hover:bg-[#153325] text-[#faf8f4] flex items-center space-x-1.5 text-xs shadow-sm"
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
