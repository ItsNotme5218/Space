class DefinitelyScienceGames {
    private dsUrl: string;
    private fetch: any;
    constructor(fetch: any) {
        this.dsUrl = "https://definitelyscience.com/";
        this.fetch = fetch;
    }

    async fetchJson() {
        const response = await this.fetch((new URL(this.dsUrl) + "assets/ts_games.json"));
                const data = JSON.parse(await response);

        return data;
    }

    async rewriteGamesList() {
        const jsonGames = await this.fetchJson();

        const rewrittenGames = jsonGames.map((entry: any) => ({
            image: this.dsUrl + entry.image,
            url: this.dsUrl + entry.iframe_url,
            name: entry.name,
            tags: entry.tags || [],
            engine: (entry.frameType === "iframe") ? "proxy" : (entry.frameType || "proxy"),
            description: entry.description || null
        }));

        rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return rewrittenGames;
    }
}

export { DefinitelyScienceGames };