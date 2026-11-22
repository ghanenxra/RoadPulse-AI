"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, Menu, Calendar, CheckCircle2, AlertTriangle, AlertCircle, Info, Check, Radio } from "lucide-react"
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
    title: "Monsoon Defect Spike",
    description: "Sikar Road (SR-01) rain-triggered deterioration detected. 18 new defect clusters logged.",
    time: "45m ago",
    type: "warning",
    link: "/roads/SR-01",
    unread: true,
  },
  {
    id: "notif-3",
    title: "AI Verification Confirmed",
    description: "Ajmer Road (AJ-01) post-repair bus sweep confirmed 72% risk score reduction.",
    time: "2h ago",
    type: "success",
    link: "/authority",
    unread: true,
  },
  {
    id: "notif-4",
    title: "Depot Ingestion Complete",
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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-[#0b101b]/95 backdrop-blur-md px-3 sm:px-6">
      <div className="flex items-center min-w-0 space-x-3">
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-baseline space-x-2 truncate">
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-100 truncate">
            {title || "Command Console"}
          </h1>
          <span className="hidden lg:inline text-[10px] font-mono uppercase text-slate-500 tracking-wider">
            Municipal Public Transit Node
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Live Network Status Indicator */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="tracking-tight">Transit Live</span>
        </div>

        {/* Survey Cycle Selector */}
        <div className="flex items-center space-x-1.5">
          <Calendar className="h-3.5 w-3.5 text-sky-400 hidden sm:inline-block shrink-0" />
          <div className="w-auto min-w-[130px] sm:min-w-[160px]">
            <Select value={String(week)} onValueChange={(val) => setWeek(Number(val))}>
              <SelectTrigger className="h-8 px-2.5 py-1 text-xs bg-slate-900 border-slate-800 font-mono text-slate-200 rounded-lg hover:border-slate-700 transition-colors focus:ring-1 focus:ring-sky-500">
                <SelectValue placeholder="Cycle week" />
              </SelectTrigger>
              <SelectContent className="min-w-[160px] bg-slate-900 border-slate-800 text-slate-200 rounded-lg shadow-xl font-mono text-xs">
                <SelectItem value="1">Cycle 1 (Aug 17)</SelectItem>
                <SelectItem value="2">Cycle 2 (Aug 24)</SelectItem>
                <SelectItem value="3">Cycle 3 (Aug 31)</SelectItem>
                <SelectItem value="4">Cycle 4 (Sep 07)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/80 border border-slate-800 transition-colors"
            aria-label="Notifications"
            aria-expanded={isOpen}
          >
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
              </span>
            )}
            <Bell className="h-3.5 w-3.5" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 bg-slate-900/98 shadow-2xl z-50 overflow-hidden text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2.5 bg-slate-950/60">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Transit Alert Stream</span>
                  {unreadCount > 0 && (
                    <span className="rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 text-[10px] font-mono font-semibold">
                      {unreadCount} pending
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <Check className="h-3 w-3 mr-1" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-mono">
                    Zero unresolved alerts.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.link}
                      onClick={() => markOneAsRead(notif.id)}
                      className={`flex items-start gap-2.5 p-3 text-left transition-colors hover:bg-slate-800/50 ${
                        notif.unread ? "bg-slate-800/30" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === "critical" && <AlertCircle className="h-3.5 w-3.5 text-rose-400" />}
                        {notif.type === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                        {notif.type === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                        {notif.type === "info" && <Info className="h-3.5 w-3.5 text-sky-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${notif.unread ? "text-slate-100" : "text-slate-400"}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">{notif.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {notif.description}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <div className="border-t border-slate-800 bg-slate-950/60 px-3.5 py-2 text-center">
                <Link
                  href="/authority"
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Open Municipal SLA Ledger →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
