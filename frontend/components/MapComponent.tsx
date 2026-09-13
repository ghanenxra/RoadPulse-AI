"use client"

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapFeature } from '@/types'
import { getGradeColor } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface MapComponentProps {
  features: MapFeature[]
  height?: string
  interactive?: boolean
}

export default function MapComponent({
  features,
  height = "100%",
  interactive = true,
}: MapComponentProps) {
  const router = useRouter()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.FeatureGroup | null>(null)

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

      const layerGroup = L.featureGroup().addTo(map)
      layerGroupRef.current = layerGroup
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
        layerGroupRef.current = null
      }
    }
  }, [interactive])

  // Update polylines when features change
  useEffect(() => {
    const map = mapInstanceRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()

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

      layerGroup.addLayer(polyline)
    })

    if (bounds.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] })
      } catch (e) {
        // ignore bounds fit error
      }
    }
  }, [features, interactive, router])

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%', zIndex: 0 }}
      className="relative"
    />
  )
}
