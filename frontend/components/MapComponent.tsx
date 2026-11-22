"use client"

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapFeature, VehicleTelemetry } from '@/types'
import { getGradeColor } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface MapComponentProps {
  features: MapFeature[]
  vehicle?: VehicleTelemetry | null
  travelledPath?: [number, number][]
  height?: string
  interactive?: boolean
  autoFitBounds?: boolean
}

export default function MapComponent({
  features,
  vehicle = null,
  travelledPath = [],
  height = "100%",
  interactive = true,
  autoFitBounds = true,
}: MapComponentProps) {
  const router = useRouter()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const roadLayerGroupRef = useRef<L.FeatureGroup | null>(null)
  const simLayerGroupRef = useRef<L.FeatureGroup | null>(null)
  const initialFitDoneRef = useRef(false)

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    if ((mapContainerRef.current as any)._leaflet_id) {
      (mapContainerRef.current as any)._leaflet_id = null
    }

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [26.9124, 75.7873],
        zoom: 12,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
      })

      // CartoDB Dark Matter tile layer for tactical dark console aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map)

      const roadLayerGroup = L.featureGroup().addTo(map)
      const simLayerGroup = L.featureGroup().addTo(map)
      
      roadLayerGroupRef.current = roadLayerGroup
      simLayerGroupRef.current = simLayerGroup
      mapInstanceRef.current = map
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {
          // ignore cleanup errors
        }
        mapInstanceRef.current = null
        roadLayerGroupRef.current = null
        simLayerGroupRef.current = null
      }
    }
  }, [interactive])

  // Update Road Polylines
  useEffect(() => {
    const map = mapInstanceRef.current
    const roadLayerGroup = roadLayerGroupRef.current
    if (!map || !roadLayerGroup) return

    roadLayerGroup.clearLayers()
    const bounds: [number, number][] = []

    features.forEach((feature) => {
      if (!feature.geometry || !feature.geometry.coordinates) return

      const coords: [number, number][] = feature.geometry.coordinates.map((coord: any) => [
        coord[1],
        coord[0],
      ])

      coords.forEach((c) => bounds.push(c))

      const color = getGradeColor(feature.properties.grade)

      // Polyline for road corridor
      const polyline = L.polyline(coords, {
        color: color,
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      })

      // Tooltip
      polyline.bindTooltip(
        `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 3px 6px; background: #0f172a; color: #f8fafc; border: 1px solid #334155; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
          <div style="font-weight: 700; font-size: 12px; color: #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span>${feature.properties.road_name}</span>
            <span style="background: ${color}25; color: ${color}; border: 1px solid ${color}60; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-family: monospace;">Grade ${feature.properties.grade}</span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${feature.properties.sub_name}</div>
          <div style="font-size: 11px; margin-top: 4px; border-top: 1px solid #1e293b; padding-top: 3px; display: flex; justify-content: space-between; gap: 12px; font-family: monospace;">
            <span style="color: #cbd5e1;">Risk: ${feature.properties.risk_score.toFixed(1)}</span>
            <span style="color: #94a3b8;">Defects: ${feature.properties.pothole_count}</span>
          </div>
        </div>`,
        { sticky: true, opacity: 1 }
      )

      if (interactive) {
        polyline.on('click', () => {
          router.push(`/roads/${feature.properties.segment_id}`)
        })
        polyline.on('mouseover', (e) => {
          e.target.setStyle({ weight: 9, opacity: 1 })
        })
        polyline.on('mouseout', (e) => {
          e.target.setStyle({ weight: 6, opacity: 0.9 })
        })
      }

      roadLayerGroup.addLayer(polyline)
    })

    if (bounds.length > 0 && (!initialFitDoneRef.current || autoFitBounds)) {
      try {
        map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] })
        initialFitDoneRef.current = true
      } catch (e) {
        // ignore bounds fit error
      }
    }
  }, [features, interactive, router, autoFitBounds])

  // Update simulation layers (travelled path and vehicle marker)
  useEffect(() => {
    const simLayerGroup = simLayerGroupRef.current
    if (!simLayerGroup) return

    simLayerGroup.clearLayers()

    // 1. Travelled path breadcrumb polyline
    if (travelledPath && travelledPath.length > 1) {
      const baseTrail = L.polyline(travelledPath, {
        color: '#0284c7',
        weight: 5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      })
      const innerTrail = L.polyline(travelledPath, {
        color: '#38bdf8',
        weight: 2,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '5, 8',
      })
      simLayerGroup.addLayer(baseTrail)
      simLayerGroup.addLayer(innerTrail)
    }

    // 2. Simulated vehicle marker
    if (vehicle && vehicle.latitude && vehicle.longitude) {
      const busIconHtml = `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
          <div class="pulse-ring-effect" style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(56, 189, 248, 0.25); border: 1.5px solid #38bdf8;"></div>
          <div style="position: relative; width: 30px; height: 30px; background: #0b101b; border: 2px solid #38bdf8; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.8); transform: rotate(${vehicle.heading || 0}deg); transition: transform 0.4s ease-out;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2" fill="#38bdf8" />
            </svg>
          </div>
          <div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); background: #0b101b; color: #38bdf8; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; border: 1px solid #1e293b; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.6); font-family: monospace; letter-spacing: 0.5px;">
            ${vehicle.vehicle_id}
          </div>
        </div>
      `

      const marker = L.marker([vehicle.latitude, vehicle.longitude], {
        icon: L.divIcon({
          html: busIconHtml,
          className: 'vehicle-marker-icon',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }),
        zIndexOffset: 1500,
      })

      marker.bindTooltip(
        `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px 6px; background: #0b101b; color: #f8fafc; border: 1px solid #1e293b; border-radius: 6px; min-width: 150px;">
          <div style="font-weight: 800; font-size: 11px; color: #f8fafc; display: flex; justify-content: space-between; font-family: monospace;">
            <span>${vehicle.vehicle_id}</span>
            <span style="color: #38bdf8; font-size: 10px; font-weight: 700;">LIVE TELEMETRY</span>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 1px;">${vehicle.road_name || 'Active Transit Corridor'}</div>
          <div style="font-size: 10px; font-weight: 700; color: #e2e8f0; margin-top: 4px; border-top: 1px solid #1e293b; padding-top: 3px; font-family: monospace;">
            Speed: ${vehicle.speed.toFixed(1)} km/h • ${Math.round(vehicle.heading)}°
          </div>
          <div style="font-size: 9px; font-family: monospace; color: #64748b;">
            ${vehicle.latitude.toFixed(5)}, ${vehicle.longitude.toFixed(5)}
          </div>
        </div>`,
        { direction: 'top', offset: [0, -22] }
      )

      simLayerGroup.addLayer(marker)
    }
  }, [travelledPath, vehicle])

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%', zIndex: 0 }}
      className="relative bg-[#090d16]"
    />
  )
}
