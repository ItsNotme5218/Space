//import { FernGames } from "./fern";
import { GnMathGames } from './gn-math';
import { TruffledGames } from './truffled';
import { SeleniteGames } from './selenite';
import { VelaraGames } from './velara';
import { DefinitelyScienceGames } from './defsci';
import { NowGGGames } from './nowgg';
import { CoolMathGames } from './coolmath';
import { VaporGames } from './vapor';
import { DogeUBGames } from './dogeub';
import { PokiGames } from './poki';

const importerFetch = async (url: string, params?: any): Promise<string> => {
	const nativeTimeoutMs = 5000;
	const proxyTimeoutMs = 9000;
	const proxyWaitMs = 4000;

	const withTimeout = <T>(
		p: Promise<T>,
		ms: number,
		label: string
	): Promise<T> =>
		Promise.race([
			p,
			new Promise<T>((_, reject) =>
				setTimeout(
					() =>
						reject(
							new Error(
								`[importerFetch] ${label} timeout after ${ms}ms`
							)
						),
					ms
				)
			)
		]);

	try {
		const res = await withTimeout(
			params ? fetch(url, params) : fetch(url),
			nativeTimeoutMs,
			'native'
		);
		if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
		return await res.text();
	} catch {}

	const proxyStart = Date.now();
	while (Date.now() - proxyStart < proxyWaitMs) {
		if (typeof window !== 'undefined' && window.proxy) {
			try {
				await window.proxy.ready;
				break;
			} catch {
				break;
			}
		}
		await new Promise(r => setTimeout(r, 50));
	}

	if (typeof window !== 'undefined' && window.proxy) {
		try {
			return await withTimeout(
				window.proxy.fetch(url, params),
				proxyTimeoutMs,
				'proxy'
			);
		} catch (proxyErr) {
			throw new Error(
				`[importerFetch] native and proxy both failed for ${url}: ${(proxyErr as Error).message}`
			);
		}
	}

	throw new Error(
		`[importerFetch] no proxy available and native fetch failed for ${url}`
	);
};

const generateGameId = (name: string): string =>
	name
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_]/g, '')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '');

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
		const sources: {
			name: string;
			importer: { rewriteGamesList: () => Promise<any[]> };
		}[] = [
			{ name: 'gnMath', importer: this.gnMath },
			{ name: 'truffled', importer: this.truffled },
			{ name: 'selenite', importer: this.selenite },
			{ name: 'velara', importer: this.velara },
			{ name: 'ds', importer: this.ds },
			{ name: 'nowgg', importer: this.nowgg },
			{ name: 'coolmath', importer: this.coolmath },
			{ name: 'vapor', importer: this.vapor },
			{ name: 'dogeub', importer: this.dogeub },
			{ name: 'poki', importer: this.poki }
		];

		const importerTimeoutMs = 20000;
		const withTimeout = <T>(p: Promise<T>, name: string): Promise<T> =>
			Promise.race([
				p,
				new Promise<T>((_, reject) =>
					setTimeout(
						() =>
							reject(
								new Error(
									`[ImportedGames] "${name}" timed out after ${importerTimeoutMs}ms`
								)
							),
						importerTimeoutMs
					)
				)
			]);

		const results = await Promise.allSettled(
			sources.map(s => withTimeout(s.importer.rewriteGamesList(), s.name))
		);

		const allGames: any[] = [];
		results.forEach((res, i) => {
			if (res.status === 'fulfilled') {
				allGames.push(...res.value);
			} else {
				console.warn(
					`[ImportedGames] "${sources[i].name}" failed:`,
					res.reason
				);
			}
		});
		const gamesWithIds = allGames.map(game => ({
			...game,
			id: generateGameId(game.name)
		}));

		const seen = new Set<string>();
		const uniqueGames = gamesWithIds.filter(game => {
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
