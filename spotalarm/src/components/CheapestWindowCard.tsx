import { Zap } from 'lucide-react'
import { ErrorState } from '@/components/ErrorState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ApiRequest } from '@/hooks/useSpotData'
import {
  formatDuration,
  formatHourRange,
  formatPrice,
  formatRelativeDay,
  helsinkiDateKey,
} from '@/lib/format'
import type { CheapestWindow, CheapestWindowResponse } from '@/types/api'

const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6]

interface Props {
  request: ApiRequest<CheapestWindowResponse>
  hours: number
  onHoursChange: (hours: number) => void
  now: Date
  todayKey: string
}

/** "When should I run the dishwasher?" answered at a glance. */
export function CheapestWindowCard({ request, hours, onHoursChange, now, todayKey }: Props) {
  const { state, retry } = request

  return (
    <Card className="bg-chart-2/5 ring-chart-2/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-4 text-chart-2" aria-hidden />
          Halvin aika käyttää sähköä
        </CardTitle>
        <CardDescription>Edullisin yhtenäinen {hours} tunnin jakso</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Fixed min-height keeps the selector from jumping while loading. */}
        <div className="min-h-24">
          {state.status === 'loading' && (
            <div className="space-y-2">
              <Skeleton className="h-9 w-56" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-48" />
            </div>
          )}
          {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}
          {state.status === 'success' &&
            (state.data.window ? (
              <WindowDetails
                window={state.data.window}
                unit={state.data.unit}
                now={now}
                todayKey={todayKey}
              />
            ) : (
              <p className="text-muted-foreground">
                Riittävän pitkää jaksoa ei löytynyt. Huomisen hinnat julkaistaan noin klo 14.
              </p>
            ))}
        </div>

        <div>
          <p id="window-length-label" className="mb-2 text-xs text-muted-foreground">
            Jakson pituus
          </p>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={String(hours)}
            // Radix sends "" when the active item is clicked again; keep the current value then.
            onValueChange={(value) => value && onHoursChange(Number(value))}
            aria-labelledby="window-length-label"
            className="w-full bg-card"
          >
            {HOUR_OPTIONS.map((h) => (
              <ToggleGroupItem key={h} value={String(h)} className="h-10 flex-1">
                {h} h
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  )
}

function WindowDetails({
  window,
  unit,
  now,
  todayKey,
}: {
  window: CheapestWindow
  unit: string
  now: Date
  todayKey: string
}) {
  const day = formatRelativeDay(helsinkiDateKey(window.start), todayKey)
  const minutesToStart = Math.ceil((new Date(window.start).getTime() - now.getTime()) / 60_000)
  const minutesToEnd = Math.ceil((new Date(window.end).getTime() - now.getTime()) / 60_000)

  return (
    <div className="space-y-1">
      <p className="text-3xl font-semibold tracking-tight">
        {capitalize(day)} klo {formatHourRange(window.start, window.end)}
      </p>
      <p className="text-sm font-medium">
        {minutesToStart <= 0
          ? `Käynnissä nyt, päättyy ${formatDuration(minutesToEnd)} päästä`
          : `Alkaa ${formatDuration(minutesToStart)} päästä`}
      </p>
      <p className="text-sm text-muted-foreground">
        Keskihinta{' '}
        <span className="font-medium text-foreground tabular-nums">
          {formatPrice(window.avgPrice)} {unit}
        </span>{' '}
        · vaihtelu {formatPrice(window.minPrice)}–{formatPrice(window.maxPrice)}
      </p>
    </div>
  )
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
