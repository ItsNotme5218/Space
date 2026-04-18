//import { FernGames } from "./fern";
import { GnMathGames } from "./gn-math";
import { TruffledGames } from "./truffled";
import { SeleniteGames } from "./selenite";
import { VelaraGames } from "./velara";
import { DefinitelyScienceGames } from "./defsci";
import { NowGGGames } from "./nowgg";
import { CoolMathGames } from "./coolmath";
import { VaporGames } from "./vapor";
import { DogeUBGames } from "./dogeub";
import { PokiGames } from "./poki";

/**
 * Fetch helper for importers.
 *
 * Strategy: try native fetch FIRST with a short timeout. Most public
 * CDN / GitHub URLs (cdn.jsdelivr.net, raw.githubusercontent.com) resolve
 * instantly this way and never need the proxy. Only when native fetch
 * fails (CORS block, network error, non-2xx) do we fall back to the
 * App-level proxy (window.proxy) to bypass CORS.
 *
 * This matters because BareMux/wisp can hang indefinitely if the wisp
 * server or service worker isn't healthy. Proxy-first would stall every
 * importer — including the CDN ones that don't need it — until the outer
 * 15s timeout kills them, which is why the user was seeing "only 275
 * games" (the local JSON, no imports at all) when baremux was broken.
 * Native-first ensures we always get the "easy" sources even when the
 * proxy is down.
 */
async function importerFetch(url: string, params?: any): Promise<string> {
  const NATIVE_TIMEOUT_MS = 5000;
  const PROXY_TIMEOUT_MS = 9000;
  const PROXY_WAIT_MS = 4000;

  const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`[importerFetch] ${label} timeout after ${ms}ms`)), ms),
      ),
    ]);

  // 1) Native fetch — fast path for CDNs and anything with permissive CORS.
  try {
    const res = await withTimeout(
      params ? fetch(url, params) : fetch(url),
      NATIVE_TIMEOUT_MS,
      "native",
    );
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } catch {
    // fall through to proxy
  }

  // 2) Proxy fallback — wait briefly for window.proxy to become available.
  const proxyStart = Date.now();
  while (Date.now() - proxyStart < PROXY_WAIT_MS) {
    if (typeof window !== "undefined" && window.proxy) {
      try {
        await window.proxy.ready;
        break;
      } catch {
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  if (typeof window !== "undefined" && window.proxy) {
    try {
      return await withTimeout(window.proxy.fetch(url, params), PROXY_TIMEOUT_MS, "proxy");
    } catch (proxyErr) {
      throw new Error(
        `[importerFetch] native and proxy both failed for ${url}: ${(proxyErr as Error).message}`,
      );
    }
  }

  throw new Error(`[importerFetch] no proxy available and native fetch failed for ${url}`);
}

/**
 * Generate a unique ID from a game name
 * - Converts to lowercase
 * - Replaces spaces with underscores
 * - Removes special characters (keeps alphanumeric and underscores)
 * - Collapses multiple underscores into one
 */
function generateGameId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_") // spaces -> underscores
    .replace(/[^a-z0-9_]/g, "") // remove special chars
    .replace(/_+/g, "_") // collapse multiple underscores
    .replace(/^_|_$/g, ""); // trim leading/trailing underscores
}

class ImportedGames {
  truffled: TruffledGames;
  selenite: SeleniteGames;
  //fern: FernGames;
  gnMath: GnMathGames;
    velara: VelaraGames;
    ds: DefinitelyScienceGames;
    nowgg: NowGGGames;
    coolmath: CoolMathGames;
    vapor: VaporGames;
    dogeub: DogeUBGames;
    poki: PokiGames;
    fetch: (url: string, params?: any) => Promise<string>;
  constructor() {
    this.fetch = importerFetch;
    //this.fern = new FernGames();
    this.gnMath = new GnMathGames(this.fetch);
    this.truffled = new TruffledGames(this.fetch);
    this.selenite = new SeleniteGames(this.fetch);
        this.velara = new VelaraGames(this.fetch);
        this.ds = new DefinitelyScienceGames(this.fetch);
        this.nowgg = new NowGGGames(this.fetch);
        this.coolmath = new CoolMathGames(this.fetch);
        this.vapor = new VaporGames(this.fetch);
        this.dogeub = new DogeUBGames(this.fetch);
        this.poki = new PokiGames(this.fetch);
  }

    async fetchGamesList() {
        const sources: { name: string; importer: { rewriteGamesList: () => Promise<any[]> } }[] = [
            { name: "gnMath", importer: this.gnMath },
            { name: "truffled", importer: this.truffled },
            { name: "selenite", importer: this.selenite },
            { name: "velara", importer: this.velara },
            { name: "ds", importer: this.ds },
            { name: "nowgg", importer: this.nowgg },
            { name: "coolmath", importer: this.coolmath },
            { name: "vapor", importer: this.vapor },
            { name: "dogeub", importer: this.dogeub },
            { name: "poki", importer: this.poki },
        ];

        // Must exceed native (5s) + proxy wait (4s) + proxy (9s) = 18s worst case.
        const IMPORTER_TIMEOUT_MS = 20000;
        const withTimeout = <T,>(p: Promise<T>, name: string): Promise<T> =>
            Promise.race([
                p,
                new Promise<T>((_, reject) =>
                    setTimeout(
                        () => reject(new Error(`[ImportedGames] "${name}" timed out after ${IMPORTER_TIMEOUT_MS}ms`)),
                        IMPORTER_TIMEOUT_MS,
                    ),
                ),
            ]);

        const results = await Promise.allSettled(
            sources.map((s) => withTimeout(s.importer.rewriteGamesList(), s.name)),
        );

        const allGames: any[] = [];
        results.forEach((res, i) => {
            if (res.status === "fulfilled") {
                allGames.push(...res.value);
            } else {
                console.warn(`[ImportedGames] "${sources[i].name}" failed:`, res.reason);
            }
        });
        const gamesWithIds = allGames.map(game => ({
            ...game,
            id: generateGameId(game.name)
        }));

    // Deduplicate by ID (keep first occurrence)
    const seen = new Set<string>();
    const uniqueGames = gamesWithIds.filter((game) => {
      if (seen.has(game.id)) return false;
      seen.add(game.id);
      return true;
    });

    return uniqueGames;
  }

  async rewriteGamesList(jsonGames: any[]) {
    jsonGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return jsonGames;
  }
}

export { ImportedGames, generateGameId };
