"use client"

import { Topbar } from '@/components/layout/Topbar'

export default function AuthorityPage() {
  return (
    <>
      <Topbar title="Authority Tracker" />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Authority Accountability Tracker</h2>
        <p className="text-gray-500">Track issues reported to authorities and their repair status.</p>
        {/* Simplified implementation for demo */}
      </div>
    </>
  )
}
