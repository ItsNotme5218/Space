class SeleniteGames {
    private seleniteUrl: string;
    private fetch: any;

    constructor(fetch: any) {
        this.seleniteUrl = "https://selenite.cc/";
        this.fetch = fetch;
    }

    async fetchJson() {
        const response = await this.fetch((new URL(this.seleniteUrl) + "/resources/games.json"));
                const data = JSON.parse(await response);

        return data;
    }

  async rewriteGamesList() {
    const jsonGames = await this.fetchJson();

        const rewrittenGames = jsonGames.map((entry: any) => ({
            image: this.seleniteUrl + "resources/semag/" + entry.directory + "/" + entry.image,
            url: this.seleniteUrl + "resources/semag/" + entry.directory + "/",
            name: entry.name,
            tags: entry.tags || [],
            engine: (entry.frameType === "iframe") ? "proxy" : (entry.frameType || "proxy"),
            description: entry.description || null
        }));

    rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return rewrittenGames;
  }
}

export { SeleniteGames };
