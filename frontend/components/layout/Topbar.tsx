"use client"

import * as React from "react"
import { Bell, User, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function Topbar({ title }: { title?: string }) {
  // In a real app this would come from a Context
  const [week, setWeek] = React.useState("4")

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 sm:px-6 shadow-sm">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-slate-800">{title || "Dashboard"}</h1>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 border-r pr-4">
          <span className="text-sm text-slate-500 font-medium">Timeline:</span>
          <div className="w-32">
            <Select value={week} onValueChange={setWeek}>
              <SelectTrigger className="h-8 text-sm bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Week 1 (Past)</SelectItem>
                <SelectItem value="2">Week 2</SelectItem>
                <SelectItem value="3">Week 3</SelectItem>
                <SelectItem value="4">Week 4 (Current)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <button className="relative p-2 text-slate-400 hover:text-slate-500">
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
          </span>
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
            <User className="h-4 w-4" />
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    </header>
  )
}
