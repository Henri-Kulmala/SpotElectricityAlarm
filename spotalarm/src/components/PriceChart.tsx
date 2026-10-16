import { Bar, BarChart, CartesianGrid, Rectangle, ReferenceLine, XAxis, YAxis } from 'recharts'
import type { BarShapeProps } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatHour, formatHourRange, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isCurrentHour, isInWindow, isPastHour } from '@/lib/prices'
import type { CheapestWindow, HourlyPrice } from '@/types/api'

// Two steps of one blue ramp (--chart-1 / --chart-2 in index.css):
// the cheapest window is emphasised, all other hours stay calmer.
const chartConfig = {
  price: { label: 'Hinta', color: 'var(--chart-1)' },
  cheapest: { label: 'Halvin jakso', color: 'var(--chart-2)' },
} satisfies ChartConfig

interface ChartPoint extends HourlyPrice {
  inWindow: boolean
  past: boolean
}

interface Props {
  hours: HourlyPrice[]
  window: CheapestWindow | null
  unit: string
  now: Date
}

export function PriceChart({ hours, window, unit, now }: Props) {
  const data: ChartPoint[] = hours.map((hour) => ({
    ...hour,
    inWindow: isInWindow(hour, window),
    past: isPastHour(hour, now),
  }))
  const current = hours.find((hour) => isCurrentHour(hour, now))
  const hasWindow = data.some((point) => point.inWindow)
  const yTicks = axisTicks(hours.map((hour) => hour.price))

  return (
    <div>
      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <BarChart data={data} margin={{ top: 20, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="start"
            tickFormatter={formatHour}
            tickLine={false}
            axisLine={false}
            interval={2}
            tickMargin={6}
          />
          <YAxis
            width={32}
            domain={[yTicks[0], yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => value.toLocaleString('fi-FI')}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as ChartPoint | undefined
                  return point ? `klo ${formatHourRange(point.start, point.end)}` : null
                }}
                formatter={(value) => (
                  <div className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">Hinta</span>
                    <span className="font-medium tabular-nums">
                      {formatPrice(Number(value))} {unit}
                    </span>
                  </div>
                )}
              />
            }
          />
          {/* No entry animation: the chart re-renders as "now" moves and when days switch. */}
          <Bar
            dataKey="price"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            shape={PriceBar}
            isAnimationActive={false}
          />
          {current && (
            <ReferenceLine
              x={current.start}
              stroke="var(--foreground)"
              strokeOpacity={0.5}
              label={{ value: 'nyt', position: 'top', fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
          )}
        </BarChart>
      </ChartContainer>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {hasWindow && (
          <LegendItem swatch="bg-(--chart-2)">Halvin {window?.hours.length} h jakso</LegendItem>
        )}
        <LegendItem swatch="bg-(--chart-1)">{hasWindow ? 'Muut tunnit' : 'Tuntihinta'}</LegendItem>
        {current && <LegendItem swatch="h-3 w-px bg-foreground/50">Nykyinen tunti</LegendItem>}
      </ul>
    </div>
  )
}

/**
 * About five evenly spaced whole-number ticks that just fit the data,
 * e.g. max 4.24 -> [0, 1, 2, 3, 4, 5]; max 14 -> [0, 3, 6, 9, 12, 15].
 * Always includes 0 so negative prices show below the baseline.
 */
function axisTicks(values: number[]): number[] {
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const step = Math.max(1, Math.ceil((max - min) / 5))
  const ticks: number[] = []
  for (let t = Math.floor(min / step) * step; t < max + step; t += step) {
    ticks.push(t)
  }
  return ticks
}

/** Colors each bar: emphasised inside the cheapest window, faded once the hour is over. */
function PriceBar({ x, y, width, height, radius, payload }: BarShapeProps) {
  const point = payload as ChartPoint
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={radius}
      fill={point.inWindow ? 'var(--color-cheapest)' : 'var(--color-price)'}
      fillOpacity={point.past ? 0.4 : 1}
    />
  )
}

function LegendItem({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn('inline-block size-2.5 rounded-[2px]', swatch)} aria-hidden />
      {children}
    </li>
  )
}
