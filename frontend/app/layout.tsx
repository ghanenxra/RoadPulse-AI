import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

import { WeekProvider } from '@/context/WeekContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RoadPulse AI — Municipal Road Health Intelligence',
  description: 'AI-powered road condition auditing, defect localization, and municipal SLA monitoring',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WeekProvider>
          <div className="flex h-screen overflow-hidden bg-slate-50">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50">
                {children}
              </main>
            </div>
          </div>
        </WeekProvider>
      </body>
    </html>
  )
}
