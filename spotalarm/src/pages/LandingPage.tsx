import { useState } from 'react'
import { CheapestWindowCard } from '@/components/CheapestWindowCard'
import { CurrentPriceCard } from '@/components/CurrentPriceCard'
import { DayPricesCard } from '@/components/DayPricesCard'
import { useCheapestWindow, useNow, useSpotPrices } from '@/hooks/useSpotData'
import { formatDate, helsinkiDateKey } from '@/lib/format'

// Mobile-first layout: one column of cards, ordered by how often you need them:
// price now -> cheapest window -> chart and hourly details.
// From the `sm` breakpoint up, the first two cards sit side by side.
export default function LandingPage() {
  const now = useNow()
  const [hours, setHours] = useState(2)
  const prices = useSpotPrices()
  const cheapest = useCheapestWindow(hours)

  const todayKey = helsinkiDateKey(now)
  const window = cheapest.state.status === 'success' ? cheapest.state.data.window : null

  return (
    <div className="mx-auto min-h-svh max-w-3xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-5">
        <p className="text-sm text-muted-foreground">{formatDate(now)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Pörssisähkö (koti)</h1>
      </header>

      <main className="grid grid-cols-1 gap-4 sm:grid-cols-2 *:min-w-0">
        <CurrentPriceCard request={prices} now={now} todayKey={todayKey} />
        <CheapestWindowCard
          request={cheapest}
          hours={hours}
          onHoursChange={setHours}
          now={now}
          todayKey={todayKey}
        />
        <DayPricesCard request={prices} window={window} now={now} todayKey={todayKey} />
      </main>

      <footer className="mt-6 text-center text-xs text-muted-foreground">
        Hintalähde: porssisahko.net · ajat Suomen aikaa
      </footer>
    </div>
  )
}
