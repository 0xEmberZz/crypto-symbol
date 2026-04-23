import ccxt, { type Exchange } from 'ccxt'
import type { FetchResult, Listing, MarketType } from '../types.ts'

export interface CcxtExchangeSpec {
  /** Display name used as the key in the output JSON. */
  name: string
  /** CCXT exchange id(s). A single brand may span multiple ids (e.g. kucoin + kucoinfutures). */
  ccxtIds: string[]
  /** Per-exchange CCXT constructor options (e.g. hostname overrides). */
  options?: Record<string, unknown>
}

const ALLOWED_QUOTES = new Set(['USDT', 'USDC'])
// Token search cares about "can I trade this coin on X". Dated futures and
// options bloat the index (each strike/expiry is its own CCXT market) without
// adding signal for that question — keep only spot and perpetual swap.
const KEEP_TYPES = new Set<MarketType>(['spot', 'swap'])

function normalizeType(type: string | undefined): MarketType {
  switch (type) {
    case 'spot':
      return 'spot'
    case 'swap':
      return 'swap'
    case 'future':
    case 'futures':
      return 'future'
    default:
      return 'other'
  }
}

async function loadMarketsForId(
  ccxtId: string,
  extraOptions?: Record<string, unknown>
): Promise<any[]> {
  const ExchangeClass = (ccxt as any)[ccxtId]
  if (!ExchangeClass) {
    throw new Error(`ccxt: no exchange class for id "${ccxtId}"`)
  }
  const ex: Exchange = new ExchangeClass({
    enableRateLimit: true,
    ...extraOptions,
  })
  const markets = await ex.loadMarkets()
  return Object.values(markets)
}

export async function fetchCcxtExchange(
  spec: CcxtExchangeSpec
): Promise<FetchResult> {
  const listingsByBase = new Map<string, Listing[]>()

  try {
    const allMarkets: any[] = []
    for (const ccxtId of spec.ccxtIds) {
      const markets = await loadMarketsForId(ccxtId, spec.options)
      allMarkets.push(...markets)
    }

    let count = 0
    for (const m of allMarkets) {
      if (m?.active === false) continue
      const base = String(m?.base ?? '').toUpperCase()
      const quote = String(m?.quote ?? '').toUpperCase()
      if (!base || !ALLOWED_QUOTES.has(quote)) continue

      const type = normalizeType(m?.type)
      if (!KEEP_TYPES.has(type)) continue

      const rawSymbol = String(m?.id ?? m?.symbol ?? '')
      if (!rawSymbol) continue

      const listing: Listing = {
        symbol: rawSymbol,
        quote,
        type,
      }
      const arr = listingsByBase.get(base)
      if (arr) arr.push(listing)
      else listingsByBase.set(base, [listing])
      count++
    }

    return {
      exchange: spec.name,
      status: { ok: true, count, error: null },
      listingsByBase,
    }
  } catch (err) {
    return {
      exchange: spec.name,
      status: {
        ok: false,
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      },
      listingsByBase,
    }
  }
}
