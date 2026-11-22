import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { WeekProvider } from '@/context/WeekContext'

export const metadata: Metadata = {
  title: 'RoadPulse AI · Municipal Road Health Intelligence',
  description: 'Transit-powered pavement health monitoring, AI defect localization, and civic SLA accountability',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-[#f5f2eb] text-[#12271c] min-h-screen">
        <WeekProvider>
          <div className="flex h-screen overflow-hidden bg-[#f5f2eb]">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f5f2eb]">
                {children}
              </main>
            </div>
          </div>
        </WeekProvider>
      </body>
    </html>
  )
}
