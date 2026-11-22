"use client"

import React, { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapFeature, SimulatedVehicle } from "@/types"

interface MapComponentProps {
  features: MapFeature[]
  vehicle?: SimulatedVehicle | null
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

      // OpenStreetMap standard tile layer - 100% free, no API key or watermark
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
        `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px 8px; background: #faf8f4; color: #12271c; border: 1px solid #ded7cb; border-radius: 6px; box-shadow: 0 4px 12px rgba(18,39,28,0.12);">
          <div style="font-weight: 700; font-size: 12px; color: #12271c; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span>${feature.properties.road_name}</span>
            <span style="background: ${color}20; color: ${color}; border: 1px solid ${color}50; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-family: monospace; font-weight: bold;">Grade ${feature.properties.grade}</span>
          </div>
          <div style="font-size: 11px; color: #506457; margin-top: 2px;">${feature.properties.sub_name}</div>
          <div style="font-size: 11px; margin-top: 4px; border-top: 1px solid #ded7cb; padding-top: 3px; display: flex; justify-content: space-between; gap: 12px; font-family: monospace;">
            <span style="color: #12271c;">Risk: ${feature.properties.risk_score.toFixed(1)}</span>
            <span style="color: #506457;">Defects: ${feature.properties.pothole_count}</span>
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
        color: '#1d4231',
        weight: 5,
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round',
      })
      const innerTrail = L.polyline(travelledPath, {
        color: '#a8d5bc',
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
          <div class="pulse-ring-effect" style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(32, 114, 70, 0.25); border: 1.5px solid #207246;"></div>
          <div style="position: relative; width: 30px; height: 30px; background: #132a1e; border: 2px solid #dfd7cb; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(18,39,28,0.3); transform: rotate(${vehicle.heading || 0}deg); transition: transform 0.4s ease-out;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f4efe6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2" fill="#f4efe6" />
            </svg>
          </div>
          <div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); background: #132a1e; color: #f4efe6; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; border: 1px solid #2e5942; white-space: nowrap; box-shadow: 0 2px 4px rgba(18,39,28,0.25); font-family: monospace; letter-spacing: 0.5px;">
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
      })

      marker.bindPopup(
        `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; background: #faf8f4; color: #12271c; border-radius: 6px;">
          <div style="font-weight: 800; font-size: 13px; color: #1d4231;">${vehicle.vehicle_id}</div>
          <div style="font-size: 11px; color: #506457; margin-top: 1px;">Route 11 · Tonk Road Express</div>
          <div style="font-size: 11px; font-family: monospace; margin-top: 6px; border-top: 1px solid #ded7cb; padding-top: 4px;">
            <div>Speed: ${Math.round(vehicle.speed_kmh || 32)} km/h</div>
            <div>Coords: ${vehicle.latitude.toFixed(4)}, ${vehicle.longitude.toFixed(4)}</div>
            <div>Feed: Optical Dashcam Active</div>
          </div>
        </div>`
      )

      simLayerGroup.addLayer(marker)
    }
  }, [travelledPath, vehicle])

  return (
    <div
      ref={mapContainerRef}
      style={{ height: height, width: "100%", zIndex: 1 }}
      className="relative outline-none"
    />
  )
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "#207246" // Forest Leaf Green
    case "B":
      return "#3d8e57" // Pine Sage
    case "C":
      return "#c2822a" // Amber Ochre
    case "D":
      return "#c05621" // Warm Clay
    case "E":
      return "#9e3427" // Terracotta
    default:
      return "#6e8477"
  }
}
