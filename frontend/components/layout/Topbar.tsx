"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, Menu, Calendar, CheckCircle2, AlertTriangle, AlertCircle, Info, Check } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWeek } from "@/context/WeekContext"

interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  type: "critical" | "warning" | "success" | "info"
  link: string
  unread: boolean
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Critical SLA Overdue",
    description: "Tonk Road (TR-01) 21-day statutory repair window breached. Escalated to Municipal Commissioner.",
    time: "10m ago",
    type: "critical",
    link: "/authority",
    unread: true,
  },
  {
    id: "notif-2",
    title: "Monsoon Pothole Surge",
    description: "Sikar Road (SR-01) rain-triggered deterioration detected (18 new defects clustered).",
    time: "45m ago",
    type: "warning",
    link: "/roads/SR-01",
    unread: true,
  },
  {
    id: "notif-3",
    title: "AI Repair Verification Passed",
    description: "Ajmer Road (AJ-01) post-repair bus sweep confirmed 72% risk score reduction.",
    time: "2h ago",
    type: "success",
    link: "/authority",
    unread: true,
  },
  {
    id: "notif-4",
    title: "Depot Ingestion Completed",
    description: "JCTSL Route 11 (BUS-1) keyframe inference completed at Sanganer Hub.",
    time: "4h ago",
    type: "info",
    link: "/processing",
    unread: false,
  },
]

export function Topbar({ title }: { title?: string }) {
  const { week, setWeek, toggleMobileMenu } = useWeek()
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => n.unread).length

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const markOneAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    setIsOpen(false)
  }

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

        {/* Notifications Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Notifications"
            aria-expanded={isOpen}
          >
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
              </span>
            )}
            <Bell className="h-5 w-5" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Check className="h-3 w-3 mr-1" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.link}
                      onClick={() => markOneAsRead(notif.id)}
                      className={`flex items-start gap-3 p-3 text-left transition-colors hover:bg-slate-50 ${
                        notif.unread ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === "critical" && <AlertCircle className="h-4 w-4 text-rose-600" />}
                        {notif.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        {notif.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        {notif.type === "info" && <Info className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${notif.unread ? "text-slate-900" : "text-slate-700"}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">{notif.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                          {notif.description}
                        </p>
                      </div>
                      {notif.unread && (
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </Link>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center">
                <Link
                  href="/authority"
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  View Municipal SLA Ledger →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
