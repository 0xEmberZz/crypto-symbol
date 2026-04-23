import type { FetchResult, Listing, MarketType } from '../types.ts'

/**
 * Lighter (L2 perp DEX). Docs: https://apidocs.lighter.xyz/
 * Response shape (verified against live API):
 *   {
 *     code: 200,
 *     order_books: [
 *       { symbol: "NMR", market_type: "perp", status: "active", ... },
 *       ...
 *     ]
 *   }
 * Lighter markets are USDC-margined; the `symbol` is the base asset.
 */
const LIGHTER_ORDER_BOOKS = 'https://mainnet.zklighter.elliot.ai/api/v1/orderBooks'

interface LighterOrderBook {
  symbol: string
  market_id: number
  market_type: string
  status: string
}

function normalizeType(marketType: string): MarketType {
  switch (marketType) {
    case 'perp':
      return 'swap'
    case 'spot':
      return 'spot'
    default:
      return 'other'
  }
}

export async function fetchLighter(): Promise<FetchResult> {
  const listingsByBase = new Map<string, Listing[]>()

  try {
    const res = await fetch(LIGHTER_ORDER_BOOKS)
    if (!res.ok) throw new Error(`lighter ${res.status}`)
    const body = (await res.json()) as {
      code?: number
      order_books?: LighterOrderBook[]
    }
    if (body.code !== 200) throw new Error(`lighter: code=${body.code}`)

    let count = 0
    for (const ob of body.order_books ?? []) {
      if (ob.status !== 'active') continue
      const base = (ob.symbol ?? '').toUpperCase()
      if (!base) continue
      const type = normalizeType(ob.market_type)
      if (type !== 'spot' && type !== 'swap') continue

      const listing: Listing = {
        symbol: ob.symbol,
        quote: 'USDC',
        type,
      }
      const arr = listingsByBase.get(base)
      if (arr) arr.push(listing)
      else listingsByBase.set(base, [listing])
      count++
    }

    return {
      exchange: 'Lighter',
      status: { ok: true, count, error: null },
      listingsByBase,
    }
  } catch (err) {
    return {
      exchange: 'Lighter',
      status: {
        ok: false,
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      },
      listingsByBase,
    }
  }
}
