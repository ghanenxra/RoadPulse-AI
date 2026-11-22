"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Topbar } from "@/components/layout/Topbar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { ProcessingJob } from "@/types"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  FileVideo, CheckCircle2, ArrowRight, Cpu, Zap, RefreshCw, 
  AlertCircle, Loader2, Eye, Copy, Check, Code, MapPin, X, VideoOff, Layers
} from "lucide-react"

export default function ProcessingPage() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  
  // Inspection report & JSON state
  const [inspectingJob, setInspectingJob] = useState<ProcessingJob | null>(null)
  const [jobDetections, setJobDetections] = useState<any[]>([])
  const [loadingDetections, setLoadingDetections] = useState(false)
  const [reportTab, setReportTab] = useState<"table" | "json">("table")
  const [jsonCopied, setJsonCopied] = useState(false)

  async function fetchJobs() {
    try {
      const data = await api.getJobs()
      setJobs(data)
    } catch (e) {
      console.error("Failed to fetch jobs:", e)
    }
  }

  async function handleInspectJob(job: ProcessingJob) {
    setInspectingJob(job)
    setLoadingDetections(true)
    try {
      const dets = await api.getJobDetections(job.job_id)
      setJobDetections(dets)
    } catch (e) {
      console.error("Failed to load detections:", e)
      setJobDetections([])
    } finally {
      setLoadingDetections(false)
    }
  }

  async function handleClearIngested() {
    try {
      const res = await api.clearIngestedData()
      setNotification({
        type: "success",
        message: res.message || "Video ingested data cleared. Preserved all 20 baseline roads & metrics."
      })
      setInspectingJob(null)
      setJobDetections([])
      await fetchJobs()
    } catch (e: any) {
      setNotification({
        type: "error",
        message: `Clear failed: ${e.message}`
      })
    }
  }

  function handleCopyJson() {
    if (!inspectingJob) return
    const telemetryPayload = {
      job_id: inspectingJob.job_id,
      video_id: inspectingJob.video_id,
      vehicle_id: inspectingJob.bus_id,
      inference_provider: inspectingJob.provider,
      status: inspectingJob.status,
      frames_processed: inspectingJob.frames_processed,
      detections_count: jobDetections.length,
      timestamp: inspectingJob.created_at,
      detections: jobDetections
    }
    navigator.clipboard.writeText(JSON.stringify(telemetryPayload, null, 2))
    setJsonCopied(true)
    setTimeout(() => setJsonCopied(false), 2000)
  }

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 4000)
    return () => clearInterval(interval)
  }, [])

  const pipelineSteps = [
    { num: 1, name: "NVDR Video Stored", sub: "Bus Local Storage", status: "Continuous" },
    { num: 2, name: "Charging Depot Sync", sub: "Depot Wi-Fi Link", status: "Auto-Offload" },
    { num: 3, name: "Upload to Cloud", sub: "Batched Ingestion", status: "Depot Link" },
    { num: 4, name: "Metadata Validation", sub: "GPS Timestamp Sync", status: "Verified" },
    { num: 5, name: "Frame Sampling", sub: "30 FPS Keyframes", status: "1 FPS Stride" },
    { num: 6, name: "YOLO Inference", sub: "Pothole Class D40", status: "CUDA GPU" },
    { num: 7, name: "GPS Geocoding", sub: "Coordinate Matching", status: "OSRM Snapped" },
    { num: 8, name: "DBSCAN Cluster", sub: "Multi-Bus Merge", status: "epsilon = 15m" },
    { num: 9, name: "Road Matching", sub: "200m Segments", status: "20 Corridors" },
    { num: 10, name: "Risk Scoring", sub: "Formula Evaluation", status: "0-100 Scale" },
    { num: 11, name: "Report Dispatch", sub: "Municipal Escalation", status: "21-Day SLA" },
  ]

  return (
    <>
      <Topbar title="AI Processing & Ingestion Center" />
      
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {notification && (
          <div className={`p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
            notification.type === "success" 
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300" 
              : "bg-rose-950/40 border-rose-800 text-rose-300"
          }`}>
            <div className="flex items-center space-x-2">
              {notification.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* 1. End-to-End Autonomous Pipeline Architecture */}
        <Card className="bg-[#090d16] border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-[#0f172a] border-b border-slate-800/80 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Cpu className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                  Autonomous Transit-to-Dispatch AI Processing Pipeline
                </CardTitle>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-wider font-mono font-semibold self-start sm:self-auto">
                Autonomous Pipeline Active
              </Badge>
            </div>
            <CardDescription className="text-slate-400 text-xs">
              Continuous edge-to-cloud road health intelligence sequence running automatically upon daily transit bus charging depot returns.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 bg-[#090d16]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-2 text-center text-xs">
              {pipelineSteps.map((step) => (
                <div 
                  key={step.num}
                  className="bg-[#0f172a]/80 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between items-center hover:border-cyan-500/40 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-mono font-bold text-[10px] mb-1">
                    {step.num}
                  </div>
                  <div className="font-semibold text-slate-200 text-[11px] leading-tight">{step.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{step.sub}</div>
                  <div className="mt-1.5 text-[9px] font-mono bg-slate-900 text-cyan-300 border border-slate-800 px-1 py-0.5 rounded font-medium">
                    {step.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 2. Pipeline Architecture & Model Specifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#090d16] border-slate-800 p-4">
            <div className="flex items-center space-x-2 text-cyan-400 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">Inference Engine</span>
            </div>
            <div className="text-sm font-bold text-slate-100">Custom Fine-Tuned YOLOv8</div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">Yolov8-fintuned-on-potholes.pt</div>
            <div className="mt-2 text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded inline-block font-mono font-semibold">
              CUDA GPU / CPU Accelerated
            </div>
          </Card>

          <Card className="bg-[#090d16] border-slate-800 p-4">
            <div className="flex items-center space-x-2 text-blue-400 mb-1">
              <FileVideo className="h-4 w-4" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">Frame Decimation</span>
            </div>
            <div className="text-sm font-bold text-slate-100">30-Frame Stride (~1 FPS)</div>
            <div className="text-[11px] text-slate-400 mt-1">Filters redundant stationary frames</div>
            <div className="mt-2 text-[10px] bg-blue-950/40 text-blue-400 border border-blue-800/80 px-2 py-0.5 rounded inline-block font-mono font-semibold">
              96.7% Compute Reduction
            </div>
          </Card>

          <Card className="bg-[#090d16] border-slate-800 p-4">
            <div className="flex items-center space-x-2 text-purple-400 mb-1">
              <Layers className="h-4 w-4" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">Spatial Deduplication</span>
            </div>
            <div className="text-sm font-bold text-slate-100">DBSCAN Spatial Clustering</div>
            <div className="text-[11px] text-slate-400 mt-1">Epsilon radius: 15 meters</div>
            <div className="mt-2 text-[10px] bg-purple-950/40 text-purple-400 border border-purple-800/80 px-2 py-0.5 rounded inline-block font-mono font-semibold">
              Multi-Pass Sightings Merged
            </div>
          </Card>

          <Card className="bg-[#090d16] border-slate-800 p-4">
            <div className="flex items-center space-x-2 text-teal-400 mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">Road Snapping</span>
            </div>
            <div className="text-sm font-bold text-slate-100">OSRM + OpenStreetMap</div>
            <div className="text-[11px] text-slate-400 mt-1">Stitches to 20 Jaipur corridors</div>
            <div className="mt-2 text-[10px] bg-teal-950/40 text-teal-400 border border-teal-800/80 px-2 py-0.5 rounded inline-block font-mono font-semibold">
              Real Carriageway Vectors
            </div>
          </Card>
        </div>

        {/* 3. Ingestion Job Queue & Results Log */}
        <Card className="bg-[#090d16] border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-800/80 gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-100">Ingestion Job Queue & Results Log</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Autonomous tracking of bus dashcam runs, frame inference progress, and detected pothole telemetry
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearIngested}
                className="text-xs h-8 bg-amber-950/20 text-amber-400 border-amber-800/60 hover:bg-amber-900/30"
              >
                <VideoOff className="h-3.5 w-3.5 mr-1 text-amber-400" /> Reset Ingested Data
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchJobs} 
                className="text-xs h-8 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] font-mono text-slate-400 uppercase bg-[#0f172a] border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Job ID</th>
                    <th className="px-5 py-3">Transit Bus</th>
                    <th className="px-5 py-3">Inference Engine</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 w-1/5">Progress</th>
                    <th className="px-5 py-3 text-right">Detections</th>
                    <th className="px-5 py-3 text-right">Timestamp</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                        No processing jobs logged. Video feeds offload automatically upon transit bus charging connection.
                      </td>
                    </tr>
                  ) : (
                    jobs.slice(0, 10).map((job) => (
                      <tr 
                        key={job.job_id} 
                        className={`hover:bg-slate-800/30 transition-colors ${
                          inspectingJob?.job_id === job.job_id ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-200">
                          {job.job_id}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-300">
                          {job.bus_id || 'BUS-1'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          <code className="text-[11px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-cyan-400 font-mono">
                            {job.provider || 'yolov8_local'}
                          </code>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className={
                            job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[10px]' :
                            job.status === 'processing' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono text-[10px]' : 
                            'bg-slate-800 text-slate-400 border border-slate-700 font-mono text-[10px]'
                          }>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2">
                            <Progress value={job.progress} className="h-1.5 flex-1 bg-slate-800" />
                            <span className="text-[11px] font-mono text-slate-400 w-9 text-right">
                              {Math.round(job.progress)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-xs text-slate-200">
                          {job.detections_count} potholes
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs text-slate-400 font-mono">
                          {job.created_at ? job.created_at.split('T')[0] : 'Just now'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <Button 
                            size="sm" 
                            variant={inspectingJob?.job_id === job.job_id ? "default" : "outline"}
                            className={`text-xs h-7 px-2.5 ${
                              inspectingJob?.job_id === job.job_id 
                                ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                            }`}
                            onClick={() => handleInspectJob(job)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> Inspect Log
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 4. AI Detection Report & Forensic Telemetry Log Modal / Drawer */}
        {inspectingJob && (
          <Card className="bg-[#090d16] border border-cyan-500/30 shadow-lg overflow-hidden">
            <CardHeader className="bg-[#0f172a] border-b border-slate-800 pb-3 flex flex-row items-center justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Cpu className="h-5 w-5 text-cyan-400" />
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-100">
                    AI Inspection Report: {inspectingJob.job_id}
                  </CardTitle>
                  <Badge className={`font-mono text-[10px] ${
                    inspectingJob.provider === 'yolov8_local' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}>
                    {inspectingJob.provider === 'yolov8_local' ? 'Real YOLOv8 (Local GPU)' : 'Synthetic / Demo Fallback'}
                  </Badge>
                </div>
                <CardDescription className="text-slate-400 text-xs mt-0.5">
                  {inspectingJob.provider === 'yolov8_local'
                    ? `Generated by fine-tuned local YOLOv8 neural network for ${inspectingJob.bus_id || 'Transit Bus'}`
                    : `Simulated demo telemetry for ${inspectingJob.bus_id || 'Transit Bus'}`}
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setInspectingJob(null)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400 font-mono font-medium">Potholes Detected</div>
                  <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
                    {jobDetections.length || inspectingJob.detections_count}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono font-semibold mt-0.5">Class: Potholes</div>
                </div>

                <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400 font-mono font-medium">Average Confidence</div>
                  <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                    {jobDetections.length > 0 
                      ? `${Math.round((jobDetections.reduce((a, b) => a + (b.confidence || 0), 0) / jobDetections.length) * 100)}%`
                      : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Model Certainty</div>
                </div>

                <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400 font-mono font-medium">Average Severity</div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                    {jobDetections.length > 0
                      ? `${(jobDetections.reduce((a, b) => a + (b.severity || 0), 0) / jobDetections.length).toFixed(1)} / 5.0`
                      : 'N/A'}
                  </div>
                  <div className="text-[10px] text-amber-400/80 font-mono font-semibold mt-0.5">
                    {jobDetections.length > 0 ? "Visual Size Proxy" : "No Detections"}
                  </div>
                </div>

                <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400 font-mono font-medium">Measured Depth</div>
                  <div className="text-xl font-bold font-mono text-slate-200 mt-0.5">
                    {jobDetections.length > 0 && jobDetections.some(d => d.depth_cm !== null && d.depth_cm !== undefined)
                      ? `${(jobDetections.reduce((a, b) => a + (b.depth_cm || 0), 0) / Math.max(1, jobDetections.filter(d => d.depth_cm !== null && d.depth_cm !== undefined).length)).toFixed(1)} cm`
                      : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {jobDetections.some(d => d.depth_cm !== null && d.depth_cm !== undefined)
                      ? "Sensor Depth Measured"
                      : "2D Monocular Camera"}
                  </div>
                </div>
              </div>

              {/* View Switcher & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant={reportTab === 'table' ? 'default' : 'outline'}
                    onClick={() => setReportTab('table')}
                    className={`text-xs h-8 ${
                      reportTab === 'table' 
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <FileVideo className="h-3.5 w-3.5 mr-1" /> Detection Log & Bounding Boxes
                  </Button>
                  <Button 
                    size="sm" 
                    variant={reportTab === 'json' ? 'default' : 'outline'}
                    onClick={() => setReportTab('json')}
                    className={`text-xs h-8 ${
                      reportTab === 'json' 
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Code className="h-3.5 w-3.5 mr-1" /> Raw Telemetry JSON
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  {reportTab === 'json' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCopyJson}
                      className="text-xs h-8 bg-slate-900 border-slate-800 text-cyan-400 hover:bg-slate-800"
                    >
                      {jsonCopied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      {jsonCopied ? 'Copied to Clipboard' : 'Copy JSON Telemetry'}
                    </Button>
                  )}
                  <Link 
                    href="/map"
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium px-3 py-1.5 rounded-md flex items-center transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 mr-1 text-cyan-400" /> View on Live Map
                  </Link>
                </div>
              </div>

              {/* Tab 1: Detections Table */}
              {reportTab === 'table' && (
                <div className="border border-slate-800 rounded-lg overflow-x-auto bg-[#0f172a]">
                  {loadingDetections ? (
                    <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                      <span className="text-xs font-mono">Loading detection telemetry from database...</span>
                    </div>
                  ) : jobDetections.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs font-mono">
                      No individual pothole coordinates logged for this session.
                    </div>
                  ) : (
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#090d16] text-slate-400 font-mono uppercase border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2.5">#</th>
                          <th className="px-3 py-2.5">Frame #</th>
                          <th className="px-3 py-2.5">Confidence</th>
                          <th className="px-3 py-2.5">Severity</th>
                          <th className="px-3 py-2.5">Measured Depth</th>
                          <th className="px-3 py-2.5 font-mono">Bounding Box [x, y, w, h]</th>
                          <th className="px-3 py-2.5 font-mono">Coordinates & Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {jobDetections.map((det, idx) => (
                          <tr key={det.detection_id || idx} className="hover:bg-slate-800/40">
                            <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                            <td className="px-3 py-2 font-bold text-slate-200">
                              Frame {det.frame_number ?? 'Keyframe'}
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-semibold text-cyan-400">
                                {det.confidence !== undefined ? `${Math.round(det.confidence * 100)}%` : 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <Badge className={
                                det.severity_label === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px]' :
                                det.severity_label === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px]' :
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]'
                              }>
                                {det.severity_label || 'Moderate'} ({det.severity?.toFixed(1) || '0.0'})
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {det.depth_cm !== null && det.depth_cm !== undefined ? `${det.depth_cm} cm` : (
                                <span className="text-slate-500 italic font-sans text-[11px]">N/A (Optical)</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-400 text-[11px]">
                              {det.bbox || 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-slate-300 text-[11px]">
                              {det.latitude !== undefined && det.latitude !== null ? (
                                <div>
                                  <span>{det.latitude.toFixed(5)}, {det.longitude.toFixed(5)}</span>
                                  <span className="block text-[9px] text-slate-500 font-sans">
                                    {det.data_source === 'yolo_interpolated_corridor' ? 'Corridor Snapped' : (det.data_source || 'Telemetry')}
                                  </span>
                                </div>
                              ) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 2: Raw Telemetry JSON */}
              {reportTab === 'json' && (
                <div className="relative">
                  <pre className="bg-[#05080f] text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-96 border border-slate-800">
                    {JSON.stringify({
                      inspection_report: {
                        job_id: inspectingJob.job_id,
                        video_id: inspectingJob.video_id,
                        transit_vehicle: inspectingJob.bus_id || 'BUS-1',
                        inference_provider: inspectingJob.provider || 'yolov8_local',
                        status: inspectingJob.status,
                        created_at: inspectingJob.created_at,
                        completed_at: inspectingJob.completed_at,
                        total_potholes_detected: jobDetections.length || inspectingJob.detections_count,
                        detections: jobDetections.map((d, i) => ({
                          id: d.detection_id || `D-${i+1}`,
                          frame: d.frame_number,
                          confidence: d.confidence,
                          severity_score: d.severity,
                          severity_class: d.severity_label,
                          depth_cm: d.depth_cm,
                          bounding_box: typeof d.bbox === 'string' ? JSON.parse(d.bbox || '[]') : d.bbox,
                          gps_coordinates: {
                            lat: d.latitude,
                            lng: d.longitude
                          }
                        }))
                      }
                    }, null, 2)}
                  </pre>
                </div>
              )}

            </CardContent>
          </Card>
        )}

      </div>
    </>
  )
}
