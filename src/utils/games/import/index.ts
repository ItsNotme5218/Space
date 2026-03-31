//import { FernGames } from "./fern";
import { GnMathGames } from "./gn-math";
import { TruffledGames } from "./truffled";
import { SeleniteGames } from "./selenite";

/**
 * Generate a unique ID from a game name
 * - Converts to lowercase
 * - Replaces spaces with underscores
 * - Removes special characters (keeps alphanumeric and underscores)
 * - Collapses multiple underscores into one
 */
function generateGameId(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '_')           // spaces -> underscores
        .replace(/[^a-z0-9_]/g, '')     // remove special chars
        .replace(/_+/g, '_')            // collapse multiple underscores
        .replace(/^_|_$/g, '');         // trim leading/trailing underscores
}

class ImportedGames {
    truffled: TruffledGames;
    selenite: SeleniteGames;
    //fern: FernGames;
    gnMath: GnMathGames;
    constructor() {
        //this.fern = new FernGames();
        this.gnMath = new GnMathGames();
        this.truffled = new TruffledGames();
        this.selenite = new SeleniteGames();
    }

    async fetchGamesList() {
        //const fernGames = await this.fern.rewriteGamesList();
        const gnMathGames = await this.gnMath.rewriteGamesList();
        const truffledGames = await this.truffled.rewriteGamesList();
        const seleniteGames = await this.selenite.rewriteGamesList();

        // Merge all imported games and add IDs
        const allGames = [...gnMathGames, ...truffledGames, ...seleniteGames];
        const gamesWithIds = allGames.map(game => ({
            ...game,
            id: generateGameId(game.name)
        }));

        // Deduplicate by ID (keep first occurrence)
        const seen = new Set<string>();
        const uniqueGames = gamesWithIds.filter(game => {
            if (seen.has(game.id)) return false;
            seen.add(game.id);
            return true;
        });

        return uniqueGames;
    }

    async rewriteGamesList(jsonGames: any[]) {

        jsonGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return jsonGames;
    }
}

export { ImportedGames, generateGameId };