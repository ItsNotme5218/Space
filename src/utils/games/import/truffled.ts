class TruffledGames {
	private truffledUrl: string;
	private fetch: any;

	constructor(fetch: any) {
		this.truffledUrl = 'https://truffled.lol/';
		this.fetch = fetch;
	}

	async fetchJson() {
		const response = await this.fetch(
			new URL(this.truffledUrl) + '/js/json/g.json'
		);
		const data = JSON.parse(await response);
		return data;
	}

	async rewriteGamesList() {
		const jsonData = await this.fetchJson();
		const jsonGames = jsonData.games || [];

		const rewrittenGames = jsonGames.map((entry: any) => ({
			image: this.truffledUrl + entry.thumbnail,
			url: this.truffledUrl + entry.url,
			name: entry.name,
			tags: [],
			engine:
				entry.frameType === 'iframe'
					? 'proxy'
					: entry.frameType || 'proxy',
			description: entry.description || null
		}));

		rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

		return rewrittenGames;
	}
}

export { TruffledGames };
