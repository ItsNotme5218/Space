class GnMathGames {
  private jsonUrl: string;
  private htmlUrl: string;
  private coverUrl: string;
  constructor() {
    this.jsonUrl = "https://cdn.jsdelivr.net/gh/gn-math/assets@latest/zones.json";
    this.htmlUrl = "https://cdn.jsdelivr.net/gh/gn-math/html@main";
    this.coverUrl = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
  }

  async fetchJson() {
    const response = await fetch(this.jsonUrl);
    const data = await response.json();
    return data;
  }

  async rewriteGamesList() {
    const jsonGames = await this.fetchJson();

    const rewrittenGames = jsonGames
      .filter((entry: any) => entry.id !== -1)
      .map((entry: any) => ({
        name: entry.name,
        image: this.coverUrl + "/" + (entry.url.split("/")[1] || entry.id + ".png"),
        url: this.htmlUrl + "/" + (entry.url.split("/")[1] || entry.id + ".html"),
        tags: entry.tags || [],
        engine: "iframe",
      }));

    rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return rewrittenGames;
  }
}

export { GnMathGames };
