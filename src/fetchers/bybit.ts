import type { FetchResult, Listing } from '../types.ts'

/**
 * Bybit's own public API (api.bybit.com and api.bytick.com) 403s GitHub
 * Actions runners at the IP level. CoinPaprika's per-exchange markets feed
 * is freely accessible from the runner and covers Bybit spot with ~500
 * entries including every mainstream listing — enough for TokenScope's
 * "is this coin on Bybit" question. Bybit perps are not surfaced (neither
 * CoinPaprika nor CoinGecko tracks them meaningfully); accept that gap.
 */
const COINPAPRIKA_BYBIT_SPOT =
  'https://api.coinpaprika.com/v1/exchanges/bybit-spot/markets'

const ALLOWED_QUOTES = new Set(['USDT', 'USDC'])

interface CoinpaprikaMarket {
  pair?: string
  category?: string
  base_currency_id?: string
}

export async function fetchBybit(): Promise<FetchResult> {
  const listingsByBase = new Map<string, Listing[]>()

  try {
    const res = await fetch(COINPAPRIKA_BYBIT_SPOT)
    if (!res.ok) throw new Error(`bybit(cp) ${res.status}`)
    const markets = (await res.json()) as CoinpaprikaMarket[]

    let count = 0
    for (const m of markets) {
      if (m.category !== 'Spot') continue
      const pair = m.pair ?? ''
      const slash = pair.indexOf('/')
      if (slash <= 0) continue
      const base = pair.slice(0, slash).toUpperCase()
      const quote = pair.slice(slash + 1).toUpperCase()
      if (!ALLOWED_QUOTES.has(quote)) continue

      const listing: Listing = {
        // Bybit's native spot symbol is the concatenation without the separator.
        symbol: `${base}${quote}`,
        quote,
        type: 'spot',
      }
      const arr = listingsByBase.get(base)
      if (arr) arr.push(listing)
      else listingsByBase.set(base, [listing])
      count++
    }

    return {
      exchange: 'Bybit',
      status: { ok: true, count, error: null },
      listingsByBase,
    }
  } catch (err) {
    return {
      exchange: 'Bybit',
      status: {
        ok: false,
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      },
      listingsByBase,
    }
  }
}
