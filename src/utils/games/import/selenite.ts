class SeleniteGames {
    private seleniteUrl: string;
    constructor() {
        this.seleniteUrl = "https://selenite.cc/";
    }

    async fetchJson() {
        const response = await fetch((new URL(this.seleniteUrl) + "/resources/games.json"));
        const data = await response.json();
        return data;
    }

    async rewriteGamesList() {
        const jsonGames = await this.fetchJson();

        const rewrittenGames = jsonGames.map((entry: any) => ({
            image: this.seleniteUrl + "resources/semag/" + entry.directory + "/" + entry.image,
            url: this.seleniteUrl + "resources/semag/" + entry.directory + "/",
            name: entry.name,
            tags: entry.tags || [],
            engine: (entry.frameType === "iframe") ? "proxy" : (entry.frameType || "proxy")
        }));

        rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return rewrittenGames;
    }
}

export { SeleniteGames };