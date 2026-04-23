import type { FetchResult, Listing, MarketType } from '../types.ts'

/**
 * Aster DEX (BNB Chain perp DEX) — its futures API mirrors Binance's fapi shape,
 * so we can reuse the exchangeInfo schema directly.
 *
 * If this endpoint turns out to be wrong or Aster adds a separate spot endpoint,
 * update the URL(s) and the mapping below.
 */
const ASTER_FUTURES_EXCHANGE_INFO =
  'https://fapi.asterdex.com/fapi/v1/exchangeInfo'

const ALLOWED_QUOTES = new Set(['USDT', 'USDC'])

interface BinanceLikeSymbol {
  symbol: string
  status?: string
  contractStatus?: string
  baseAsset: string
  quoteAsset: string
  contractType?: string
}

function normalizeType(contractType?: string): MarketType {
  if (!contractType) return 'swap'
  const t = contractType.toUpperCase()
  if (t.includes('PERPETUAL')) return 'swap'
  return 'future'
}

export async function fetchAster(): Promise<FetchResult> {
  const listingsByBase = new Map<string, Listing[]>()

  try {
    const res = await fetch(ASTER_FUTURES_EXCHANGE_INFO)
    if (!res.ok) throw new Error(`aster ${res.status}`)
    const body = (await res.json()) as { symbols?: BinanceLikeSymbol[] }

    let count = 0
    for (const s of body.symbols ?? []) {
      const active =
        (s.status ?? s.contractStatus ?? '').toUpperCase() === 'TRADING'
      if (!active) continue
      const base = (s.baseAsset ?? '').toUpperCase()
      const quote = (s.quoteAsset ?? '').toUpperCase()
      if (!base || !ALLOWED_QUOTES.has(quote)) continue

      const listing: Listing = {
        symbol: s.symbol,
        quote,
        type: normalizeType(s.contractType),
      }
      const arr = listingsByBase.get(base)
      if (arr) arr.push(listing)
      else listingsByBase.set(base, [listing])
      count++
    }

    return {
      exchange: 'Aster',
      status: { ok: true, count, error: null },
      listingsByBase,
    }
  } catch (err) {
    return {
      exchange: 'Aster',
      status: {
        ok: false,
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      },
      listingsByBase,
    }
  }
}
