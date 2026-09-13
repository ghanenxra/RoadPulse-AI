"use client"

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { MapFeature } from '@/types'
import { getGradeColor } from '@/lib/utils'
import { useRouter } from 'next/navigation'

function FitBounds({ features }: { features: MapFeature[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (!features || features.length === 0) return
    
    try {
      const bounds: [number, number][] = []
      features.forEach(f => {
        f.geometry.coordinates.forEach(coord => {
          // GeoJSON is [lon, lat], Leaflet is [lat, lon]
          bounds.push([coord[1], coord[0]])
        })
      })
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30] })
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {features.map((feature, i) => {
          const color = getGradeColor(feature.properties.grade)
          // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
          const positions: [number, number][] = feature.geometry.coordinates.map(
            coord => [coord[1], coord[0]]
          )
          
          return (
            <Polyline
              key={`${feature.properties.segment_id}-${i}`}
              positions={positions}
              pathOptions={{ 
                color, 
                weight: 7,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }}
              eventHandlers={{
                click: () => {
                  if (interactive) {
                    router.push(`/roads/${feature.properties.segment_id}`)
                  }
                },
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle({ weight: 10, opacity: 1 });
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle({ weight: 7, opacity: 0.85 });
                }
              }}
            >
              <Tooltip sticky>
                <div className="font-sans p-1 text-slate-900">
                  <div className="font-bold text-sm">{feature.properties.road_name}</div>
                  <div className="text-xs text-gray-600">{feature.properties.sub_name}</div>
                  <div className="mt-1.5 flex items-center justify-between text-xs pt-1 border-t border-gray-200">
                    <span className="font-semibold">
                      Grade: <span className="font-bold uppercase px-1.5 py-0.5 rounded text-white text-[10px]" style={{ backgroundColor: color }}>{feature.properties.grade}</span>
                    </span>
                    <span className="ml-3 font-mono font-bold">
                      Risk: {feature.properties.risk_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {feature.properties.pothole_count} potholes | {feature.properties.authority}
                  </div>
                  <div className="text-[10px] text-blue-600 font-semibold mt-1">
                    Click to view detailed inspection &rarr;
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
