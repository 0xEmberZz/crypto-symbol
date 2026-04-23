import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fetchCcxtExchange, type CcxtExchangeSpec } from './fetchers/ccxt-backed.ts'
import { fetchBinance } from './fetchers/binance.ts'
import { fetchAster } from './fetchers/aster.ts'
import { fetchLighter } from './fetchers/lighter.ts'
import type { FetchResult, SymbolIndex } from './types.ts'

// Binance runs direct via its vision data mirror (api.binance.com 451-blocks
// GitHub Actions runners). See src/fetchers/binance.ts.
const CCXT_EXCHANGES: CcxtExchangeSpec[] = [
  { name: 'OKX', ccxtIds: ['okx'] },
  // api.bybit.com 403-blocks GitHub Actions runners; bytick.com is Bybit's
  // alternate DNS without the same geo filter.
  { name: 'Bybit', ccxtIds: ['bybit'], options: { hostname: 'bytick.com' } },
  { name: 'Bitget', ccxtIds: ['bitget'] },
  { name: 'Gate', ccxtIds: ['gate'] },
  // kucoin = spot only; kucoinfutures covers USDT-M perps.
  { name: 'KuCoin', ccxtIds: ['kucoin', 'kucoinfutures'] },
  { name: 'Hyperliquid', ccxtIds: ['hyperliquid'] },
]

const OUTPUT_FILE = resolve(process.cwd(), 'supported-symbols.json')

async function runAllFetchers(): Promise<FetchResult[]> {
  const tasks: Promise<FetchResult>[] = [
    fetchBinance(),
    ...CCXT_EXCHANGES.map((spec) => fetchCcxtExchange(spec)),
    fetchAster(),
    fetchLighter(),
  ]
  return Promise.all(tasks)
}

function buildIndex(results: FetchResult[]): SymbolIndex {
  const exchanges: SymbolIndex['exchanges'] = {}
  const tokens: SymbolIndex['tokens'] = {}

  for (const result of results) {
    exchanges[result.exchange] = result.status
    for (const [base, listings] of result.listingsByBase) {
      const token =
        tokens[base] ?? (tokens[base] = { listings: {} })
      token.listings[result.exchange] = listings
    }
  }

  // Stable key order for readable diffs (tokens sorted, listings already array-ordered by fetch).
  const sortedTokens: SymbolIndex['tokens'] = {}
  for (const base of Object.keys(tokens).sort()) {
    sortedTokens[base] = tokens[base]
  }

  return {
    generated_at: new Date().toISOString(),
    version: 1,
    exchanges,
    tokens: sortedTokens,
  }
}

function logSummary(results: FetchResult[], totalTokens: number) {
  const lines = results.map(
    (r) =>
      `  ${r.exchange.padEnd(12)} ${r.status.ok ? 'ok  ' : 'FAIL'}  ${String(r.status.count).padStart(5)} listings` +
      (r.status.error ? `  (${r.status.error})` : '')
  )
  console.log('Exchange fetch summary:')
  console.log(lines.join('\n'))
  console.log(`Total unique base assets: ${totalTokens}`)
}

async function main() {
  const results = await runAllFetchers()
  const index = buildIndex(results)
  await writeFile(OUTPUT_FILE, JSON.stringify(index, null, 2) + '\n', 'utf8')
  logSummary(results, Object.keys(index.tokens).length)
  console.log(`Wrote ${OUTPUT_FILE}`)

  // Fail the CI run only if *every* exchange failed — that means something
  // is fundamentally broken (network, CCXT upgrade, etc.). Partial failure
  // is expected and acceptable: the JSON records which sources are down.
  const allFailed = results.every((r) => !r.status.ok)
  if (allFailed) {
    console.error('All fetchers failed — not publishing a useless index.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
