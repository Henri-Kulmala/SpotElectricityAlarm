import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { ErrorState } from '@/components/ErrorState'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ApiRequest } from '@/hooks/useSpotData'
import { formatHourRange, formatPrice } from '@/lib/format'
import { findCurrentIndex, groupByDay, priceStats } from '@/lib/prices'
import type { HourlyPrice, SpotPricesResponse } from '@/types/api'

interface Props {
  request: ApiRequest<SpotPricesResponse>
  now: Date
  todayKey: string
}

/** The headline: what electricity costs right now, plus today's range. */
export function CurrentPriceCard({ request, now, todayKey }: Props) {
  const { state, retry } = request

  return (
    <Card>
      <CardHeader>
        <CardDescription>Hinta nyt</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === 'loading' && (
          <>
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-16 w-full" />
          </>
        )}
        {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}
        {state.status === 'success' && (
          <CurrentPriceContent
            prices={state.data.prices}
            unit={state.data.unit}
            now={now}
            todayKey={todayKey}
          />
        )}
      </CardContent>
    </Card>
  )
}

function CurrentPriceContent({
  prices,
  unit,
  now,
  todayKey,
}: {
  prices: HourlyPrice[]
  unit: string
  now: Date
  todayKey: string
}) {
  const index = findCurrentIndex(prices, now)
  const current = prices[index]
  const next = index >= 0 ? prices[index + 1] : undefined
  const today = priceStats(groupByDay(prices).get(todayKey) ?? [])

  if (!current) {
    return <p className="text-muted-foreground">Nykyisen tunnin hintaa ei ole saatavilla.</p>
  }

  return (
    <>
      <div>
        <p className="flex items-baseline gap-2">
          <span className="text-5xl font-semibold tracking-tight">{formatPrice(current.price)}</span>
          <span className="text-muted-foreground">{unit}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          klo {formatHourRange(current.start, current.end)}
        </p>
      </div>

      {next && <NextHour current={current} next={next} unit={unit} />}

      {today && (
        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-3 text-center">
          <Stat label="Tänään ka." value={today.avg} />
          <Stat label="Halvin" value={today.min} />
          <Stat label="Kallein" value={today.max} />
        </dl>
      )}
    </>
  )
}

function NextHour({ current, next, unit }: { current: HourlyPrice; next: HourlyPrice; unit: string }) {
  const diff = next.price - current.price
  // Icon and wording together, so the direction never relies on the icon alone.
  const [Icon, text] =
    Math.abs(diff) < 0.005
      ? [Minus, 'pysyy samana']
      : diff > 0
        ? [TrendingUp, 'kallistuu']
        : [TrendingDown, 'halpenee']

  return (
    <p className="flex items-center gap-2 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>
        Klo {formatHourRange(next.start, next.end)} {text}:{' '}
        <span className="font-medium tabular-nums">
          {formatPrice(next.price)} {unit}
        </span>
      </span>
    </p>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{formatPrice(value)}</dd>
    </div>
  )
}
