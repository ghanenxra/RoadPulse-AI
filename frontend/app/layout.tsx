import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { DemoDataBanner } from '@/components/layout/DemoDataBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RoadPulse AI',
  description: 'AI-powered road health monitoring system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden bg-slate-50">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <DemoDataBanner />
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
