class TruffledGames {
    private truffledUrl: string;
    constructor() {
        this.truffledUrl = "https://truffled.lol/";
    }

    async fetchJson() {
        const response = await fetch((new URL(this.truffledUrl) + "/js/json/g.json"));
        const data = await response.json();
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
            engine: (entry.frameType === "iframe") ? "proxy" : (entry.frameType || "proxy")
        }));

        rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return rewrittenGames;
    }
}

export { TruffledGames };