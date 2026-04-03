class VelaraGames {
    private velaraUrl: string;
    private fetch: any;

    constructor(fetch: any) {
        this.velaraUrl = "https://velara.cc/";
        this.fetch = fetch;
    }

    async fetchJson() {
        const response = await this.fetch((new URL(this.velaraUrl) + "data/games.json"));
                const data = JSON.parse(await response);

        return data;
    }

    async rewriteGamesList() {
        const jsonGames = await this.fetchJson();

        const rewrittenGames = jsonGames.map((entry: any) => ({
            image: this.velaraUrl + entry.image,
            url: this.velaraUrl + entry.location,
            name: entry.title,
            tags: entry.tags || [],
            engine: (entry.frameType === "iframe") ? "proxy" : (entry.frameType || "proxy"),
            description: entry.description || null
        }));

        rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return rewrittenGames;
    }
}

export { VelaraGames };