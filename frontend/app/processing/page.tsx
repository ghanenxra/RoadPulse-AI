"use client"

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { ProcessingJob } from '@/types'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export default function ProcessingPage() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  
  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await api.getJobs()
        setJobs(data)
      } catch (e) {
        console.error(e)
      }
    }
    fetchJobs()
    const interval = setInterval(fetchJobs, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSimulateUpload = async () => {
    try {
      await api.simulateUpload()
      // Jobs will refresh automatically
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <Topbar title="Processing Center" />
      <div className="p-6 space-y-6">
        
        <Card>
          <CardHeader>
            <CardTitle>Data Ingestion</CardTitle>
            <CardDescription>Upload video data from transit vehicles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center bg-gray-50">
              <p className="text-gray-500 mb-4">Drag and drop video files here, or click to select</p>
              <Button disabled variant="secondary">Select Files</Button>
            </div>
            <div className="flex justify-between items-center bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div>
                <h4 className="font-medium text-amber-900">Demo Mode</h4>
                <p className="text-sm text-amber-700">Simulate a video upload and AI processing pipeline.</p>
              </div>
              <Button onClick={handleSimulateUpload} className="bg-amber-600 hover:bg-amber-700">Simulate Upload</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Job ID</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 w-1/4">Progress</th>
                    <th className="px-4 py-3">Detections</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No jobs found</td></tr>
                  ) : (
                    jobs.map(job => (
                      <tr key={job.job_id} className="border-b">
                        <td className="px-4 py-3 font-mono text-xs">{job.job_id.substring(0,8)}...</td>
                        <td className="px-4 py-3">Bus {job.bus_id}</td>
                        <td className="px-4 py-3">
                          <Badge variant={job.status === 'completed' ? 'default' : job.status === 'processing' ? 'secondary' : 'destructive'}>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <Progress value={job.progress} className="h-2" />
                            <span className="text-xs text-gray-500 w-8">{Math.round(job.progress)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{job.detections_count}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(job.created_at).toLocaleString()}</td>
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
