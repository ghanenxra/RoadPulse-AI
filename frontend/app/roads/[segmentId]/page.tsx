"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { RoadSegment, MapFeature } from '@/types'
import { generateNarrative, getGradeColor } from '@/lib/utils'
import { ArrowLeft, MapPin, Camera, Download, FileText } from 'lucide-react'
import dynamic from 'next/dynamic'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })

export default function RoadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const segmentId = params.segmentId as string
  
  const [road, setRoad] = useState<RoadSegment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getRoadDetail(segmentId)
        setRoad(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (segmentId) loadData()
  }, [segmentId])

  if (loading) return <div>Loading...</div>
  if (!road) return <div>Road not found.</div>

  const feature: MapFeature = {
    type: 'Feature',
    properties: {
      segment_id: road.segment_id,
      road_name: road.road_name,
      sub_name: road.sub_name,
      risk_score: road.current_week.risk_score,
      grade: road.current_week.grade,
      pothole_count: road.current_week.pothole_count,
      authority: road.authority_name,
      status: road.current_week.status,
      weekly_change: road.current_week.weekly_change
    },
    geometry: {
      type: 'LineString',
      coordinates: (road.coords && road.coords.length > 0
        ? road.coords
        : [[road.start_lat, road.start_lon], [road.end_lat, road.end_lon]]
      ).map(c => [c[1], c[0]])
    }
  }

  const chartData = road.weeks.map(w => ({
    name: `Week ${w.week}`,
    potholes: w.pothole_count,
    risk: w.risk_score,
    grade: w.grade
  }))

  const narrative = generateNarrative(road.weeks)

  return (
    <>
      <Topbar title="Road Details" />
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header Section */}
        <div className="flex items-center space-x-4 mb-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{road.road_name}</h1>
            <p className="text-gray-500">{road.sub_name} • ID: {road.segment_id}</p>
          </div>
          <div className="text-right">
            <Badge style={{ backgroundColor: getGradeColor(road.current_week.grade), color: 'white' }} className="text-lg px-4 py-1">
              Grade {road.current_week.grade}
            </Badge>
            <div className="text-sm font-medium text-gray-500 mt-1">Risk Score: {road.current_week.risk_score.toFixed(1)}</div>
          </div>
        </div>

        {/* Narrative & Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="p-4">
                <p className="text-blue-900 leading-relaxed font-medium">
                  {narrative}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricBox label="Potholes" value={road.current_week.pothole_count} />
              <MetricBox label="Severe" value={road.current_week.severe_count} />
              <MetricBox label="Density (/km)" value={road.current_week.density.toFixed(1)} />
              <MetricBox label="Change" value={`${road.current_week.weekly_change > 0 ? '+' : ''}${road.current_week.weekly_change.toFixed(1)}`} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly History</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#ff7300" />
                    <RechartsTooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="potholes" fill="#8884d8" name="Total Potholes" />
                    <Line yAxisId="right" type="monotone" dataKey="risk" stroke="#ff7300" name="Risk Score" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photographic Evidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="aspect-video bg-slate-100 rounded border border-dashed flex flex-col items-center justify-center text-slate-400">
                      <Camera className="h-6 w-6 mb-2 opacity-50" />
                      <span className="text-xs text-center px-2">Evidence unavailable<br/>(Simulated demo)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-md flex items-center"><MapPin className="h-4 w-4 mr-2"/> Location</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-64 border-t">
                <MapComponent features={[feature]} height="100%" interactive={false} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Authority Action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Responsible Authority</div>
                  <div className="font-semibold">{road.authority_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Ward</div>
                  <div className="font-semibold">{road.ward}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Current Status</div>
                  <Badge variant="outline" className="mt-1 capitalize text-sm">{road.current_week.status.replace('_', ' ')}</Badge>
                </div>
                <div className="pt-4 space-y-2">
                  <Button className="w-full" variant="outline"><FileText className="h-4 w-4 mr-2" /> Generate Report</Button>
                  <Button className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" /> Export Data</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

function MetricBox({ label, value }: { label: string, value: string|number }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}
