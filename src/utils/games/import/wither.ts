class WitherGames {
	private witherUrl: string;
	private fetch: any;

	constructor(fetch: any) {
		this.witherUrl = 'https://wither.lat/';
		this.fetch = fetch;
	}

	async fetchGames() {
		const response = await this.fetch(
			new URL(this.witherUrl) + '/data/games.json'
		);
		const data = JSON.parse(await response);

		return data;
	}

	async rewriteGamesList() {
		const jsonGames = await this.fetchJson();

		const rewrittenGames = jsonGames.map((entry: any) => ({
			image: this.witherUrl + entry.image,
			url: this.witherUrl + entry.location,
			name: entry.title,
			tags: entry.tags || [],
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

export { WitherGames };

function parseGames(html) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	const links = doc.querySelectorAll('.bttn-container a.bttn');
	const results = [];

	links.forEach(a => {
		const h2 = a.querySelector('h2');
		const img = a.querySelector('img');
		if (!h2) return;
		const title = h2.textContent.trim();
		const href = a.getAttribute('href') || '';
		const imgSrc = img ? img.getAttribute('src') || '' : '';

		const slug = href
			.replace(/^(\.\/|gx\/)?/, '')
			.replace(/\.html$/, '')
			.replace(/[^a-zA-Z0-9_-]/g, '');

		results.push({
			id: `wither-${slug}`,
			title,
			developer: '',
			publisher: 'Wither',
			platform: 'HTML5',
			description: '',
			tags: [],
			thumbnailUrl: resolveUrl(imgSrc),
			launchUrl: resolveUrl(href),
			cacheUrl: resolveUrl(href),
			providerSource: 'wither',
			offline: false
		});
	});

	return results;
}
