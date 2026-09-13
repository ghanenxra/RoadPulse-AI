"use client"

import { Topbar } from '@/components/layout/Topbar'

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Reports" />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Reports</h2>
        <p className="text-gray-500">Generate and export reports in PDF and CSV formats.</p>
        {/* Simplified implementation for demo */}
      </div>
    </>
  )
}
