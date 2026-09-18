"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, ChevronLeft, ChevronRight, X } from "lucide-react"
import { NAV_ITEMS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import * as Icons from "lucide-react"
import { useWeek } from "@/context/WeekContext"

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const { mobileMenuOpen, setMobileMenuOpen } = useWeek()

  const navContent = (isMobile: boolean = false) => (
    <>
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        <div className="flex items-center">
          <Activity className="h-6 w-6 text-blue-500 shrink-0" />
          {(!collapsed || isMobile) && (
            <span className="ml-2 text-lg font-bold text-white tracking-tight">
              RoadPulse <span className="text-blue-500">AI</span>
            </span>
          )}
        </div>
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <nav className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = (Icons[item.icon as keyof typeof Icons] || Icons.Circle) as React.ElementType
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (isMobile) setMobileMenuOpen(false)
                }}
                className={cn(
                  "flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
                  collapsed && !isMobile ? "justify-center" : "justify-start"
                )}
                title={collapsed && !isMobile ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 shrink-0", collapsed && !isMobile ? "" : "mr-3", isActive ? "text-white" : "")} />
                {(!collapsed || isMobile) && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      {!isMobile && (
        <div className="border-t border-slate-800 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Toggle sidebar collapse"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-[#0f172a] text-slate-300 transition-all duration-300 h-screen sticky top-0 shrink-0 z-40",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {navContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop & Slide-over */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0f172a] text-slate-300 shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {navContent(true)}
          </div>
        </div>
      )}
    </>
  )
}
