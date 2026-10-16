// Display helpers. Times are always shown in Finnish time, regardless of
// the browser's own time zone.

const TIME_ZONE = 'Europe/Helsinki'

const timeFormat = new Intl.DateTimeFormat('fi-FI', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const dayFormat = new Intl.DateTimeFormat('fi-FI', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
})

/** "14.00" */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** "pe 16.10." */
export function formatDay(iso: string): string {
  return dayFormat.format(new Date(iso))
}

/** "2,51" */
export function formatPrice(price: number): string {
  return price.toLocaleString('fi-FI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** True if `now` falls inside [start, end). */
export function isCurrentHour(start: string, end: string, now: Date = new Date()): boolean {
  const t = now.getTime()
  return new Date(start).getTime() <= t && t < new Date(end).getTime()
}
