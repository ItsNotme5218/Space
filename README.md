# Space v2

A web proxy front end built on [Scramjet](https://github.com/MercuryWorkshop/scramjet), direct Libcurl/Epoxy transports, a Wisp server, and a React app for sessions, apps, and games.

## Requirements

- [Bun](https://bun.sh) (or Node 20+ with npm)

## Setup

```bash
bun install
```

Installing does not fetch the proxy runtime assets. That happens automatically
before `dev`, `build`, `preview`, and `start` via `scripts/sync-runtime-assets.mjs`,
which copies the Scramjet engine, controller, Libcurl/Epoxy transports, Night+
client assets, and login UI out of `node_modules` and into `public/`. Those directories are
generated and gitignored; run the script by hand if you ever need to refresh them:

```bash
node scripts/sync-runtime-assets.mjs
```

## Development

```bash
bun run dev
```

This starts Vite on its own port and the Fastify server (`index.ts`) on `6060`.
Vite proxies `/api`, `/auth`, and the `/w/` Wisp WebSocket through to Fastify.

## Production

For configured static/HTML/SVG deployments and universal proxy-context adapters,
see `BUILD_REFERENCE.md`, `.env.example`, and `VERIFICATION.md`. Static mode is
independent of optional account APIs; it does not turn unavailable APIs into
successful authentication. Configure a real Wisp endpoint rather than relying
on example domains. `index.svg?view=games` hosts the same app as HTML.

### Local integration acceptance

```bash
bun run test
bun run typecheck
bun run build:server
bun run test:e2e
bun run build:static
bun run test:acceptance
bun run test:launch-diagnostics
node tests/browser/external-smoke.mjs
```

Run these sequentially: fixtures consume the current `dist/` profile. The
configured list **and JSON** reporters retain successful body-only evidence in
`/tmp/opencode/task10-matrix-results.json`; set `SPACE_E2E_JSON` to a distinct
path for each profile. Do not override with `--reporter=list`, which drops that
JSON evidence. Protocol boundary traces include request/session correlations,
document generation, adapter state and long tasks without changing deadlines.
Ordinary acceptance disables Playwright snapshot tracing to avoid extra work
through intercepted DOM getters. Use `--trace on` for a separately recorded
diagnostic run; retain JSON in both runs and compare the same build/assertions.

Acceptance fixtures require this source workspace's installed Nebula/Daydream
controllers/adapters, OpenSSL for an ephemeral localhost WSS certificate, and
`../shoestring-space`; production Space builds do not. The browser's certificate
exception is test-only and must not be copied into production configuration.
They use ephemeral localhost source/game/bootstrap/Wisp servers, actual host
codecs/controllers, no automatic retries, and no public deployment. The external
2048 smoke is separate and its failure does not excuse controlled-game failures.
Run after a complete build and not while rebuilding `dist/`. BFCache attempts
record actual denial rather than substituting synthetic lifecycle success.
Read `VERIFICATION.md` for remaining gates before claiming acceptance.

```bash
bun run build
bun run start
```

`build` emits the client into `dist/`; `start` runs the Fastify server, which
serves `dist/` statically and terminates Wisp WebSocket upgrades at `/w/`.

| Variable | Default     | Purpose                                       |
| -------- | ----------- | --------------------------------------------- |
| `PORT`   | `6060`      | Listen port                                   |
| `HOST`   | `127.0.0.1` | Bind address, set `0.0.0.0` behind a proxy     |

Put a TLS-terminating reverse proxy in front of it in production. The app needs
HTTPS for service workers on anything but `localhost`.

## Runtime layout

| Path    | Contents                                          |
| ------- | ------------------------------------------------- |
| `/s/`   | Scramjet engine (`scramjet.js`, `scramjet.wasm`)  |
| `/c/`   | Scramjet controller (page API, service worker, inject) |
| `/ut/`  | Scramjet utils                                    |
| `/l/`   | libcurl transport                                 |
| `/ep/`  | epoxy transport                                   |
| `/p/`   | Night+ client runtime                             |
| `/w/`   | Wisp WebSocket endpoint                           |

`public/sw.js` is the single service worker: it imports the shared Space proxy
configuration and routes through the Scramjet controller. The page-side wiring lives in
[`src/utils/proxy.ts`](src/utils/proxy.ts).

## Scripts

| Script    | Does                                    |
| --------- | --------------------------------------- |
| `dev`     | Vite dev server + Fastify               |
| `build`   | Production client build into `dist/`    |
| `start`   | Fastify server only (serves `dist/`)    |
| `preview` | Preview a production build              |
| `lint`    | ESLint + type checking                  |

## License

AGPL-3.0-only, see [LICENSE](LICENSE). Scramjet is AGPL-3.0-only, so any
network-accessible deployment of this project must offer its complete
corresponding source to users.
