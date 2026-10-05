import { describe, expect, it, vi } from 'vitest';
import { ImportedGames } from '../../src/utils/games/import';

describe('imported games orchestration', () => {
	it('runs the initialized importers without touching disabled sources', async () => {
		const importedGames = new ImportedGames();
		importedGames.gnMath.rewriteGamesList = async () => [
			{ name: 'GN-Math game' }
		];
		importedGames.truffled.rewriteGamesList = async () => [
			{ name: 'Truffled game' }
		];
		importedGames.selenite.rewriteGamesList = async () => [
			{ name: 'Selenite game' }
		];
		importedGames.velara.rewriteGamesList = async () => [
			{ name: 'Velara game' }
		];
		importedGames.coolmath.rewriteGamesList = vi.fn(async () => [
			{ name: 'Coolmath game' }
		]);
		importedGames.dogeub.rewriteGamesList = vi.fn(async () => [
			{ name: 'DogeUB game' }
		]);

		const games = await importedGames.fetchGamesList();

		expect(games.map(game => game.name).sort()).toEqual([
			'GN-Math game',
			'Selenite game',
			'Truffled game',
			'Velara game'
		]);
		expect(importedGames.coolmath.rewriteGamesList).not.toHaveBeenCalled();
		expect(importedGames.dogeub.rewriteGamesList).not.toHaveBeenCalled();
	});

	it('strips a trailing webport label before filtering duplicate names', async () => {
		const importedGames = new ImportedGames();
		importedGames.gnMath.rewriteGamesList = async () => [
			{ name: 'Quick Run, WebPort', source: 'first' }
		];
		importedGames.truffled.rewriteGamesList = async () => [
			{ name: 'Quick Run', source: 'duplicate' }
		];
		importedGames.selenite.rewriteGamesList = async () => [];
		importedGames.velara.rewriteGamesList = async () => [];
		importedGames.coolmath.rewriteGamesList = async () => [];
		importedGames.dogeub.rewriteGamesList = async () => [];

		const games = await importedGames.fetchGamesList();

		expect(games).toEqual([
			{ name: 'Quick Run', source: 'first', id: 'quick_run' }
		]);
	});
});
