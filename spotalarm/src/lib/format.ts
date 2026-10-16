// Display helpers. Times are always shown in Finnish time, regardless of
// the browser's own time zone.

const TIME_ZONE = 'Europe/Helsinki'

const hourFormat = new Intl.DateTimeFormat('fi-FI', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
})

// en-CA formats dates as YYYY-MM-DD, which makes a handy sortable key.
const dateKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const dayFormat = new Intl.DateTimeFormat('fi-FI', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
})

/** "22" */
export function formatHour(iso: string): string {
  return hourFormat.format(new Date(iso))
}

/** "22–24": a range ending at midnight is written as 24, the Finnish way. */
export function formatHourRange(start: string, end: string): string {
  const endHour = formatHour(end)
  return `${formatHour(start)}–${endHour === '00' ? '24' : endHour}`
}

/** Finnish calendar date of a moment, e.g. "2026-10-16". */
export function helsinkiDateKey(date: Date | string): string {
  return dateKeyFormat.format(new Date(date))
}

/** "2026-10-16" + 1 -> "2026-10-17" (pure calendar math, no time zones involved). */
export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** "pe 16.10." */
export function formatDate(date: Date | string): string {
  return dayFormat.format(new Date(date))
}

/** "tänään" / "huomenna" / "eilen", otherwise e.g. "la 18.10." */
export function formatRelativeDay(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return 'tänään'
  if (dateKey === addDays(todayKey, 1)) return 'huomenna'
  if (dateKey === addDays(todayKey, -1)) return 'eilen'
  // Noon UTC is safely inside the same calendar day in Finland.
  return formatDate(`${dateKey}T12:00:00Z`)
}

/** "2,51" */
export function formatPrice(price: number): string {
  return price.toLocaleString('fi-FI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** "1 h 25 min" / "25 min" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const min = minutes % 60
  if (h === 0) return `${min} min`
  return min === 0 ? `${h} h` : `${h} h ${min} min`
}
