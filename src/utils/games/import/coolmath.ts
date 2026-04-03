class CoolMathGames {
    private baseUrl: string;
    private apiUrl: string;
    private imgBase: string;
    private fetch: any;

    constructor(fetch: any) {
        this.baseUrl = "https://www.coolmathgames.com";
        this.apiUrl = `${this.baseUrl}/sites/default/files/cmatgame_games_with_levels.json`;
        this.imgBase = `${this.baseUrl}/sites/default/files/`;
        this.fetch = fetch;
    }

    async fetchJson() {
        const response = await this.fetch(this.apiUrl);
                const data = JSON.parse(await response);

        return data;
    }

    async rewriteGamesList() {
        const jsonData = await this.fetchJson();
        const jsonGames = jsonData.game || [];

        const rewrittenGames = jsonGames
            .filter((entry: any) => entry.status === "1")
            .map((entry: any) => ({
                name: entry.title,
                image: entry.img ? `${this.imgBase}${entry.img}` : "",
                url: `${this.baseUrl}/${entry.alias}/play`,
                tags: [],
                engine: (entry.type === "ruffle" || entry.type === "flash") ? "ruffle" : "iframe"
            }));

        rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return rewrittenGames;
    }
}

export { CoolMathGames };
