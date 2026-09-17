"use client"

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { ProcessingJob } from '@/types'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  UploadCloud, FileVideo, CheckCircle2, ArrowRight, 
  Cpu, HardDrive, Zap, Play, RefreshCw, AlertCircle, Loader2, Sparkles
} from 'lucide-react'

export default function ProcessingPage() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [uploading, setUploading] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [selectedBus, setSelectedBus] = useState('BUS-1')
  const [selectedStation, setSelectedStation] = useState('CS-1')
  const [selectedSegment, setSelectedSegment] = useState('TR-01')
  const [dragActive, setDragActive] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function fetchJobs() {
    try {
      const data = await api.getJobs()
      setJobs(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true)
      setNotification(null)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bus_id', selectedBus)
      formData.append('station_id', selectedStation)
      formData.append('road_segment_id', selectedSegment)
      
      const res = await api.uploadVideo(formData)
      setActiveJobId(res.job_id)
      setNotification({
        type: 'success',
        message: `'${file.name}' uploaded → YOLO running on your local GPU for segment ${selectedSegment}. Job ${res.job_id} in progress.`
      })
      await fetchJobs()
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: `Upload failed: ${e.message}`
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSimulateUpload = async () => {
    try {
      setSimulating(true)
      setNotification(null)
      const res = await api.simulateUpload()
      setNotification({
        type: 'success',
        message: res.message || 'Simulated YOLO ingestion complete. 14 potholes detected on Tonk Road.'
      })
      await fetchJobs()
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: `Simulation failed: ${e.message}`
      })
    } finally {
      setSimulating(false)
    }
  }

  const pipelineSteps = [
    { num: 1, name: 'NVDR Video Stored', sub: 'Bus Local Storage' },
    { num: 2, name: 'Charging Station Sync', sub: 'Depot Wi-Fi Link' },
    { num: 3, name: 'Upload to Server', sub: 'Batched Ingestion' },
    { num: 4, name: 'Metadata Validation', sub: 'GPS Timestamp Sync' },
    { num: 5, name: 'Frame Sampling', sub: '30 FPS Keyframes' },
    { num: 6, name: 'YOLO Inference', sub: 'Pothole Class D40' },
    { num: 7, name: 'GPS Geocoding', sub: 'Coordinate Matching' },
    { num: 8, name: 'DBSCAN Cluster', sub: 'Multi-Bus Merge' },
    { num: 9, name: 'Road Matching', sub: '200m Segments' },
    { num: 10, name: 'Risk Scoring', sub: 'Formula Evaluation' },
    { num: 11, name: 'Report Dispatch', sub: 'Municipal Escalation' },
  ]

  return (
    <>
      <Topbar title="Video Ingestion & AI Processing Center" />
      
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {notification && (
          <div className={`p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            notification.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {notification.type === 'success' && (
                <>
                  <Link 
                    href={`/roads/${selectedSegment}`}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-md shadow-xs flex items-center transition-colors"
                  >
                    View Road <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                  <Link 
                    href="/map"
                    className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-medium px-3 py-1.5 rounded-md border border-slate-200 shadow-xs transition-colors"
                  >
                    View Map
                  </Link>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => setNotification(null)}>Dismiss</Button>
            </div>
          </div>
        )}

        <Card className="shadow-sm border">
          <CardHeader className="bg-slate-900 text-white rounded-t-lg pb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-base">NVDR Dashcam Offline Ingestion Pipeline</CardTitle>
            </div>
            <CardDescription className="text-slate-300 text-xs">
              Near-real-time road health intelligence architecture powered by daily bus charging depot connections
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 bg-slate-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-2 text-center text-xs">
              {pipelineSteps.map((step) => (
                <div 
                  key={step.num}
                  className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between items-center shadow-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] mb-1">
                    {step.num}
                  </div>
                  <div className="font-semibold text-slate-800 text-[11px] leading-tight">{step.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{step.sub}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <Card className="lg:col-span-2 shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Front Dashcam Footage Ingestion</CardTitle>
              <CardDescription className="text-xs">
                Upload bus front-camera footage (MP4/MOV) with embedded GPS telemetry for offline inference.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/50' 
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  Drag and drop bus video footage here
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Supports MP4, MOV, or MKV camera files up to 500 MB. Metadata sidecar parsed automatically.
                </p>

                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Demo Video Ready: <code className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-blue-200">sample_data/sample_dashcam_pothole_clip.mp4</code></span>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="video/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }} 
                />

                <div className="mt-4 flex items-center space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileVideo className="h-3.5 w-3.5 mr-1 text-blue-600" />}
                    Browse Files
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Transit Bus ID</label>
                  <select 
                    value={selectedBus} 
                    onChange={(e) => setSelectedBus(e.target.value)}
                    className="w-full text-xs border rounded-md p-2 bg-white font-medium"
                  >
                    <option value="BUS-1">BUS-1 (Route 11: Tonk Rd)</option>
                    <option value="BUS-2">BUS-2 (Route 12: Ajmer Rd)</option>
                    <option value="BUS-3">BUS-3 (Route 13: Sikar Rd)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Charging Depot</label>
                  <select 
                    value={selectedStation} 
                    onChange={(e) => setSelectedStation(e.target.value)}
                    className="w-full text-xs border rounded-md p-2 bg-white font-medium"
                  >
                    <option value="CS-1">CS-1: JCTSL Sanganer Hub</option>
                    <option value="CS-2">CS-2: Vidhyadhar Depot</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Road Segment</label>
                  <select 
                    value={selectedSegment} 
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className="w-full text-xs border rounded-md p-2 bg-white font-medium"
                  >
                    <option value="TR-01">TR-01: Tonk Road</option>
                    <option value="AJ-01">AJ-01: Ajmer Road</option>
                    <option value="SR-01">SR-01: Sikar Road</option>
                    <option value="JLN-01">JLN-01: JLN Marg</option>
                    <option value="JG-01">JG-01: Jawahar Circle</option>
                    <option value="CL-01">CL-01: Civil Lines</option>
                    <option value="MI-01">MI-01: MI Road</option>
                    <option value="VN-01">VN-01: Vidhyadhar Nagar</option>
                  </select>
                </div>
              </div>

            </CardContent>
          </Card>

          <Card className="shadow-sm border flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">YOLO Inference Engine</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Modular AI detection boundary ready for lightweight edge / server model deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="text-xs space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Provider:</span>
                  <span className="font-semibold text-emerald-700">YOLOv8 Local GPU ✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Model:</span>
                  <span className="font-semibold text-slate-800">Yolov8-fintuned-on-potholes.pt</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sampling Rate:</span>
                  <span className="font-semibold text-slate-800">Every 30th frame (~1fps)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Confidence Threshold:</span>
                  <span className="font-semibold text-slate-800">0.35 minimum</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Clustering:</span>
                  <span className="font-semibold text-slate-800">DBSCAN (eps=15m)</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <strong>Ideathon Demo Shortcut:</strong> Simulate a complete bus footage ingestion cycle with 14 detected potholes.
              </div>

              <Button
                type="button"
                onClick={handleSimulateUpload}
                disabled={simulating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 flex items-center justify-center space-x-2"
              >
                {simulating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing Ingestion Job...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>Trigger Simulated Ingestion Run</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

        </div>

        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row justify-between items-center pb-3">
            <div>
              <CardTitle className="text-base">Ingestion Job Queue & Results Log</CardTitle>
              <CardDescription className="text-xs">
                Real-time tracking of uploaded dashcam batches, frame progress, and pothole detection counts
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchJobs}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-y">
                  <tr>
                    <th className="px-5 py-3">Job ID</th>
                    <th className="px-5 py-3">Vehicle</th>
                    <th className="px-5 py-3">Inference Provider</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 w-1/5">Progress</th>
                    <th className="px-5 py-3 text-right">Detections</th>
                    <th className="px-5 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-500">No processing jobs logged.</td>
                    </tr>
                  ) : (
                    jobs.slice(0, 10).map((job) => (
                      <tr key={job.job_id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-900">
                          {job.job_id}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-800">
                          {job.bus_id || 'BUS-1'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-600">
                          <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                            {job.provider || 'mock_yolo_v8'}
                          </code>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className={
                            job.status === 'completed' ? 'bg-emerald-500 text-white' :
                            job.status === 'processing' ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white'
                          }>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2">
                            <Progress value={job.progress} className="h-1.5 flex-1" />
                            <span className="text-[11px] font-mono text-gray-500 w-9 text-right">
                              {Math.round(job.progress)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-xs text-slate-900">
                          {job.detections_count} potholes
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs text-gray-500 font-mono">
                          {job.created_at ? job.created_at.split('T')[0] : 'Just now'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  )
}
