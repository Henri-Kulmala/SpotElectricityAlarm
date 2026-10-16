// Pure helpers for working with hourly price lists.
import type { CheapestWindow, HourlyPrice } from '@/types/api'
import { helsinkiDateKey } from './format'

export interface PriceStats {
  avg: number
  min: number
  max: number
}

/** Groups hours by their Finnish calendar date ("2026-10-16" -> hours). */
export function groupByDay(prices: HourlyPrice[]): Map<string, HourlyPrice[]> {
  const days = new Map<string, HourlyPrice[]>()
  for (const hour of prices) {
    const key = helsinkiDateKey(hour.start)
    const list = days.get(key) ?? []
    list.push(hour)
    days.set(key, list)
  }
  return days
}

export function isCurrentHour(hour: HourlyPrice, now: Date): boolean {
  const t = now.getTime()
  return new Date(hour.start).getTime() <= t && t < new Date(hour.end).getTime()
}

export function isPastHour(hour: HourlyPrice, now: Date): boolean {
  return new Date(hour.end).getTime() <= now.getTime()
}

/** Returns the index of the hour that contains `now`, or -1. */
export function findCurrentIndex(prices: HourlyPrice[], now: Date): number {
  return prices.findIndex((hour) => isCurrentHour(hour, now))
}

export function isInWindow(hour: HourlyPrice, window: CheapestWindow | null): boolean {
  if (!window) return false
  const t = new Date(hour.start).getTime()
  return new Date(window.start).getTime() <= t && t < new Date(window.end).getTime()
}

export function priceStats(prices: HourlyPrice[]): PriceStats | null {
  if (prices.length === 0) return null
  const values = prices.map((p) => p.price)
  return {
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  }
}
