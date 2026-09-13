"use client"

import * as React from "react"
import { Bell, User, ChevronDown, Menu, Calendar } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWeek } from "@/context/WeekContext"

export function Topbar({ title }: { title?: string }) {
  const { week, setWeek, toggleMobileMenu } = useWeek()

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-3 sm:px-6 shadow-sm">
      <div className="flex items-center min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden mr-2.5 p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-base sm:text-xl font-semibold text-slate-800 truncate">
          {title || "Dashboard"}
        </h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        {/* Timeline Week Selector */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 sm:border-r sm:pr-4">
          <Calendar className="h-4 w-4 text-blue-600 hidden sm:inline-block" />
          <span className="text-xs sm:text-sm text-slate-500 font-medium hidden xs:inline">
            Cycle:
          </span>
          <div className="w-24 sm:w-36">
            <Select value={String(week)} onValueChange={(val) => setWeek(Number(val))}>
              <SelectTrigger className="h-8 text-xs sm:text-sm bg-slate-50 border-slate-200 font-medium text-slate-800">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Week 1 (Aug 17)</SelectItem>
                <SelectItem value="2">Week 2 (Aug 24)</SelectItem>
                <SelectItem value="3">Week 3 (Aug 31)</SelectItem>
                <SelectItem value="4">Week 4 (Sep 07)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications */}
        <button
          className="relative p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          aria-label="Notifications"
        >
          <span className="absolute right-1 top-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
          </span>
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Profile Avatar */}
        <div className="hidden sm:flex items-center space-x-1.5 pl-1">
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
            JMC
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>
    </header>
  )
}
