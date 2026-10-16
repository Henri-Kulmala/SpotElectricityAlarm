import { useEffect, useState } from 'react'
import { getCheapestWindow, getSpotPrices } from '../lib/api/spotPriceHandlers'
import { formatDay, formatPrice, formatTime, isCurrentHour } from '../lib/format'
import type { CheapestWindowResponse, SpotPricesResponse } from '../types/api'

// Each request is in exactly one of these states.
type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }

const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6]

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Tuntematon virhe'
}

export default function LandingPage() {
  const [prices, setPrices] = useState<LoadState<SpotPricesResponse>>({ status: 'loading' })
  const [hours, setHours] = useState(2)
  // Remember which `hours` the result belongs to, so changing the selection
  // shows "loading" until the matching result arrives.
  const [cheapest, setCheapest] = useState<{
    hours: number
    state: LoadState<CheapestWindowResponse>
  } | null>(null)

  // Hourly prices: fetched once on mount.
  useEffect(() => {
    const controller = new AbortController()
    getSpotPrices({}, controller.signal)
      .then((data) => setPrices({ status: 'success', data }))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setPrices({ status: 'error', message: errorMessage(err) })
        }
      })
    // Cancels the request if the component unmounts (also in StrictMode's double run).
    return () => controller.abort()
  }, [])

  // Cheapest window: re-fetched whenever the window length changes.
  useEffect(() => {
    const controller = new AbortController()
    getCheapestWindow({ hours }, controller.signal)
      .then((data) => setCheapest({ hours, state: { status: 'success', data } }))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setCheapest({ hours, state: { status: 'error', message: errorMessage(err) } })
        }
      })
    return () => controller.abort()
  }, [hours])

  const cheapestState: LoadState<CheapestWindowResponse> =
    cheapest && cheapest.hours === hours ? cheapest.state : { status: 'loading' }

  return (
    <main className="landing">
      <h1>Pörssisähkö</h1>

      <section className="card">
        <h2>Edullisin aika käyttää sähköä</h2>
        <label>
          Jakson pituus:{' '}
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h} h
              </option>
            ))}
          </select>
        </label>
        <CheapestWindowView state={cheapestState} />
      </section>

      <section className="card">
        <h2>Tuntihinnat</h2>
        <PriceTable state={prices} />
      </section>
    </main>
  )
}

function CheapestWindowView({ state }: { state: LoadState<CheapestWindowResponse> }) {
  if (state.status === 'loading') return <p>Ladataan…</p>
  if (state.status === 'error') return <p className="error">Virhe: {state.message}</p>

  const { window, unit } = state.data
  if (!window) {
    return <p>Riittävän pitkää jaksoa ei löytynyt. Huomisen hinnat julkaistaan noin klo 14.</p>
  }

  return (
    <div className="cheapest">
      <p className="cheapest-time">
        {formatDay(window.start)} klo {formatTime(window.start)}–{formatTime(window.end)}
      </p>
      <p>
        Keskihinta <strong>{formatPrice(window.avgPrice)} {unit}</strong>
        {' '}(min {formatPrice(window.minPrice)}, max {formatPrice(window.maxPrice)})
      </p>
    </div>
  )
}

function PriceTable({ state }: { state: LoadState<SpotPricesResponse> }) {
  if (state.status === 'loading') return <p>Ladataan…</p>
  if (state.status === 'error') return <p className="error">Virhe: {state.message}</p>

  const { prices, unit } = state.data
  if (prices.length === 0) return <p>Hintatietoja ei ole saatavilla.</p>

  // Bar widths are relative to the highest price; negative prices get no bar.
  const maxPrice = Math.max(...prices.map((p) => p.price), 0.01)

  return (
    <table className="price-table">
      <thead>
        <tr>
          <th>Päivä</th>
          <th>Klo</th>
          <th className="num">Hinta ({unit})</th>
          <th aria-hidden="true"></th>
        </tr>
      </thead>
      <tbody>
        {prices.map((p) => {
          const current = isCurrentHour(p.start, p.end)
          return (
            <tr key={p.start} className={current ? 'current' : undefined}>
              <td>{formatDay(p.start)}</td>
              <td>
                {formatTime(p.start)}–{formatTime(p.end)}
                {current && <span className="badge">nyt</span>}
              </td>
              <td className="num">
                {formatPrice(p.price)}
                {p.quarters < 4 && <span title="Tunnista puuttuu dataa"> *</span>}
              </td>
              <td className="bar-cell" aria-hidden="true">
                <div className="bar" style={{ width: `${Math.max(p.price, 0) / maxPrice * 100}%` }} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
