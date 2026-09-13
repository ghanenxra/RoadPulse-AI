"use client"

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { RoadSegment } from '@/types'
import { getGradeColor } from '@/lib/utils'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

export default function RoadsPage() {
  const [roads, setRoads] = useState<RoadSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getRoads()
        setRoads(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredRoads = roads.filter(r => 
    r.road_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.sub_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.segment_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      <Topbar title="Road Segments" />
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              type="text" 
              placeholder="Search roads..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading road segments...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3">Road Name</th>
                      <th className="px-6 py-3">Segment ID</th>
                      <th className="px-6 py-3">Grade</th>
                      <th className="px-6 py-3">Risk Score</th>
                      <th className="px-6 py-3">Potholes</th>
                      <th className="px-6 py-3">Authority</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoads.map(road => (
                      <tr key={road.segment_id} className="border-b hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium">
                          {road.road_name}
                          <div className="text-xs text-gray-500 font-normal">{road.sub_name}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{road.segment_id}</td>
                        <td className="px-6 py-4">
                          <Badge style={{ backgroundColor: getGradeColor(road.current_week.grade), color: 'white' }}>
                            {road.current_week.grade}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-semibold">{road.current_week.risk_score.toFixed(1)}</td>
                        <td className="px-6 py-4">{road.current_week.pothole_count}</td>
                        <td className="px-6 py-4">{road.authority_name}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="capitalize">{road.current_week.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/roads/${road.segment_id}`} className="text-blue-600 hover:underline font-medium">View Details</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
