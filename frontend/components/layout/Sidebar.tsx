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
      <div className="flex h-14 items-center justify-between border-b border-[#1e3c2c] px-3.5 bg-[#0e2117]">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#1e4230] border border-[#2d5c44] flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 text-[#a8d5bc]" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider text-[#f5f0e6] uppercase">
                RoadPulse <span className="text-[#a8d5bc]">AI</span>
              </span>
              <span className="text-[9px] font-mono tracking-tight text-[#83a893] uppercase">
                Jaipur Transit Network
              </span>
            </div>
          )}
        </div>
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-md text-[#9db7a7] hover:text-[#f5f0e6] hover:bg-[#183425] focus:outline-none"
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
                  ? "bg-[#1f4331] text-[#fdfbf7] font-semibold border border-[#2f6147]"
                  : "text-[#9cb5a6] hover:text-[#fdfbf7] hover:bg-[#173324]",
                collapsed && !isMobile ? "justify-center" : "justify-start"
              )}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#dfd7cb] rounded-r" />
              )}
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", collapsed && !isMobile ? "" : "mr-2.5", isActive ? "text-[#dfd7cb]" : "text-[#83a592] group-hover:text-[#a8d5bc]")} />
              {(!collapsed || isMobile) && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          )
        })}
      </div>

      {!isMobile && (
        <div className="p-2 border-t border-[#1e3c2c] bg-[#0e2117]">
          {(!collapsed) && (
            <div className="px-2 py-1.5 mb-1 bg-[#152e22] rounded-md border border-[#234b37]">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#83a893]">
                <span>FLEET TELEMETRY</span>
                <span className="text-[#a8d5bc] font-bold">20/20 BUSES</span>
              </div>
              <div className="text-[9px] text-[#6e907d] mt-0.5 truncate">
                JCTSL Depots Sanganer & Vaishali
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-md p-1.5 text-xs text-[#83a893] hover:bg-[#173324] hover:text-[#fdfbf7] transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <div className="flex items-center space-x-1.5"><ChevronLeft className="h-4 w-4" /><span className="text-[10px] font-mono uppercase tracking-wider">Collapse Rail</span></div>}
          </button>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop Sticky Rail */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-[#1e3c2c] bg-[#132a1e] text-[#f4efe6] transition-all duration-200 shrink-0 select-none z-40 h-screen",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {navContent(false)}
      </aside>

      {/* Mobile Slide-out Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-64 max-w-[80vw] flex-col bg-[#132a1e] border-r border-[#1e3c2c] text-[#f4efe6] shadow-xl">
            {navContent(true)}
          </div>
        </div>
      )}
    </>
  )
}
