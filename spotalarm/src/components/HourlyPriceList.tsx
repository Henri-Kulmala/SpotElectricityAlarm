import { ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatHourRange, formatPrice } from '@/lib/format'
import { isCurrentHour, isInWindow, isPastHour } from '@/lib/prices'
import type { CheapestWindow, HourlyPrice } from '@/types/api'

interface Props {
  hours: HourlyPrice[]
  window: CheapestWindow | null
  now: Date
}

/** Every hour of the selected day; hours that have already passed are folded away. */
export function HourlyPriceList({ hours, window, now }: Props) {
  const [showPast, setShowPast] = useState(false)

  const pastCount = hours.filter((hour) => isPastHour(hour, now)).length
  const visible = showPast ? hours : hours.filter((hour) => !isPastHour(hour, now))
  // Bar lengths are relative to the day's highest price; negative prices get no bar.
  const maxPrice = Math.max(...hours.map((hour) => hour.price), 0.01)

  return (
    <div>
      {pastCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="mb-1 w-full text-muted-foreground"
          onClick={() => setShowPast((v) => !v)}
        >
          {showPast ? <ChevronUp /> : <ChevronDown />}
          {showPast ? 'Piilota menneet tunnit' : `Näytä menneet tunnit (${pastCount})`}
        </Button>
      )}

      <ul className="divide-y">
        {visible.map((hour) => {
          const current = isCurrentHour(hour, now)
          const past = isPastHour(hour, now)
          const inWindow = isInWindow(hour, window)

          return (
            <li
              key={hour.start}
              aria-current={current ? 'time' : undefined}
              className={cn(
                'flex items-center gap-3 px-2 py-2.5',
                current && 'rounded-md bg-muted font-medium',
                past && 'text-muted-foreground',
              )}
            >
              <span className="flex w-20 shrink-0 items-center gap-1.5 tabular-nums">
                {formatHourRange(hour.start, hour.end)}
                {inWindow && (
                  <Zap className="size-3.5 text-chart-2" aria-label="Halvin jakso" />
                )}
                {current && <span className="text-xs text-muted-foreground">nyt</span>}
              </span>

              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span
                  className={cn(
                    'block h-full rounded-full',
                    inWindow ? 'bg-(--chart-2)' : 'bg-(--chart-1)',
                    past && 'opacity-40',
                  )}
                  style={{ width: `${(Math.max(hour.price, 0) / maxPrice) * 100}%` }}
                />
              </span>

              <span className="w-12 shrink-0 text-right tabular-nums">
                {formatPrice(hour.price)}
                {hour.quarters < 4 && (
                  <span title="Tunnilta puuttuu osa vartin hinnoista">*</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
