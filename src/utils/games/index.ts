import { FernGames } from "./import/fern";
import { GnMathGames } from "./import/gn-math";
import { TruffledGames } from "./import/truffled";
import { SeleniteGames } from "./import/selenite";

class ImportedGames {
    truffled: TruffledGames;
    selenite: SeleniteGames;
    fern: FernGames;
    gnMath: GnMathGames;
    constructor() {
        this.fern = new FernGames();
        this.gnMath = new GnMathGames();
        this.truffled = new TruffledGames();
        this.selenite = new SeleniteGames();
    }

    async fetchGamesList() {
        const fernGames = await this.fern.rewriteGamesList();
        const gnMathGames = await this.gnMath.rewriteGamesList();
        const truffledGames = await this.truffled.rewriteGamesList();
        const seleniteGames = await this.selenite.rewriteGamesList();

        return [...fernGames, ...gnMathGames, ...truffledGames, ...seleniteGames];
    }

    async rewriteGamesList(jsonGames: any[]) {

        jsonGames.sort((a: any, b: any) => a.name.localeCompare(b.name));

        return jsonGames;
    }
}

export { ImportedGames };