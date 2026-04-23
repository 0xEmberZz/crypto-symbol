# crypto-symbol

Hourly-refreshed JSON index of trading pairs across the exchanges that vergex supports. Consumed by the `vergex-web` TokenScope search over the jsDelivr CDN so we don't depend on third-party aggregators (CoinPaprika, CoinGecko) whose rate limits and regional reachability cause the search to silently empty out.

## Output

`supported-symbols.json` at the repo root. Shape:

```jsonc
{
  "generated_at": "2026-04-23T12:00:00Z",
  "version": 1,
  "exchanges": {
    "Binance": { "ok": true, "count": 412, "error": null },
    "Lighter": { "ok": false, "count": 0, "error": "not yet integrated" }
  },
  "tokens": {
    "BTC": {
      "listings": {
        "Binance": [{ "symbol": "BTCUSDT", "quote": "USDT", "type": "spot" }],
        "OKX":     [{ "symbol": "BTC-USDT", "quote": "USDT", "type": "spot" }]
      }
    }
  }
}
```

## Consumption

Via jsDelivr (global CDN, good CN reachability, no auth):

```
https://cdn.jsdelivr.net/gh/0xEmberZz/crypto-symbol@main/supported-symbols.json
```

jsDelivr caches the `@main` branch for ~12h. To bypass stale cache, append `?t=<yyyymmddhh>` which changes hourly but is still served from the CDN.

## Refresh

GitHub Actions runs `.github/workflows/refresh.yml` hourly on cron. The workflow:

1. Installs CCXT + deps via pnpm
2. Runs `pnpm build` → `src/build.ts` → fans out to every fetcher in parallel
3. If `supported-symbols.json` changed, commits and pushes back to `main`

Partial failure is tolerated — if Binance is down but the other 8 exchanges respond, the index still publishes with Binance marked `ok: false`. Only a total blackout (every fetcher failed) aborts the commit.

## Sources

- 7 exchanges via [CCXT](https://github.com/ccxt/ccxt): Binance, OKX, Bybit, Bitget, Gate, KuCoin, Hyperliquid
- Aster: direct `fapi.asterdex.com/fapi/v1/exchangeInfo` (Binance-compatible shape)
- Lighter: **stub — endpoint pending**

## Local dev

```bash
pnpm install
pnpm build           # writes supported-symbols.json
pnpm typecheck
```
