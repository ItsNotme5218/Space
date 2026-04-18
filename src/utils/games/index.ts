import { ImportedGames, generateGameId } from './import';

let cachedLocalGames: any[] | null = null;
let cachedImportedGames: any[] | null = null;
let cachedImportedGamesPromise: Promise<any[]> | null = null;

class SpaceGames {
	importedGames: ImportedGames;

	constructor() {
		this.importedGames = new ImportedGames();
	}

	async fetchLocalGamesList() {
		switch (Boolean(cachedLocalGames)) {
			case false: {
				const mod = await import('../../json/games.json');
				cachedLocalGames = mod.default
					.map(game => ({ ...game, id: generateGameId(game.name) }))
					.sort((a, b) => a.name.localeCompare(b.name));
				break;
			}
			default:
				break;
		}

		return cachedLocalGames!;
	}

	async fetchAllImportedGamesList() {
		switch (Boolean(cachedImportedGames)) {
			case true:
				return cachedImportedGames!;
			default:
				break;
		}

		switch (Boolean(cachedImportedGamesPromise)) {
			case false:
				cachedImportedGamesPromise = this.importedGames
					.fetchGamesList()
					.then(importedGames => {
						cachedImportedGames = importedGames.sort((a, b) =>
							a.name.localeCompare(b.name)
						);
						return cachedImportedGames;
					})
					.catch(error => {
						cachedImportedGamesPromise = null;
						throw error;
					});
				break;
			default:
				break;
		}

		return cachedImportedGamesPromise!;
	}

	async fetchImportedGamesList(existingIds: Set<string>) {
		const importedWithIds = await this.fetchAllImportedGamesList();
		return importedWithIds.filter((game: any) => !existingIds.has(game.id));
	}

	async fetchGamesList() {
		const localGames = await this.fetchLocalGamesList();
		const localIds = new Set(localGames.map(g => g.id));
		const uniqueImported = await this.fetchImportedGamesList(localIds);
		return [...localGames, ...uniqueImported].sort((a, b) =>
			a.name.localeCompare(b.name)
		);
	}
}

export { SpaceGames, generateGameId };
