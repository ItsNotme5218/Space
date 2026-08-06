class VaporGames {
	private baseUrl: string;
	private listUrl: string;
	private fetch: any;

	constructor(fetch: any) {
		this.baseUrl = 'https://vapor.onl';
		this.listUrl = `${this.baseUrl}/asset/json/gamelists.json`;
		this.fetch = fetch;
	}

	async fetchJson() {
		const response = await this.fetch(this.listUrl);
		const data = JSON.parse(await response);

		return data;
	}

	async fetchZone(file: string) {
		const response = await this.fetch(`${this.baseUrl}${file}`);
		const data = JSON.parse(await response);

		return data;
	}

	async rewriteGamesList() {
		const listData = await this.fetchJson();

		const zones: { file: string; type: string }[] = [];

		for (const col of [listData.Col1, listData.Col2]) {
			if (!Array.isArray(col)) continue;
			for (const entry of col) {
				if (entry.Type === 'divider' || !entry.File) continue;
				zones.push({ file: entry.File, type: entry.Type });
			}
		}

		const zoneResults = await Promise.allSettled(
			zones.map(z => this.fetchZone(z.file))
		);

		const allGames: any[] = [];

		for (const result of zoneResults) {
			if (result.status !== 'fulfilled') continue;
			const games = Array.isArray(result.value) ? result.value : [];

			for (const entry of games) {
				if (!entry.name || !entry.url) continue;

				allGames.push({
					name: entry.name,
					image: entry.cover
						? entry.cover.startsWith('http')
							? entry.cover
							: `${this.baseUrl}${entry.cover}`
						: '',
					url: entry.url.startsWith('http')
						? entry.url
						: `${this.baseUrl}${entry.url}`,
					tags: entry.tags || [],
					engine: 'proxy'
				});
			}
		}

		allGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

		return allGames;
	}
}

export { VaporGames };
