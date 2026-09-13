"use client"

import { Topbar } from '@/components/layout/Topbar'

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">System Settings</h2>
        <p className="text-gray-500">Configure RoadPulse AI thresholds and system preferences.</p>
        {/* Simplified implementation for demo */}
      </div>
    </>
  )
}
