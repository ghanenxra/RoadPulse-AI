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
          // fallback
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
          <div className={`p-4 rounded-xl flex items-center justify-between border ${
            feedback.type === 'success' 
              ? 'bg-[#e8f2ec] border-[#bde2cb] text-[#18432d]' 
              : 'bg-[#faecea] border-[#f0c0b8] text-[#912d1e]'
          }`}>
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-[#207246]" /> : <AlertTriangle className="h-5 w-5 text-[#912d1e]" />}
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFeedback(null)} className="text-[#506457] hover:text-[#12271c] hover:bg-[#ede7dc]">
              Dismiss
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Report Generator Controls */}
          <Card className="lg:col-span-1 bg-[#faf8f4] border border-[#ded7cb] shadow-sm overflow-hidden">
            <CardHeader className="bg-[#f4efe6] border-b border-[#ded7cb] pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-[#1d4231]" />
                <CardTitle className="text-base font-bold text-[#12271c]">Report Generator</CardTitle>
              </div>
              <CardDescription className="text-[#506457] text-xs">
                Compile executive summaries, deterioration analytics, and repair verification audits.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5 bg-[#faf8f4]">
              
              <div>
                <label className="text-[11px] font-mono font-semibold text-[#506457] uppercase tracking-wider block mb-2">
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
                          ? 'bg-[#1d4231] hover:bg-[#153325] text-[#faf8f4] font-bold' 
                          : 'bg-[#f4efe6] border-[#ded7cb] text-[#12271c] hover:bg-[#ede7dc]'
                      }`}
                      onClick={() => setWeek(w)}
                    >
                      W{w}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono font-semibold text-[#506457] uppercase tracking-wider block mb-2">
                  Responsible Jurisdiction
                </label>
                <Select value={selectedAuth} onValueChange={setSelectedAuth}>
                  <SelectTrigger className="bg-[#f4efe6] border-[#ded7cb] text-[#12271c] text-xs h-9">
                    <SelectValue placeholder="Select Authority" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] text-xs">
                    <SelectItem value="all">All Authorities (Citywide Summary)</SelectItem>
                    <SelectItem value="jmc_greater">Jaipur Municipal Corporation (Greater)</SelectItem>
                    <SelectItem value="pwd">PWD Jaipur Division</SelectItem>
                    <SelectItem value="jda">Jaipur Development Authority</SelectItem>
                    <SelectItem value="jmc_heritage">Jaipur Municipal Corporation (Heritage)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 text-xs text-[#506457] pt-3 border-t border-[#ded7cb]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-[#1d4231]" />
                  <span>Include DBSCAN cluster analysis</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-[#1d4231]" />
                  <span>Include before and after repair verification</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-[#1d4231]" />
                  <span>Include SLA breach escalation notices</span>
                </label>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleDownloadPdf} 
                  disabled={generatingPdf} 
                  className="w-full bg-[#1d4231] hover:bg-[#153325] text-[#faf8f4] font-medium py-3 flex items-center justify-center space-x-2 shadow-sm transition-colors text-xs"
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
                <p className="text-[11px] text-center text-[#506457] mt-2 font-mono">
                  Generates branded PDF with executive summary, grade distributions, and methodology.
                </p>
              </div>

            </CardContent>
          </Card>

          {/* Executive Report Preview */}
          <Card className="lg:col-span-2 bg-[#faf8f4] border border-[#ded7cb] shadow-sm overflow-hidden">
            <CardHeader className="border-b border-[#ded7cb] bg-[#f4efe6] pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-bold text-[#12271c]">Executive Report Preview (Week {week})</CardTitle>
                  <CardDescription className="text-xs text-[#506457]">
                    Automated report compilation for Jaipur Transit Corridors
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-[#e8f2ec] text-[#18432d] border-[#bde2cb] font-mono text-[10px]">
                  Ready for Dispatch
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5 bg-[#faf8f4]">
              
              {loading ? (
                <div className="h-64 flex items-center justify-center text-[#506457] font-mono text-xs">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#1d4231]" />
                  Compiling report data...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#f4efe6] rounded-lg border border-[#ded7cb]">
                    <div>
                      <div className="text-[10px] font-mono text-[#506457] uppercase">Roads Monitored</div>
                      <div className="text-2xl font-mono font-bold text-[#12271c]">{metrics?.roads_surveyed.current ?? 20}</div>
                      <div className="text-[11px] text-[#207246] mt-1 font-mono">100% route coverage</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-[#506457] uppercase">Total Potholes</div>
                      <div className="text-2xl font-mono font-bold text-[#12271c]">{metrics?.total_potholes.current || 0}</div>
                      <div className="text-[11px] text-[#506457] mt-1 font-mono">Cluster deduplicated</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-[#506457] uppercase">Dangerous Segments</div>
                      <div className="text-2xl font-mono font-bold text-[#912d1e]">{metrics?.dangerous_segments.current || 0}</div>
                      <div className="text-[11px] text-[#912d1e] mt-1 font-mono">Grade D and E priority</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-[#506457] uppercase">City Avg Risk</div>
                      <div className="text-2xl font-mono font-bold text-[#1d4231]">{metrics?.avg_risk_score.current.toFixed(1) || '0.0'}</div>
                      <div className="text-[11px] text-[#506457] mt-1 font-mono">Index out of 100</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-mono font-semibold text-[#506457] uppercase tracking-wider mb-2">
                      Top Priority Segments in this Cycle
                    </h4>
                    <div className="border border-[#ded7cb] rounded-md overflow-hidden bg-[#faf8f4]">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#f4efe6] text-[11px] font-mono text-[#506457] uppercase border-b border-[#ded7cb]">
                          <tr>
                            <th className="px-4 py-2.5">Segment</th>
                            <th className="px-4 py-2.5">Authority</th>
                            <th className="px-4 py-2.5 text-center">Grade</th>
                            <th className="px-4 py-2.5 text-right">Risk Score</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ede7dc] font-mono">
                          {roads.slice(0, 4).map(r => (
                            <tr key={r.segment_id} className="hover:bg-[#f4efe6]">
                              <td className="px-4 py-2.5 font-medium text-[#12271c] font-sans">
                                {r.road_name} <span className="text-xs text-[#506457] font-normal">({r.sub_name})</span>
                              </td>
                              <td className="px-4 py-2.5 text-[#506457] font-sans">{r.authority_name}</td>
                              <td className="px-4 py-2.5 text-center">
                                <Badge className={
                                  r.current_week?.grade === 'A' ? 'bg-[#e6f4ea] text-[#1e5d3a] border border-[#bde0ca]' :
                                  r.current_week?.grade === 'B' ? 'bg-[#eef8eb] text-[#2f6f34] border border-[#cbe8c6]' :
                                  r.current_week?.grade === 'C' ? 'bg-[#fef4e5] text-[#8c5610] border border-[#f6d7ab]' :
                                  r.current_week?.grade === 'D' ? 'bg-[#faece8] text-[#9b3a1a] border border-[#f2c3b8]' : 
                                  'bg-[#faecea] text-[#912d1e] border border-[#f0c0b8]'
                                }>
                                  {r.current_week?.grade || 'C'}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-[#12271c]">
                                {r.current_week?.risk_score.toFixed(1) || '0.0'}
                              </td>
                              <td className="px-4 py-2.5">
                                <Badge variant="outline" className="capitalize text-[10px] text-[#506457] border-[#ded7cb]">
                                  {(r.current_week?.status || 'none').replace('_', ' ')}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-xs text-[#12271c] bg-[#f4efe6] border border-[#ded7cb] p-3 rounded-lg flex items-start space-x-2">
                    <Sparkles className="h-4 w-4 text-[#a86c18] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#12271c]">Accountability Workflow:</strong> Generated reports are stamped with unique audit identifiers. 
                      Any road segment reaching Grade D or E triggers a 21-day repair SLA countdown with the assigned municipal body.
                    </span>
                  </div>
                </>
              )}

            </CardContent>
          </Card>

        </div>

        {/* Municipal CSV Data Feeds */}
        <Card className="bg-[#faf8f4] border border-[#ded7cb] shadow-sm overflow-hidden">
          <CardHeader className="bg-[#f4efe6] border-b border-[#ded7cb] pb-3">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-[#207246]" />
              <CardTitle className="text-base font-bold text-[#12271c]">Municipal CSV Data Feeds</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#506457]">
              Export structured dataset tables for GIS import, civic analytics, or departmental audits.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 bg-[#faf8f4]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {csvExports.map((item) => (
                <div 
                  key={item.type} 
                  className="border border-[#ded7cb] rounded-lg p-4 bg-[#f4efe6] hover:border-[#1d4231] transition-colors flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="font-semibold text-[#12271c] text-sm">{item.label}</div>
                    <div className="text-xs text-[#506457] mt-1">{item.desc}</div>
                    <code className="text-[11px] text-[#1d4231] bg-[#ede7dc] px-2 py-0.5 rounded mt-2 inline-block font-mono">
                      {item.file}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center space-x-1.5 bg-[#faf8f4] border-[#ded7cb] text-[#12271c] hover:bg-[#ede7dc] text-xs"
                    onClick={() => handleDownloadCsv(item.type, item.file)}
                  >
                    <Download className="h-3.5 w-3.5 text-[#1d4231]" />
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
