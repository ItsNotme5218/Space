class GnMathGames {
	private jsonUrl: string;
	private htmlUrl: string;
	private coverUrl: string;
	private fetch: any;

	constructor(fetch: any) {
		this.jsonUrl =
			'https://raw.githubusercontent.com/gn-math/assets/main/zones.json';
		this.htmlUrl = 'https://raw.githubusercontent.com/gn-math/html/main';
		this.coverUrl = 'https://raw.githubusercontent.com/gn-math/covers/main';
		this.fetch = fetch;
	}

	async fetchJson() {
		const response = await this.fetch(this.jsonUrl);
		const data = JSON.parse(await response);
		return data;
	}

	async rewriteGamesList() {
		const jsonGames = await this.fetchJson();

		const rewrittenGames = jsonGames
			.filter((entry: any) => entry.id !== -1)
			.map((entry: any) => {
				const resolveCatalogUrl = (url: string) =>
					url
						.replaceAll('{HTML_URL}', this.htmlUrl)
						.replaceAll('{COVER_URL}', this.coverUrl);

				return {
					name: entry.name,
					image: resolveCatalogUrl(entry.cover || `{COVER_URL}/${entry.id}.png`),
					url: resolveCatalogUrl(entry.url),
					tags: entry.special ?? entry.tags ?? [],
					engine: 'iframe',
					description: entry.description || null
				};
			});

		rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

		return rewrittenGames;
	}
}

export { GnMathGames };
