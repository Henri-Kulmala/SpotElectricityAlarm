import { useEffect, useEffectEvent, useState } from 'react'
import { getCheapestWindow, getSpotPrices } from '@/lib/api/spotPriceHandlers'
import type { CheapestWindowResponse, SpotPricesResponse } from '@/types/api'

// Each request is in exactly one of these states.
export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }

export interface ApiRequest<T> {
  state: LoadState<T>
  retry: () => void
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Tuntematon virhe'
}

/**
 * Runs `request` whenever `key` changes (or retry is called).
 * The result is stored together with the key it belongs to, so while a new
 * request is on its way the state is "loading" instead of stale data.
 */
function useApiRequest<T>(
  key: string,
  request: (signal: AbortSignal) => Promise<T>,
): ApiRequest<T> {
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${key}#${attempt}`
  const [result, setResult] = useState<{ key: string; state: LoadState<T> } | null>(null)

  // Always calls the latest `request` without making it an effect dependency.
  const runRequest = useEffectEvent((signal: AbortSignal) => request(signal))

  useEffect(() => {
    const controller = new AbortController()
    runRequest(controller.signal)
      .then((data) => setResult({ key: requestKey, state: { status: 'success', data } }))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, state: { status: 'error', message: errorMessage(err) } })
        }
      })
    // Cancels the request on unmount or when the key changes.
    return () => controller.abort()
  }, [requestKey])

  return {
    state: result?.key === requestKey ? result.state : { status: 'loading' },
    retry: () => setAttempt((a) => a + 1),
  }
}

export function useSpotPrices(): ApiRequest<SpotPricesResponse> {
  return useApiRequest('spot-prices', (signal) => getSpotPrices({}, signal))
}

export function useCheapestWindow(hours: number): ApiRequest<CheapestWindowResponse> {
  return useApiRequest(`cheapest-${hours}`, (signal) => getCheapestWindow({ hours }, signal))
}

/** Current time, updated every `intervalMs` so "now" markers move on their own. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
