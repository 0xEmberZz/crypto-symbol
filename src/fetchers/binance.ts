import type { FetchResult, Listing } from '../types.ts'

/**
 * Binance geoblocks api.binance.com from GitHub Actions (Azure US, HTTP 451).
 * The vision data mirror is not subject to the same regulatory geoblock —
 * it's a read-only market-data subdomain Binance maintains for public consumption.
 * Only SPOT is mirrored; we accept missing futures for now.
 */
const BINANCE_SPOT_EXCHANGE_INFO =
  'https://data-api.binance.vision/api/v3/exchangeInfo?permissions=SPOT'

const ALLOWED_QUOTES = new Set(['USDT', 'USDC'])

interface BinanceSpotSymbol {
  symbol: string
  status?: string
  baseAsset: string
  quoteAsset: string
}

export async function fetchBinance(): Promise<FetchResult> {
  const listingsByBase = new Map<string, Listing[]>()

  try {
    const res = await fetch(BINANCE_SPOT_EXCHANGE_INFO)
    if (!res.ok) throw new Error(`binance ${res.status}`)
    const body = (await res.json()) as { symbols?: BinanceSpotSymbol[] }

    let count = 0
    for (const s of body.symbols ?? []) {
      if ((s.status ?? '').toUpperCase() !== 'TRADING') continue
      const base = (s.baseAsset ?? '').toUpperCase()
      const quote = (s.quoteAsset ?? '').toUpperCase()
      if (!base || !ALLOWED_QUOTES.has(quote)) continue

      const listing: Listing = { symbol: s.symbol, quote, type: 'spot' }
      const arr = listingsByBase.get(base)
      if (arr) arr.push(listing)
      else listingsByBase.set(base, [listing])
      count++
    }

    return {
      exchange: 'Binance',
      status: { ok: true, count, error: null },
      listingsByBase,
    }
  } catch (err) {
    return {
      exchange: 'Binance',
      status: {
        ok: false,
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      },
      listingsByBase,
    }
  }
}
