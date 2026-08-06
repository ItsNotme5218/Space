# Space v2

A web proxy front end built on [Scramjet](https://github.com/MercuryWorkshop/scramjet), with Ultraviolet as a fallback backend, a Wisp server, and a React app for sessions, apps, and games.

## Requirements

- [Bun](https://bun.sh) (or Node 20+ with npm)

## Setup

```bash
bun install
```

Installing does not fetch the proxy runtime assets. That happens automatically
before `dev`, `build`, `preview`, and `start` via `scripts/sync-runtime-assets.mjs`,
which copies the Scramjet engine, controller, transports, Ultraviolet, and the
bare-mux worker out of `node_modules` and into `public/`. Those directories are
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
| `/u/`   | Ultraviolet (fallback backend)                    |
| `/b/`   | bare-mux worker (used by the Ultraviolet path)    |
| `/w/`   | Wisp WebSocket endpoint                           |

`public/sw.js` is the single service worker: it routes through the Scramjet
controller first and falls back to Ultraviolet. The page-side wiring lives in
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
