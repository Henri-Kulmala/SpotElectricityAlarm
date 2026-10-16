import { useState } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { HourlyPriceList } from '@/components/HourlyPriceList'
import { PriceChart } from '@/components/PriceChart'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ApiRequest } from '@/hooks/useSpotData'
import { addDays, formatPrice } from '@/lib/format'
import { groupByDay, priceStats } from '@/lib/prices'
import type { CheapestWindow, SpotPricesResponse } from '@/types/api'

interface Props {
  request: ApiRequest<SpotPricesResponse>
  window: CheapestWindow | null
  now: Date
  todayKey: string
}

/** Chart + hour-by-hour list for today or tomorrow. */
export function DayPricesCard({ request, window, now, todayKey }: Props) {
  const { state, retry } = request
  const [selected, setSelected] = useState<'today' | 'tomorrow'>('today')

  const days = state.status === 'success' ? groupByDay(state.data.prices) : new Map()
  const tomorrowKey = addDays(todayKey, 1)
  const hasTomorrow = days.has(tomorrowKey)
  // Fall back to today if tomorrow was selected but its data is not there (e.g. after midnight).
  const day = selected === 'tomorrow' && hasTomorrow ? 'tomorrow' : 'today'
  const hours = days.get(day === 'today' ? todayKey : tomorrowKey) ?? []
  const stats = priceStats(hours)

  return (
    <Card className="sm:col-span-2">
      <Tabs
        value={day}
        onValueChange={(value) => setSelected(value as 'today' | 'tomorrow')}
        className="gap-(--card-spacing)"
      >
        <CardHeader>
          <CardTitle>Tuntihinnat</CardTitle>
          <CardDescription>
            {stats ? `Keskihinta ${formatPrice(stats.avg)} c/kWh` : 'c/kWh'}
          </CardDescription>
          <CardAction>
            <TabsList>
              <TabsTrigger value="today">Tänään</TabsTrigger>
              <TabsTrigger value="tomorrow" disabled={!hasTomorrow}>
                Huomenna
              </TabsTrigger>
            </TabsList>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4">
          {state.status === 'loading' && (
            <>
              <Skeleton className="h-56 w-full" />
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </>
          )}

          {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}

          {state.status === 'success' &&
            (hours.length === 0 ? (
              <p className="text-muted-foreground">Hintatietoja ei ole saatavilla.</p>
            ) : (
              <>
                <PriceChart hours={hours} window={window} unit={state.data.unit} now={now} />
                {!hasTomorrow && (
                  <p className="text-xs text-muted-foreground">
                    Huomisen hinnat julkaistaan noin klo 14.
                  </p>
                )}
                {/* key: reset "show past hours" when switching days */}
                <HourlyPriceList key={day} hours={hours} window={window} now={now} />
              </>
            ))}
        </CardContent>
      </Tabs>
    </Card>
  )
}
