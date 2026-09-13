"use client"

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { api } from '@/lib/api'
import { MapFeature } from '@/types'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })

export default function MapPage() {
  const [features, setFeatures] = useState<MapFeature[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getMapData()
        if (data && data.features) {
          setFeatures(data.features)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Topbar title="Road Health Map" />
      
      <div className="flex-1 flex flex-row h-full relative">
        {/* Left Sidebar Filters */}
        <div className="w-80 bg-white border-r p-4 overflow-y-auto z-10 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2 text-slate-700">Health Grade</h3>
              <div className="space-y-2">
                {['A', 'B', 'C', 'D', 'E'].map(grade => (
                  <label key={grade} className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                    <span>Grade {grade}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2 text-slate-700">Authority</h3>
              <select className="w-full border border-gray-300 rounded p-2 text-sm">
                <option>All Authorities</option>
                <option>JMC Greater</option>
                <option>JMC Heritage</option>
                <option>PWD</option>
                <option>JDA</option>
              </select>
            </div>
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 bg-slate-100 relative h-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">Loading map data...</div>
          ) : (
            <MapComponent features={features} />
          )}
          
          {/* Legend */}
          <div className="absolute bottom-6 right-6 bg-white p-4 rounded-lg shadow-lg z-[1000]">
            <h4 className="font-semibold text-sm mb-2">Health Grades</h4>
            <div className="space-y-1">
              <div className="flex items-center"><span className="w-4 h-4 bg-green-500 rounded mr-2"></span><span className="text-sm">A (Good)</span></div>
              <div className="flex items-center"><span className="w-4 h-4 bg-lime-500 rounded mr-2"></span><span className="text-sm">B (Fair)</span></div>
              <div className="flex items-center"><span className="w-4 h-4 bg-yellow-500 rounded mr-2"></span><span className="text-sm">C (Moderate)</span></div>
              <div className="flex items-center"><span className="w-4 h-4 bg-orange-500 rounded mr-2"></span><span className="text-sm">D (Poor)</span></div>
              <div className="flex items-center"><span className="w-4 h-4 bg-red-500 rounded mr-2"></span><span className="text-sm">E (Dangerous)</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
