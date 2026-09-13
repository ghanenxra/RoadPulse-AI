import { AlertTriangle } from "lucide-react"

export function DemoDataBanner() {
  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-1.5 flex items-center justify-center text-sm font-medium z-50">
      <AlertTriangle className="h-4 w-4 mr-2" />
      SIMULATED DEMO DATA — NOT LIVE GOVERNMENT DATA
    </div>
  )
}
