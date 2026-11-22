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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#ded7cb] bg-[#faf8f4]/95 backdrop-blur-md px-3 sm:px-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-[#12271c] hover:bg-[#ede7dc] transition-colors"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {title && (
          <div className="flex items-center space-x-2">
            <h1 className="text-sm sm:text-base font-bold text-[#12271c] tracking-tight">
              {title}
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-mono bg-[#ede7dc] text-[#1d4231] border border-[#ded7cb] px-2 py-0.5 rounded font-semibold uppercase">
              Production
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Transit Pulse Status */}
        <div className="hidden lg:flex items-center space-x-2 text-xs font-mono bg-[#eaf2ed] text-[#17462e] border border-[#c1decc] px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#207246] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1b5d39]" />
          </span>
          <span className="font-semibold text-[11px] tracking-tight">LIVE GPS PULSE</span>
        </div>

        {/* Survey Cycle Selector */}
        <div className="flex items-center space-x-1.5 bg-[#ede7dc] border border-[#ded7cb] px-2 py-0.5 rounded-lg">
          <Calendar className="h-3.5 w-3.5 text-[#506457] hidden sm:block" />
          <span className="text-[11px] font-mono text-[#506457] uppercase font-semibold hidden sm:inline">
            Cycle:
          </span>
          <div className="w-24 sm:w-28">
            <Select value={String(week)} onValueChange={(val) => setWeek(Number(val))}>
              <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-mono font-bold text-[#12271c] focus:ring-0 p-0 shadow-none">
                <SelectValue placeholder={`Week ${week}`} />
              </SelectTrigger>
              <SelectContent className="bg-[#faf8f4] border-[#ded7cb] text-[#12271c] font-mono text-xs shadow-md">
                <SelectItem value="1">Week 1 (Baseline)</SelectItem>
                <SelectItem value="2">Week 2 (Wear)</SelectItem>
                <SelectItem value="3">Week 3 (Notices)</SelectItem>
                <SelectItem value="4">Week 4 (SLA Audit)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 rounded-lg text-[#506457] hover:text-[#12271c] hover:bg-[#ede7dc] transition-colors focus:outline-none"
            aria-label="Open incident notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9e3427] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9e3427]" />
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#ded7cb] bg-[#faf8f4] shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#ded7cb] bg-[#f4efe6]">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#12271c] uppercase tracking-wider font-mono">
                    Audit Stream
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono bg-[#9e3427] text-white px-1.5 py-0.2 rounded-full font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-medium text-[#1d4231] hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#ede7dc]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#506457]">
                    No notifications logged.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => markOneAsRead(item.id)}
                      className={`p-3.5 transition-colors cursor-pointer hover:bg-[#f4efe6] ${
                        item.unread ? "bg-[#f8f5ee]" : ""
                      }`}
                    >
                      <Link href={item.link} className="block">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            {item.type === "critical" && (
                              <AlertCircle className="h-4 w-4 text-[#9e3427] shrink-0" />
                            )}
                            {item.type === "warning" && (
                              <AlertTriangle className="h-4 w-4 text-[#a86c18] shrink-0" />
                            )}
                            {item.type === "success" && (
                              <CheckCircle2 className="h-4 w-4 text-[#207246] shrink-0" />
                            )}
                            {item.type === "info" && (
                              <Info className="h-4 w-4 text-[#1d4231] shrink-0" />
                            )}
                            <h4 className="text-xs font-semibold text-[#12271c]">
                              {item.title}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono text-[#74877b] shrink-0">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#506457] mt-1 pl-6 leading-relaxed">
                          {item.description}
                        </p>
                      </Link>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 border-t border-[#ded7cb] bg-[#f4efe6] text-center">
                <Link
                  href="/authority"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-mono font-semibold text-[#1d4231] hover:underline block"
                >
                  View All Municipal SLA Actions
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
