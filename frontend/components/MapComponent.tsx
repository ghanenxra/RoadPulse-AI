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

    // Safely remove any existing Leaflet container id to prevent "Map container is already initialized"
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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
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

  // Update road polylines when features change
  useEffect(() => {
    const map = mapInstanceRef.current
    const roadLayerGroup = roadLayerGroupRef.current
    if (!map || !roadLayerGroup) return

    roadLayerGroup.clearLayers()

    const bounds: L.LatLngExpression[] = []

    features.forEach((feature) => {
      const color = getGradeColor(feature.properties.grade)
      // GeoJSON is [lon, lat] -> Leaflet is [lat, lon]
      const positions: [number, number][] = feature.geometry.coordinates.map(
        (coord) => [coord[1], coord[0]]
      )

      positions.forEach((pos) => bounds.push(pos))

      const polyline = L.polyline(positions, {
        color,
        weight: 7,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      })

      polyline.bindTooltip(
        `<div style="font-family: system-ui, sans-serif; padding: 3px; min-width: 140px;">
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${feature.properties.road_name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">${feature.properties.sub_name}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            <span style="font-weight: 600; font-size: 11px; color: ${color};">Grade ${feature.properties.grade}</span>
            <span style="font-size: 11px; font-weight: 700; color: #1e293b;">Risk: ${feature.properties.risk_score.toFixed(1)}</span>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Potholes: ${feature.properties.pothole_count}</div>
        </div>`,
        { sticky: true }
      )

      if (interactive) {
        polyline.on('click', () => {
          router.push(`/roads/${feature.properties.segment_id}`)
        })
        polyline.on('mouseover', (e) => {
          e.target.setStyle({ weight: 10, opacity: 1 })
        })
        polyline.on('mouseout', (e) => {
          e.target.setStyle({ weight: 7, opacity: 0.9 })
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
        color: '#2563eb',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      })
      const innerTrail = L.polyline(travelledPath, {
        color: '#60a5fa',
        weight: 2.5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '6, 8',
      })
      simLayerGroup.addLayer(baseTrail)
      simLayerGroup.addLayer(innerTrail)
    }

    // 2. Simulated vehicle marker
    if (vehicle && vehicle.latitude && vehicle.longitude) {
      const busIconHtml = `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
          <div class="pulse-ring-effect" style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(37, 99, 235, 0.4); border: 1.5px solid #60a5fa;"></div>
          <div style="position: relative; width: 32px; height: 32px; background: #0f172a; border: 2px solid #38bdf8; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.5); transform: rotate(${vehicle.heading || 0}deg); transition: transform 0.4s ease-out;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2" fill="#38bdf8" />
            </svg>
          </div>
          <div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); background: #0f172a; color: #38bdf8; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; border: 1px solid #38bdf8; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.4); font-family: monospace; letter-spacing: 0.5px;">
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
        `<div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 150px;">
          <div style="font-weight: 800; font-size: 12px; color: #0f172a; display: flex; justify-content: space-between;">
            <span>${vehicle.vehicle_id}</span>
            <span style="color: #2563eb; font-size: 10px; font-weight: 700;">LIVE GPS</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${vehicle.road_name || 'Active Transit Corridor'}</div>
          <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 3px;">
            Speed: ${vehicle.speed.toFixed(1)} km/h • ${Math.round(vehicle.heading)}°
          </div>
          <div style="font-size: 10px; font-family: monospace; color: #94a3b8;">
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
      className="relative"
    />
  )
}

