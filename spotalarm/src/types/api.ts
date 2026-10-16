// Types for the spot price API responses. All times are UTC ISO 8601 strings.

export interface HourlyPrice {
  start: string
  end: string
  /** Average of the hour's quarter prices, c/kWh */
  price: number
  /** How many quarters of data the hour had (4 = full hour) */
  quarters: number
}

/** GET /spot-prices */
export interface SpotPricesResponse {
  from: string
  to: string
  unit: string
  prices: HourlyPrice[]
}

export interface CheapestWindow {
  start: string
  end: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  hours: HourlyPrice[]
}

/** GET /spot-prices/cheapest */
export interface CheapestWindowResponse {
  hours: number
  searchedFrom: string
  searchedTo: string
  unit: string
  /** null when there are not enough consecutive hours in the search range */
  window: CheapestWindow | null
}
