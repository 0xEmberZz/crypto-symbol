export type MarketType = 'spot' | 'swap' | 'future' | 'other'

export interface Listing {
  /** Raw symbol string as used by the exchange's own API (e.g. BTCUSDT, BTC-USDT-SWAP). */
  symbol: string
  quote: string
  type: MarketType
}

export interface ExchangeStatus {
  ok: boolean
  count: number
  error: string | null
}

export interface FetchResult {
  exchange: string
  status: ExchangeStatus
  /** Keyed by uppercase base asset (e.g. "BTC"). */
  listingsByBase: Map<string, Listing[]>
}

export interface SymbolIndex {
  generated_at: string
  version: 1
  exchanges: Record<string, ExchangeStatus>
  tokens: Record<
    string,
    { listings: Record<string, Listing[]> }
  >
}
