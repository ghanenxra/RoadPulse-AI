"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, ChevronLeft, ChevronRight, Menu } from "lucide-react"
import { NAV_ITEMS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import * as Icons from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div
      className={cn(
        "flex flex-col bg-[#0f172a] text-slate-300 transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-center border-b border-slate-800">
        <Activity className="h-6 w-6 text-blue-500" />
        {!collapsed && (
          <span className="ml-2 text-lg font-bold text-white tracking-tight">
            RoadPulse <span className="text-blue-500">AI</span>
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 py-2">
          <div className="rounded bg-slate-800/50 px-2 py-1 text-center text-xs font-medium text-amber-500 uppercase tracking-wider">
            Demo Mode
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = Icons[item.icon as keyof typeof Icons] as React.ElementType
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white",
                  collapsed ? "justify-center" : "justify-start"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5", collapsed ? "" : "mr-3", isActive ? "text-blue-500" : "")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}
