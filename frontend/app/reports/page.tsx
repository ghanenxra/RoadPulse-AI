"use client"

import React, { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
      const url = api.getPDFReportUrl(week)
      const link = document.createElement('a')
      link.href = url
      link.download = `roadpulse_weekly_w${week}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setFeedback({ type: 'success', message: `Official ReportLab PDF report for Week ${week} downloaded successfully.` })
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to download PDF report: ${e.message}` })
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDownloadCsv = (type: string, filename: string) => {
    const url = api.getCSVExportUrl(type, week)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setFeedback({ type: 'success', message: `Exported ${filename} successfully.` })
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
      
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {feedback && (
          <div className={`p-4 rounded-lg flex items-center justify-between ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFeedback(null)}>Dismiss</Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <Card className="lg:col-span-1 shadow-sm">
            <CardHeader className="bg-slate-900 text-white rounded-t-lg">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-lg">Report Generator</CardTitle>
              </div>
              <CardDescription className="text-slate-300">
                Compile executive summaries, deterioration analytics, and repair verification audits.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Survey Cycle (Week)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(w => (
                    <Button
                      key={w}
                      type="button"
                      variant={week === w ? 'default' : 'outline'}
                      className={week === w ? 'bg-blue-600 text-white font-bold' : 'text-gray-700'}
                      onClick={() => setWeek(w)}
                    >
                      Week {w}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Responsible Jurisdiction
                </label>
                <select
                  value={selectedAuth}
                  onChange={(e) => setSelectedAuth(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Authorities (Citywide Summary)</option>
                  <option value="jmc_greater">Jaipur Municipal Corporation (Greater)</option>
                  <option value="pwd">PWD Jaipur Division</option>
                  <option value="jda">Jaipur Development Authority</option>
                  <option value="jmc_heritage">Jaipur Municipal Corporation (Heritage)</option>
                </select>
              </div>

              <div className="space-y-2 text-sm text-gray-600 pt-2 border-t">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                  <span>Include DBSCAN cluster analysis</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                  <span>Include before/after repair verification</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                  <span>Include SLA breach escalation notices</span>
                </label>
              </div>

              <div className="pt-3">
                <Button 
                  onClick={handleDownloadPdf} 
                  disabled={generatingPdf} 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 flex items-center justify-center space-x-2 shadow"
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating ReportLab PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 text-blue-400" />
                      <span>Download Official PDF Report</span>
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-gray-500 mt-2">
                  Generates branded PDF with executive summary, grade distributions, and methodology.
                </p>
              </div>

            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="border-b bg-gray-50/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Executive Report Preview — Week {week}</CardTitle>
                  <CardDescription>
                    Automated report compilation for Jaipur Transit Corridors
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Ready for Dispatch
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Compiling report data...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border">
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Roads Monitored</div>
                      <div className="text-2xl font-bold text-slate-900">{metrics?.roads_surveyed.current ?? 20}</div>
                      <div className="text-xs text-emerald-600 mt-1">100% route coverage</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Total Potholes</div>
                      <div className="text-2xl font-bold text-slate-900">{metrics?.total_potholes.current || 0}</div>
                      <div className="text-xs text-gray-500 mt-1">Cluster deduplicated</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Dangerous Segments</div>
                      <div className="text-2xl font-bold text-rose-600">{metrics?.dangerous_segments.current || 0}</div>
                      <div className="text-xs text-rose-500 mt-1">Grade D / E priority</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase">City Avg Risk</div>
                      <div className="text-2xl font-bold text-slate-900">{metrics?.avg_risk_score.current.toFixed(1) || 0}</div>
                      <div className="text-xs text-gray-500 mt-1">Index out of 100</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Top Priority Segments in this Cycle
                    </h4>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-xs text-gray-600 uppercase">
                          <tr>
                            <th className="px-4 py-2">Segment</th>
                            <th className="px-4 py-2">Authority</th>
                            <th className="px-4 py-2 text-center">Grade</th>
                            <th className="px-4 py-2 text-right">Risk Score</th>
                            <th className="px-4 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {roads.slice(0, 4).map(r => (
                            <tr key={r.segment_id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium text-slate-900">
                                {r.road_name} <span className="text-xs text-gray-500 font-normal">({r.sub_name})</span>
                              </td>
                              <td className="px-4 py-2 text-gray-600">{r.authority_name}</td>
                              <td className="px-4 py-2 text-center">
                                <Badge className={
                                  r.current_week?.grade === 'A' ? 'bg-emerald-500' :
                                  r.current_week?.grade === 'B' ? 'bg-lime-500' :
                                  r.current_week?.grade === 'C' ? 'bg-amber-500' :
                                  r.current_week?.grade === 'D' ? 'bg-orange-500' : 'bg-rose-500'
                                }>
                                  {r.current_week?.grade || 'C'}
                                </Badge>
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-bold">
                                {r.current_week?.risk_score.toFixed(1) || '0.0'}
                              </td>
                              <td className="px-4 py-2">
                                <Badge variant="outline" className="capitalize text-xs">
                                  {(r.current_week?.status || 'none').replace('_', ' ')}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 p-3 rounded flex items-start space-x-2">
                    <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Accountability Workflow:</strong> Generated reports are stamped with unique audit identifiers. 
                      Any road segment reaching Grade D or E triggers a 21-day repair SLA countdown with the assigned municipal body.
                    </span>
                  </div>
                </>
              )}

            </CardContent>
          </Card>

        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Municipal CSV Data Feeds</CardTitle>
            </div>
            <CardDescription>
              Export structured dataset tables for GIS import, civic analytics, or departmental audits.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {csvExports.map((item) => (
                <div 
                  key={item.type} 
                  className="border rounded-lg p-4 bg-white hover:border-slate-400 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                    <code className="text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-2 inline-block">
                      {item.file}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center space-x-1.5 hover:bg-slate-50"
                    onClick={() => handleDownloadCsv(item.type, item.file)}
                  >
                    <Download className="h-3.5 w-3.5 text-gray-600" />
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
