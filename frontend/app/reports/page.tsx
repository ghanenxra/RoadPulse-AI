"use client"

import React, { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { OverviewMetrics, RoadSegment } from '@/types'
import { 
  FileText, Download, CheckCircle, AlertTriangle, 
  Layers, FileSpreadsheet, Calendar, Building, Sparkles, Loader2 
} from 'lucide-react'
import { useWeek } from '@/context/WeekContext'

export default function ReportsPage() {
  const { week, setWeek } = useWeek()
  const [selectedAuth, setSelectedAuth] = useState<string>('all')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [roads, setRoads] = useState<RoadSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [m, r] = await Promise.all([
          api.getOverviewMetrics(week),
          api.getRoads(week)
        ])
        setMetrics(m)
        setRoads(r)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [week])

  const handleDownloadPdf = async () => {
    try {
      setGeneratingPdf(true)
      setFeedback(null)
      const url = api.getPDFReportUrl(week, selectedAuth)
      const response = await fetch(url)
      if (!response.ok) {
        let errMessage = `Server responded with status ${response.status}`
        try {
          const errJson = await response.json()
          if (errJson.detail) errMessage = errJson.detail
        } catch {
          // fallback to status code
        }
        throw new Error(errMessage)
      }
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      const authSuffix = selectedAuth && selectedAuth !== 'all' ? `_${selectedAuth}` : ''
      link.download = `roadpulse_weekly_w${week}${authSuffix}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      setFeedback({ type: 'success', message: `Official ReportLab PDF report for Week ${week} downloaded successfully.` })
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to download PDF report: ${e.message || e}` })
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDownloadCsv = async (type: string, filename: string) => {
    try {
      setFeedback(null)
      const url = api.getCSVExportUrl(type, week)
      const response = await fetch(url)
      if (!response.ok) {
        let errMessage = `Server responded with status ${response.status}`
        try {
          const errJson = await response.json()
          if (errJson.detail) errMessage = errJson.detail
        } catch {}
        throw new Error(errMessage)
      }
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      setFeedback({ type: 'success', message: `Exported ${filename} successfully.` })
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to export CSV: ${e.message || e}` })
    }
  }

  const csvExports = [
    { type: 'road_segments', label: 'Road Segments & Risk Scores', file: `road_segments_w${week}.csv`, desc: 'Segment geometries, coordinates, current risk scores, and grades' },
    { type: 'detections', label: 'Pothole Detections (Raw)', file: `detections_w${week}.csv`, desc: 'Individual timestamped GPS detections, confidence, and estimated depth' },
    { type: 'weekly_history', label: '4-Week Deterioration Timeline', file: 'weekly_history_all.csv', desc: 'Weekly road metrics across all survey cycles' },
    { type: 'authority_actions', label: 'Authority Maintenance & SLA', file: 'authority_actions.csv', desc: 'Report dispatch dates, repair verifications, and SLA audit trail' },
    { type: 'processing_jobs', label: 'NVDR Ingestion Log', file: 'processing_jobs.csv', desc: 'Bus dashcam upload logs, frame counts, and YOLO inference metrics' },
  ]

  return (
    <>
      <Topbar title="Reports & Export Center" />
      
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {feedback && (
          <div className={`p-4 rounded-lg flex items-center justify-between border ${
            feedback.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-rose-400" />}
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-200">
              Dismiss
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Report Generator Controls */}
          <Card className="lg:col-span-1 bg-[#090d16] border border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-[#0f172a] border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-base font-bold text-slate-100">Report Generator</CardTitle>
              </div>
              <CardDescription className="text-slate-400 text-xs">
                Compile executive summaries, deterioration analytics, and repair verification audits.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5 bg-[#090d16]">
              
              <div>
                <label className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Survey Cycle (Week)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(w => (
                    <Button
                      key={w}
                      type="button"
                      variant={week === w ? 'default' : 'outline'}
                      className={`h-9 font-mono text-xs ${
                        week === w 
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-bold' 
                          : 'bg-[#0f172a] border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                      onClick={() => setWeek(w)}
                    >
                      W{w}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Responsible Jurisdiction
                </label>
                <Select value={selectedAuth} onValueChange={setSelectedAuth}>
                  <SelectTrigger className="bg-[#0f172a] border-slate-800 text-slate-200 text-xs h-9">
                    <SelectValue placeholder="Select Authority" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f172a] border-slate-700 text-slate-200 text-xs">
                    <SelectItem value="all">All Authorities (Citywide Summary)</SelectItem>
                    <SelectItem value="jmc_greater">Jaipur Municipal Corporation (Greater)</SelectItem>
                    <SelectItem value="pwd">PWD Jaipur Division</SelectItem>
                    <SelectItem value="jda">Jaipur Development Authority</SelectItem>
                    <SelectItem value="jmc_heritage">Jaipur Municipal Corporation (Heritage)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 text-xs text-slate-400 pt-3 border-t border-slate-800">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-cyan-500 bg-slate-900 border-slate-700" />
                  <span>Include DBSCAN cluster analysis</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-cyan-500 bg-slate-900 border-slate-700" />
                  <span>Include before and after repair verification</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-cyan-500 bg-slate-900 border-slate-700" />
                  <span>Include SLA breach escalation notices</span>
                </label>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleDownloadPdf} 
                  disabled={generatingPdf} 
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 flex items-center justify-center space-x-2 shadow-sm transition-colors text-xs"
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating ReportLab PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download Official PDF Report</span>
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-center text-slate-500 mt-2 font-mono">
                  Generates branded PDF with executive summary, grade distributions, and methodology.
                </p>
              </div>

            </CardContent>
          </Card>

          {/* Executive Report Preview */}
          <Card className="lg:col-span-2 bg-[#090d16] border border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-800 bg-[#0f172a] pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-bold text-slate-100">Executive Report Preview (Week {week})</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Automated report compilation for Jaipur Transit Corridors
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-cyan-950/40 text-cyan-400 border-cyan-800/80 font-mono text-[10px]">
                  Ready for Dispatch
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5 bg-[#090d16]">
              
              {loading ? (
                <div className="h-64 flex items-center justify-center text-slate-400 font-mono text-xs">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-cyan-400" />
                  Compiling report data...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#0f172a] rounded-lg border border-slate-800">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Roads Monitored</div>
                      <div className="text-2xl font-mono font-bold text-slate-100">{metrics?.roads_surveyed.current ?? 20}</div>
                      <div className="text-[11px] text-emerald-400 mt-1 font-mono">100% route coverage</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Total Potholes</div>
                      <div className="text-2xl font-mono font-bold text-slate-100">{metrics?.total_potholes.current || 0}</div>
                      <div className="text-[11px] text-slate-400 mt-1 font-mono">Cluster deduplicated</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Dangerous Segments</div>
                      <div className="text-2xl font-mono font-bold text-rose-400">{metrics?.dangerous_segments.current || 0}</div>
                      <div className="text-[11px] text-rose-400/80 mt-1 font-mono">Grade D and E priority</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">City Avg Risk</div>
                      <div className="text-2xl font-mono font-bold text-cyan-400">{metrics?.avg_risk_score.current.toFixed(1) || '0.0'}</div>
                      <div className="text-[11px] text-slate-400 mt-1 font-mono">Index out of 100</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Top Priority Segments in this Cycle
                    </h4>
                    <div className="border border-slate-800 rounded-md overflow-hidden bg-[#0f172a]">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#090d16] text-[11px] font-mono text-slate-400 uppercase border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5">Segment</th>
                            <th className="px-4 py-2.5">Authority</th>
                            <th className="px-4 py-2.5 text-center">Grade</th>
                            <th className="px-4 py-2.5 text-right">Risk Score</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {roads.slice(0, 4).map(r => (
                            <tr key={r.segment_id} className="hover:bg-slate-800/40">
                              <td className="px-4 py-2.5 font-medium text-slate-200 font-sans">
                                {r.road_name} <span className="text-xs text-slate-500 font-normal">({r.sub_name})</span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-400 font-sans">{r.authority_name}</td>
                              <td className="px-4 py-2.5 text-center">
                                <Badge className={
                                  r.current_week?.grade === 'A' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                                  r.current_week?.grade === 'B' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' :
                                  r.current_week?.grade === 'C' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                                  r.current_week?.grade === 'D' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 
                                  'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                }>
                                  {r.current_week?.grade || 'C'}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-slate-200">
                                {r.current_week?.risk_score.toFixed(1) || '0.0'}
                              </td>
                              <td className="px-4 py-2.5">
                                <Badge variant="outline" className="capitalize text-[10px] text-slate-400 border-slate-700">
                                  {(r.current_week?.status || 'none').replace('_', ' ')}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 bg-[#0f172a] border border-slate-800 p-3 rounded-lg flex items-start space-x-2">
                    <Sparkles className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-100">Accountability Workflow:</strong> Generated reports are stamped with unique audit identifiers. 
                      Any road segment reaching Grade D or E triggers a 21-day repair SLA countdown with the assigned municipal body.
                    </span>
                  </div>
                </>
              )}

            </CardContent>
          </Card>

        </div>

        {/* Municipal CSV Data Feeds */}
        <Card className="bg-[#090d16] border border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-[#0f172a] border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-base font-bold text-slate-100">Municipal CSV Data Feeds</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Export structured dataset tables for GIS import, civic analytics, or departmental audits.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 bg-[#090d16]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {csvExports.map((item) => (
                <div 
                  key={item.type} 
                  className="border border-slate-800 rounded-lg p-4 bg-[#0f172a] hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="font-semibold text-slate-200 text-sm">{item.label}</div>
                    <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
                    <code className="text-[11px] text-cyan-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded mt-2 inline-block font-mono">
                      {item.file}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center space-x-1.5 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                    onClick={() => handleDownloadCsv(item.type, item.file)}
                  >
                    <Download className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  )
}
