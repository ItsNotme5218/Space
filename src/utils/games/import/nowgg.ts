class NowGGGames {
    private baseUrl: string;
    private apiUrl: string;
    private fetch: any;

    constructor(fetch: any) {
        this.baseUrl = "https://now.gg";
        this.apiUrl = `${this.baseUrl}/webapi/search/app`;
        this.fetch = fetch;
    }

    async fetchJson() {
        const response = await this.fetch(this.apiUrl);
        const data = JSON.parse(await response);

        return data;
    }

    async rewriteGamesList() {
        const jsonData = await this.fetchJson();
        const jsonGames = jsonData.data || [];

        const rewrittenGames = jsonGames.map((entry: any) => ({
            name: entry.title ?? entry.name,
            image: entry.icon ?? "",
            url: `${this.baseUrl}${entry.page_path}`,
            tags: [],
            engine: "proxy"
        }));

        rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return rewrittenGames;
    }
}

export { NowGGGames };
