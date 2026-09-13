"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface WeekContextType {
  week: number
  setWeek: (week: number) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  toggleMobileMenu: () => void
}

const WeekContext = createContext<WeekContextType | undefined>(undefined)

export function WeekProvider({ children }: { children: ReactNode }) {
  const [week, setWeekState] = useState<number>(4)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)

  const setWeek = (newWeek: number) => {
    if (newWeek >= 1 && newWeek <= 4) {
      setWeekState(newWeek)
    }
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev)
  }

  return (
    <WeekContext.Provider
      value={{
        week,
        setWeek,
        mobileMenuOpen,
        setMobileMenuOpen,
        toggleMobileMenu,
      }}
    >
      {children}
    </WeekContext.Provider>
  )
}

export function useWeek() {
  const context = useContext(WeekContext)
  if (!context) {
    throw new Error('useWeek must be used within a WeekProvider')
  }
  return context
}

