interface WitherGameEntry {
	image?: string;
	location?: string;
	title: string;
	tags?: string[];
	frameType?: string;
	description?: string | null;
}

class WitherGames {
	private witherUrl: string;
	private fetch: (url: string, params?: RequestInit) => Promise<string>;

	constructor(fetch: (url: string, params?: RequestInit) => Promise<string>) {
		this.witherUrl = 'https://wither.lat/';
		this.fetch = fetch;
	}

	async fetchJson(): Promise<WitherGameEntry[]> {
		const response = await this.fetch(`${this.witherUrl}data/games.json`);
		return JSON.parse(response) as WitherGameEntry[];
	}

	async rewriteGamesList() {
		const jsonGames = await this.fetchJson();

		const rewrittenGames = jsonGames.map(entry => ({
			image: `${this.witherUrl}${entry.image ?? ''}`,
			url: `${this.witherUrl}${entry.location ?? ''}`,
			name: entry.title,
			tags: entry.tags ?? [],
			engine:
				entry.frameType === 'iframe'
					? 'proxy'
					: (entry.frameType ?? 'proxy'),
			description: entry.description ?? null
		}));

		rewrittenGames.sort((a, b) => a.name.localeCompare(b.name));

		return rewrittenGames;
	}
}

export { WitherGames };
