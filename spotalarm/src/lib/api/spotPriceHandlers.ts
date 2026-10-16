import type { CheapestWindowResponse, SpotPricesResponse } from '../../types/api'
import { apiGet } from './apiContext'

/** Hourly prices. Without from/to the backend returns about -24 h ... +36 h. */
export function getSpotPrices(
  options: { from?: string; to?: string } = {},
  signal?: AbortSignal,
): Promise<SpotPricesResponse> {
  return apiGet<SpotPricesResponse>('/spot-prices', options, signal)
}

/** Cheapest consecutive window of `hours` (1–6) from the current hour onwards. */
export function getCheapestWindow(
  options: { hours?: number; to?: string } = {},
  signal?: AbortSignal,
): Promise<CheapestWindowResponse> {
  return apiGet<CheapestWindowResponse>('/spot-prices/cheapest', options, signal)
}
