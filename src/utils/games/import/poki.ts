class PokiGames {
	private baseUrl: string;
	private allGamesUrl: string;
	private fetch: any;

	constructor(fetch: any) {
		this.baseUrl = 'https://poki.com';
		this.allGamesUrl = `${this.baseUrl}/en/all-games`;
		this.fetch = fetch;
	}

	async fetchHtml(url: string): Promise<string> {
		const response = await this.fetch(url);
		return await response;
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

		const allGames = Array.from(allGameSlugs.entries(), ([slug, name]) => ({
			name,
			image: '',
			url: `${this.baseUrl}/en/g/${slug}`,
			tags: [],
			engine: 'proxy'
		}));

		allGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

		return allGames;
	}
}

export { PokiGames };
