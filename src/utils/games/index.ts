import { ImportedGames, generateGameId } from "./import";

let cachedGames: any[] | null = null;

class SpaceGames {
  importedGames: ImportedGames;

  constructor() {
    this.importedGames = new ImportedGames();
  }

  async fetchLocalGamesList() {
    if (!cachedGames) {
      const mod = await import("../../json/games.json");
      cachedGames = mod.default;
    }

    return cachedGames!
      .map((game) => ({ ...game, id: generateGameId(game.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async fetchImportedGamesList(existingIds: Set<string>) {
    const importedWithIds = await this.importedGames.fetchGamesList();
    return importedWithIds
      .filter((game: any) => !existingIds.has(game.id))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }

  // Kept for backwards compatibility; returns everything merged.
  async fetchGamesList() {
    const localGames = await this.fetchLocalGamesList();
    const localIds = new Set(localGames.map((g) => g.id));
    const uniqueImported = await this.fetchImportedGamesList(localIds);
    return [...localGames, ...uniqueImported].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export { SpaceGames, generateGameId };
