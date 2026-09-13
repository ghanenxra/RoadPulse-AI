"use client"

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { MapFeature } from '@/types'
import { getGradeColor } from '@/lib/utils'
import { useRouter } from 'next/navigation'

// Fix bounds component
function FitBounds({ features }: { features: MapFeature[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (features.length === 0) return
    
    try {
      const bounds: [number, number][] = []
      features.forEach(f => {
        f.geometry.coordinates.forEach(coord => {
          bounds.push([coord[0], coord[1]])
        })
      })
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] })
      }
    } catch (e) {
      console.error('Error fitting bounds', e)
    }
  }, [map, features])
  
  return null
}

interface MapComponentProps {
  features: MapFeature[];
  height?: string;
  interactive?: boolean;
}

export default function MapComponent({ features, height = "100%", interactive = true }: MapComponentProps) {
  const router = useRouter()
  
  return (
    <div style={{ height, width: '100%', zIndex: 0 }}>
      <MapContainer 
        center={[26.9124, 75.7873]} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {features.map((feature, i) => {
          const color = getGradeColor(feature.properties.grade)
          
          return (
            <Polyline
              key={`${feature.properties.segment_id}-${i}`}
              positions={feature.geometry.coordinates as [number, number][]}
              pathOptions={{ 
                color, 
                weight: 6,
                opacity: 0.8
              }}
              eventHandlers={{
                click: () => {
                  if (interactive) {
                    router.push(`/roads/${feature.properties.segment_id}`)
                  }
                },
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle({ weight: 8, opacity: 1 });
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle({ weight: 6, opacity: 0.8 });
                }
              }}
            >
              <Tooltip sticky>
                <div className="font-sans">
                  <div className="font-bold">{feature.properties.road_name}</div>
                  <div className="text-sm text-gray-600">{feature.properties.sub_name}</div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span>Grade: <span className="font-bold" style={{color}}>{feature.properties.grade}</span></span>
                    <span className="ml-4">Score: {feature.properties.risk_score.toFixed(1)}</span>
                  </div>
                </div>
              </Tooltip>
            </Polyline>
          )
        })}
        
        <FitBounds features={features} />
      </MapContainer>
    </div>
  )
}
