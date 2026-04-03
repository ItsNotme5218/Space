class FernGames {
  private fernUrl: string;
  constructor() {
    this.fernUrl = "https://fern.best/";
  }

  async fetchJson() {
    const response = await fetch(new URL(this.fernUrl) + "g.json");
    const data = await response.json();
    return data;
  }

  async rewriteGamesList() {
    const jsonGames = await this.fetchJson();

    const rewrittenGames = jsonGames.map((entry: any) => ({
      image: this.fernUrl + "resources/" + entry.directory + "/" + entry.image,
      url: this.fernUrl + "resources/" + entry.directory,
      name: entry.name,
      tags: entry.tags || [],
      engine: "iframe",
    }));

    rewrittenGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return rewrittenGames;
  }
}

export { FernGames };
