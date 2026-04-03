//import { FernGames } from "./fern";
import { GnMathGames } from "./gn-math";
import { TruffledGames } from "./truffled";
import { SeleniteGames } from "./selenite";
import { VelaraGames } from "./velara";
import { DefinitelyScienceGames } from "./defsci";
import { NowGGGames } from "./nowgg";
import { CoolMathGames } from "./coolmath";
import { VaporGames } from "./vapor";
import { DogeUBGames } from "./dogeub";
import { PokiGames } from "./poki";
import { Proxy } from "@/utils/proxy";

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
    .replace(/\s+/g, "_") // spaces -> underscores
    .replace(/[^a-z0-9_]/g, "") // remove special chars
    .replace(/_+/g, "_") // collapse multiple underscores
    .replace(/^_|_$/g, ""); // trim leading/trailing underscores
}

class ImportedGames {
  truffled: TruffledGames;
  selenite: SeleniteGames;
  //fern: FernGames;
  gnMath: GnMathGames;
    velara: VelaraGames;
    ds: DefinitelyScienceGames;
    nowgg: NowGGGames;
    coolmath: CoolMathGames;
    vapor: VaporGames;
    dogeub: DogeUBGames;
    poki: PokiGames;
    fetch: typeof Proxy.prototype.fetch;
  constructor() {
        this.fetch = Proxy.prototype.fetch.bind(new Proxy());
    //this.fern = new FernGames();
    this.gnMath = new GnMathGames(this.fetch);
    this.truffled = new TruffledGames(this.fetch);
    this.selenite = new SeleniteGames(this.fetch);
        this.velara = new VelaraGames(this.fetch);
        this.ds = new DefinitelyScienceGames(this.fetch);
        this.nowgg = new NowGGGames(this.fetch);
        this.coolmath = new CoolMathGames(this.fetch);
        this.vapor = new VaporGames(this.fetch);
        this.dogeub = new DogeUBGames(this.fetch);
        this.poki = new PokiGames(this.fetch);
  }

    async fetchGamesList() {
        //const fernGames = await this.fern.rewriteGamesList();
        const gnMathGames = await this.gnMath.rewriteGamesList();
        const truffledGames = await this.truffled.rewriteGamesList();
        const seleniteGames = await this.selenite.rewriteGamesList();
        const velaraGames = await this.velara.rewriteGamesList();
        const dsGames = await this.ds.rewriteGamesList();
        const nowggGames = await this.nowgg.rewriteGamesList();
        const coolmathGames = await this.coolmath.rewriteGamesList();
        const vaporGames = await this.vapor.rewriteGamesList();
        const dogeUBGames = await this.dogeub.rewriteGamesList();
        const pokiGames = await this.poki.rewriteGamesList();

        // Merge all imported games and add IDs
        const allGames = [...gnMathGames, ...truffledGames, ...seleniteGames, ...velaraGames, ...dsGames, ...nowggGames, ...coolmathGames, ...vaporGames, ...dogeUBGames, ...pokiGames];
        const gamesWithIds = allGames.map(game => ({
            ...game,
            id: generateGameId(game.name)
        }));

    // Deduplicate by ID (keep first occurrence)
    const seen = new Set<string>();
    const uniqueGames = gamesWithIds.filter((game) => {
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
