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
    <html lang="en" className="dark">
      <body className="font-sans bg-[#080c14] text-slate-100 min-h-screen">
        <WeekProvider>
          <div className="flex h-screen overflow-hidden bg-[#080c14]">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#080c14]">
                {children}
              </main>
            </div>
          </div>
        </WeekProvider>
      </body>
    </html>
  )
}
