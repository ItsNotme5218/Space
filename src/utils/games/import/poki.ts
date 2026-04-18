class PokiGames {
	private baseUrl: string;
	private allGamesUrl: string;
	private searchApiUrl: string;
	private imageBaseUrl: string;
	private fetch: any;

	constructor(fetch: any) {
		this.baseUrl = 'https://poki.com';
		this.allGamesUrl = `${this.baseUrl}/en/all-games`;
		this.searchApiUrl = 'https://api.poki.com/search/query/3';
		this.imageBaseUrl = 'https://img.poki-cdn.com/cdn-cgi/image/f=auto';
		this.fetch = fetch;
	}

	async fetchHtml(url: string): Promise<string> {
		const response = await this.fetch(url);
		return await response;
	}

	async fetchJson(url: string): Promise<any> {
		const response = await this.fetch(url);
		return JSON.parse(await response);
	}

	parsePageUrls(html: string): string[] {
		const pageUrls: string[] = [this.allGamesUrl];

		const pagePattern = /\/en\/all-games\/(\d+)/g;
		const matches = html.matchAll(pagePattern);
		const pageNumbers = new Set<number>();

		for (const match of matches) {
			pageNumbers.add(parseInt(match[1], 10));
		}

		const sortedPages = Array.from(pageNumbers).sort((a, b) => a - b);
		for (const pageNum of sortedPages) {
			pageUrls.push(`${this.baseUrl}/en/all-games/${pageNum}`);
		}

		return pageUrls;
	}

	parseGamesFromPage(html: string): { name: string; slug: string }[] {
		const games: { name: string; slug: string }[] = [];

		const gamePattern =
			/<a[^>]*href="\/en\/g\/([^"]+)"[^>]*>([^<]+)<\/a>/gi;
		const matches = html.matchAll(gamePattern);

		for (const match of matches) {
			const slug = match[1];
			const name = match[2].trim();

			if (name && slug && !slug.includes('/')) {
				games.push({ name, slug });
			}
		}

		return games;
	}

	async getGameImage(gameName: string): Promise<string> {
		try {
			const encodedName = encodeURIComponent(gameName);
			const searchUrl = `${this.searchApiUrl}?q=${encodedName}&device=desktop&country=US`;
			const data = await this.fetchJson(searchUrl);

			if (data.games && Array.isArray(data.games)) {
				const normalizedSearchName = gameName
					.toLowerCase()
					.replace(/[^a-z0-9]/g, '');

				for (const game of data.games) {
					const normalizedGameName = (game.title || '')
						.toLowerCase()
						.replace(/[^a-z0-9]/g, '');

					if (
						normalizedGameName === normalizedSearchName &&
						game.image?.path
					) {
						return `${this.imageBaseUrl}/${game.image.path}`;
					}
				}

				if (data.games[0]?.image?.path) {
					return `${this.imageBaseUrl}/${data.games[0].image.path}`;
				}
			}
		} catch (e) {
			console.error('Error fetching game image:', e);
		}

		return '';
	}

	async rewriteGamesList() {
		const firstPageHtml = await this.fetchHtml(this.allGamesUrl);
		const pageUrls = this.parsePageUrls(firstPageHtml);

		const pageResults = await Promise.allSettled(
			pageUrls.map(url => this.fetchHtml(url))
		);

		const allGameSlugs = new Map<string, string>();

		for (const result of pageResults) {
			if (result.status !== 'fulfilled') continue;
			const games = this.parseGamesFromPage(result.value);

			for (const game of games) {
				if (!allGameSlugs.has(game.slug)) {
					allGameSlugs.set(game.slug, game.name);
				}
			}
		}

		const gameEntries = Array.from(allGameSlugs.entries());
		const batchSize = 10;
		const allGames: any[] = [];

		for (let i = 0; i < gameEntries.length; i += batchSize) {
			const batch = gameEntries.slice(i, i + batchSize);

			const batchResults = await Promise.allSettled(
				batch.map(async ([slug, name]) => {
					const image = await this.getGameImage(name);
					return {
						name,
						image,
						url: `${this.baseUrl}/en/g/${slug}`,
						tags: [],
						engine: 'proxy'
					};
				})
			);

			for (const result of batchResults) {
				if (result.status === 'fulfilled') {
					allGames.push(result.value);
				}
			}
		}

		allGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

		return allGames;
	}
}

export { PokiGames };
