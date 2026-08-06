class DogeUBGames {
	private jsonUrl: string;
	private assetBase: string;
	private fetch: any;

	constructor(fetch: any) {
		this.jsonUrl =
			'https://raw.githubusercontent.com/DogeNetwork/v5-assets/refs/heads/main/games.json';
		this.assetBase =
			'https://raw.githubusercontent.com/DogeNetwork/v5-assets/refs/heads/main';
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
			.filter((entry: any) => entry.appName && entry.url)
			.map((entry: any) => {
				let image = '';
				if (entry.Asset && entry.Asset.length > 0) {
					const assetPath = entry.Asset[0];
					const cleanPath = assetPath.replace(/^\/assets/, '');
					image = `${this.assetBase}${cleanPath}`;
				}

				const tags: string[] = [];
				if (entry.Category && Array.isArray(entry.Category)) {
					tags.push(
						...entry.Category.map((c: string) => c.toLowerCase())
					);
				}
				if (entry.Tag && Array.isArray(entry.Tag)) {
					tags.push(...entry.Tag.map((t: string) => t.toLowerCase()));
				}

				return {
					name: entry.appName.trim(),
					image,
					url: entry.url,
					tags,
					engine: entry.Type === 'html5' ? 'iframe' : 'proxy',
					description: entry.desc || ''
				};
			});

		rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

		return rewrittenGames;
	}
}

export { DogeUBGames };
