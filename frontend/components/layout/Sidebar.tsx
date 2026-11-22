"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Activity, ChevronLeft, ChevronRight, X, LayoutDashboard, Map as MapIcon,
  Route, Cpu, ShieldCheck, FileSpreadsheet, PlayCircle, Settings
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWeek } from "@/context/WeekContext"

const NAVIGATION_LINKS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/map", label: "GIS Health Map", icon: MapIcon },
  { href: "/roads", label: "Road Directory", icon: Route },
  { href: "/processing", label: "Edge Processing", icon: Cpu },
  { href: "/authority", label: "SLA Accountability", icon: ShieldCheck },
  { href: "/reports", label: "Dossiers & Exports", icon: FileSpreadsheet },
  { href: "/demo", label: "Demo Scenarios", icon: PlayCircle },
  { href: "/settings", label: "System Calibration", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const { mobileMenuOpen, setMobileMenuOpen } = useWeek()

  const navContent = (isMobile: boolean = false) => (
    <>
      <div className="flex h-14 items-center justify-between border-b border-slate-800/80 px-3.5 bg-slate-950/40">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 text-sky-400" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider text-slate-100 uppercase">
                RoadPulse <span className="text-sky-400">AI</span>
              </span>
              <span className="text-[9px] font-mono tracking-tight text-slate-500 uppercase">
                Jaipur Transit Network
              </span>
            </div>
          )}
        </div>
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 focus:outline-none"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAVIGATION_LINKS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (isMobile) setMobileMenuOpen(false)
              }}
              className={cn(
                "group flex items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 relative",
                isActive
                  ? "bg-slate-800/90 text-sky-400 font-semibold border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60",
                collapsed && !isMobile ? "justify-center" : "justify-start"
              )}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-sky-400 rounded-r" />
              )}
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", collapsed && !isMobile ? "" : "mr-2.5", isActive ? "text-sky-400" : "text-slate-400 group-hover:text-slate-300")} />
              {(!collapsed || isMobile) && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          )
        })}
      </div>

      {!isMobile && (
        <div className="border-t border-slate-800/80 p-2 bg-slate-950/20">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors text-xs"
            aria-label="Toggle rail collapse"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      )}
    </>
  )

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex flex-col bg-[#0b101b] border-r border-slate-800/80 text-slate-300 transition-all duration-200 h-screen sticky top-0 shrink-0 z-40 select-none",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {navContent(false)}
      </aside>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-xs bg-[#0b101b] border-r border-slate-800 h-full shadow-2xl z-10 flex flex-col">
            {navContent(true)}
          </div>
        </div>
      )}
    </>
  )
}
