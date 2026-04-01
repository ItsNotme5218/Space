import { ImportedGames, generateGameId } from "./import";

let cachedGames: any[] | null = null;

class SpaceGames {
    importedGames: ImportedGames;

    constructor() {
        this.importedGames = new ImportedGames();
    }

    async fetchGamesList() {
        if (!cachedGames) {
            const mod = await import("../../json/games.json");
            cachedGames = mod.default;
        }

        const localGames = cachedGames!.map(game => ({
            ...game,
            id: generateGameId(game.name)
        }));

        const importedWithIds = await this.importedGames.fetchGamesList();

        const localIds = new Set(localGames.map(g => g.id));
        const uniqueImported = importedWithIds.filter((game: any) => !localIds.has(game.id));

        const allGames = [...localGames, ...uniqueImported];
        return allGames.sort((a, b) => a.name.localeCompare(b.name));
    }

}

export { SpaceGames, generateGameId };
