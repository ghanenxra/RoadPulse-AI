"use client"

import { Topbar } from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function DemoPage() {
  
  const handleAction = async (action: () => Promise<any>, name: string) => {
    try {
      await action()
      alert(`Success: ${name}`)
    } catch (e) {
      alert(`Failed: ${name}`)
    }
  }

  return (
    <>
      <Topbar title="Demo Data Control Center" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Simulation Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-x-4">
            <Button onClick={() => handleAction(api.simulateUpload, 'Simulate Upload')}>Simulate Upload</Button>
            <Button variant="outline" onClick={() => handleAction(() => api.simulateRepair('1', 4), 'Simulate Repair')}>Simulate Repair</Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
