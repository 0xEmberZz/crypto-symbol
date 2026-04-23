import type { FetchResult } from '../types.ts'

/**
 * Lighter.xyz (L2 orderbook perp DEX on zkSync). A public symbols endpoint
 * exists but is not yet wired in — needs confirmation from the vergex backend
 * (the order-service already talks to Lighter). For now, surface this as an
 * "not yet integrated" status so the rest of the index still builds.
 *
 * TODO: replace with the real endpoint + normalizer.
 */
export async function fetchLighter(): Promise<FetchResult> {
  return {
    exchange: 'Lighter',
    status: {
      ok: false,
      count: 0,
      error: 'not yet integrated — pending endpoint confirmation',
    },
    listingsByBase: new Map(),
  }
}
