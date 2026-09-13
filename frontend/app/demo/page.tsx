"use client"

import React, { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import Link from 'next/link'
import { 
  Play, Pause, RotateCcw, Upload, FileText, CheckCircle2, 
  AlertTriangle, ArrowRight, ShieldCheck, Sparkles, Loader2, Database
} from 'lucide-react'

export default function DemoPage() {
  const [activeWeek, setActiveWeek] = useState<number>(4)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let timer: any = null
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveWeek((prev) => (prev < 4 ? prev + 1 : 1))
      }, 2500)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  const handleAction = async (fn: () => Promise<any>, successMsg: string) => {
    try {
      setLoading(true)
      setActionMsg(null)
      const res = await fn()
      setActionMsg({ type: 'success', text: successMsg || res?.message || 'Operation successful' })
    } catch (e: any) {
      setActionMsg({ type: 'error', text: `Action failed: ${e.message}` })
    } finally {
      setLoading(false)
    }
  }

  const scenarios = [
    {
      id: 'sc-1',
      title: 'Scenario 1: Chronic Road Deterioration (Tonk Road TR-01)',
      desc: 'Rapid wear from Grade C (Score 45) to Grade E (Score 88). 21-day repair window breached.',
      badge: 'Overdue SLA',
      badgeColor: 'bg-rose-600',
      roadId: 'TR-01',
      pattern: 'W1: C (45) → W2: D (62) → W3: E (85) → W4: E (88)'
    },
    {
      id: 'sc-2',
      title: 'Scenario 2: Successful Repair & AI Verification (Ajmer Road AJ-01)',
      desc: 'Severe road repaired by PWD. Post-repair bus survey proves risk drop from 80 down to 22.',
      badge: 'Verified Fix',
      badgeColor: 'bg-teal-600',
      roadId: 'AJ-01',
      pattern: 'W1: D (58) → W2: E (80) → W3: C (40) → W4: B (22)'
    },
    {
      id: 'sc-3',
      title: 'Scenario 3: Rain-Triggered Pothole Surge (Sikar Road SR-01)',
      desc: 'Monsoon rainfall spike (42mm) causes pothole density to triple. Crew patching in progress.',
      badge: 'In Progress',
      badgeColor: 'bg-amber-600',
      roadId: 'SR-01',
      pattern: 'W1: B (25) → W2: C (38) → W3: D (75) → W4: D (60)'
    },
    {
      id: 'sc-4',
      title: 'Scenario 4: Pristine Route / Baseline Control (Civil Lines CL-01)',
      desc: 'Consistently maintained VIP zone holding Grade A across all 4 weekly survey cycles.',
      badge: 'Grade A Good',
      badgeColor: 'bg-emerald-600',
      roadId: 'CL-01',
      pattern: 'W1: A (10) → W2: A (13) → W3: A (9) → W4: A (12)'
    }
  ]

  return (
    <>
      <Topbar title="Ideathon Demo Data Control Center" />
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {actionMsg && (
          <div className={`p-4 rounded-lg flex items-center justify-between ${
            actionMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium">{actionMsg.text}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActionMsg(null)}>Dismiss</Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <Card className="lg:col-span-2 shadow-sm border">
            <CardHeader className="bg-slate-900 text-white rounded-t-lg pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">4-Week Historical Playback</CardTitle>
                  <CardDescription className="text-slate-300">
                    Observe whole-city road health degradation and maintenance outcomes cycle-by-cycle
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant={isPlaying ? 'destructive' : 'secondary'}
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="space-x-1.5"
                >
                  {isPlaying ? <><Pause className="h-4 w-4" /><span>Pause</span></> : <><Play className="h-4 w-4" /><span>Play Timeline</span></>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((w) => (
                  <div
                    key={w}
                    onClick={() => { setActiveWeek(w); setIsPlaying(false); }}
                    className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-all ${
                      activeWeek === w 
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="text-xs text-gray-500 font-semibold uppercase">Cycle</div>
                    <div className="text-xl font-bold text-slate-900">Week {w}</div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      {w === 1 && 'Baseline Scan'}
                      {w === 2 && 'Wear Observed'}
                      {w === 3 && 'Reports Sent'}
                      {w === 4 && 'Verification & SLA'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t">
                <span>Selected: <strong>Week {activeWeek}</strong></span>
                <Link href={`/map?week=${activeWeek}`} className="text-blue-600 hover:underline font-medium inline-flex items-center">
                  View full map for Week {activeWeek} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">Dataset Seed State</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Reset database back to the verified 8-segment Jaipur dataset at any time during pitching.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3">
              <div className="text-xs space-y-1 bg-gray-50 p-3 rounded border text-gray-600">
                <div>• <strong>City:</strong> Jaipur, India</div>
                <div>• <strong>Segments:</strong> 8 Urban Transit Corridors</div>
                <div>• <strong>Weeks:</strong> 4 Monitored Cycles</div>
                <div>• <strong>Total Detections:</strong> 270 Geocoded Potholes</div>
              </div>
              <Button
                variant="outline"
                className="w-full border-slate-300 hover:bg-slate-100 flex items-center justify-center space-x-2"
                disabled={loading}
                onClick={() => handleAction(api.resetDemoData, 'Dataset re-seeded to original presentation state.')}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset Demo to Seed State</span>
              </Button>
            </CardContent>
          </Card>

        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
            Ideathon Presentation Scenarios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((sc) => (
              <Card key={sc.id} className="shadow-sm border hover:border-blue-400 transition-colors">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-slate-900 text-sm">{sc.title}</h4>
                      <Badge className={`${sc.badgeColor} text-white shrink-0 text-xs`}>{sc.badge}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{sc.desc}</p>
                    <div className="font-mono text-xs text-blue-700 bg-blue-50 p-2 rounded mt-2">
                      {sc.pattern}
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t">
                    <Link 
                      href={`/roads/${sc.roadId}`} 
                      className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center"
                    >
                      Open Road Inspection Panel <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="shadow-sm border">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Interactive Simulation Triggers</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Demonstrate near-real-time ingestion and the closed-loop municipal lifecycle on-demand.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              <Button
                variant="outline"
                className="h-auto py-3 px-3 flex flex-col items-start text-left border-gray-200 hover:border-blue-500"
                disabled={loading}
                onClick={() => handleAction(api.simulateUpload, 'Simulated NVDR footage ingested and processed through YOLO pipeline.')}
              >
                <div className="flex items-center space-x-2 font-semibold text-xs text-slate-900 mb-1">
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span>1. Ingest Bus Footage</span>
                </div>
                <div className="text-[11px] text-gray-500 font-normal">
                  Simulate front camera sync at depot hub
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-3 px-3 flex flex-col items-start text-left border-gray-200 hover:border-purple-500"
                disabled={loading}
                onClick={() => handleAction(() => api.simulateReport('TR-01'), 'Notice auto-sent to municipal department for Tonk Road.')}
              >
                <div className="flex items-center space-x-2 font-semibold text-xs text-slate-900 mb-1">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span>2. Dispatch Auto-Notice</span>
                </div>
                <div className="text-[11px] text-gray-500 font-normal">
                  Trigger threshold breach notification
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-3 px-3 flex flex-col items-start text-left border-gray-200 hover:border-emerald-500"
                disabled={loading}
                onClick={() => handleAction(() => api.simulateRepair('TR-01', 4), 'Repair work logged for Tonk Road. Score upgraded.')}
              >
                <div className="flex items-center space-x-2 font-semibold text-xs text-slate-900 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>3. Claim Road Repair</span>
                </div>
                <div className="text-[11px] text-gray-500 font-normal">
                  Simulate municipal crew patch work
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-3 px-3 flex flex-col items-start text-left border-gray-200 hover:border-teal-500"
                disabled={loading}
                onClick={() => handleAction(() => api.triggerVerification('ISS-TR-01'), 'AI verification confirms road roughness reduced.')}
              >
                <div className="flex items-center space-x-2 font-semibold text-xs text-slate-900 mb-1">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  <span>4. Verify Repair via AI</span>
                </div>
                <div className="text-[11px] text-gray-500 font-normal">
                  Follow-up bus survey validation
                </div>
              </Button>

            </div>
          </CardContent>
        </Card>

      </div>
    </>
  )
}
