import games from "../../json/games.json";
import { ImportedGames, generateGameId } from "./import";

class SpaceGames {
    gamesList: any[];
    importedGames: ImportedGames;

    constructor() {
        this.gamesList = games;
        this.importedGames = new ImportedGames();
    }

    async fetchGamesList() {
        // Add IDs to local games
        const localGames = this.gamesList.map(game => ({
            ...game,
            id: generateGameId(game.name)
        }));

        // Fetch imported games (already have IDs)
        const importedWithIds = await this.importedGames.fetchGamesList();

        // Create a map of local game IDs for deduplication
        const localIds = new Set(localGames.map(g => g.id));

        // Filter out imported games that already exist locally
        const uniqueImported = importedWithIds.filter((game: any) => !localIds.has(game.id));

        // Merge and sort
        const allGames = [...localGames, ...uniqueImported];
        const sortedGames = allGames.sort((a, b) => a.name.localeCompare(b.name));

        return sortedGames;
    }

}

export { SpaceGames, generateGameId };
