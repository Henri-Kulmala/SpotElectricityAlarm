// Development: requests go through Vite's proxy at /api (see vite.config.ts).
// Production build: the API is called directly, so it must allow the site's
// origin in its CORS settings. A trailing slash in the env value is ignored.
const API_BASE_URL: string = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type QueryParams = Record<string, string | number | undefined>

function buildUrl(path: string, params?: QueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) search.set(key, String(value))
  }
  const query = search.toString()
  return `${API_BASE_URL}${path}${query ? `?${query}` : ''}`
}

// Error bodies are { error } from the Lambda or { message } from API Gateway.
async function readErrorMessage(response: Response): Promise<string> {
  if (response.status === 429) return 'Liian monta pyyntöä, yritä hetken päästä uudelleen.'
  try {
    const body = await response.json()
    return body.error ?? body.message ?? `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

export async function apiGet<T>(
  path: string,
  params?: QueryParams,
  signal?: AbortSignal,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, 'VITE_API_URL puuttuu (.env.local)')
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, params), { signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'Verkkovirhe: rajapintaan ei saatu yhteyttä.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }
  return (await response.json()) as T
}
