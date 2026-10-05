import { describe, expect, it } from 'vitest';
import { GnMathGames } from '../../src/utils/games/import/gn-math';

describe('GN-Math catalog loader', () => {
	it('resolves upstream URL placeholders and uses catalog covers and special tags', async () => {
		const catalog = [
			{
				id: 1,
				name: 'OvO',
				cover: '{COVER_URL}/ovo-cover.png',
				url: '{HTML_URL}/1-fde.html',
				special: ['platformer', 'featured']
			},
			{
				id: -1,
				name: 'Suggest games',
				cover: '{COVER_URL}/suggest.png',
				url: 'https://discord.gg/example'
			}
		];
		const games = new GnMathGames(async () => JSON.stringify(catalog));

		await expect(games.rewriteGamesList()).resolves.toEqual([
			{
				name: 'OvO',
				image: 'https://raw.githubusercontent.com/gn-math/covers/main/ovo-cover.png',
				url: 'https://raw.githubusercontent.com/gn-math/html/main/1-fde.html',
				tags: ['platformer', 'featured'],
				engine: 'iframe',
				description: null
			}
		]);
	});

	it('preserves game URLs that are already absolute', async () => {
		const catalog = [
			{
				id: 7,
				name: 'External game',
				cover: '{COVER_URL}/external.png',
				url: 'https://games.example/play/index.html',
				tags: ['arcade']
			}
		];
		const games = new GnMathGames(async () => JSON.stringify(catalog));

		await expect(games.rewriteGamesList()).resolves.toEqual([
			{
				name: 'External game',
				image: 'https://raw.githubusercontent.com/gn-math/covers/main/external.png',
				url: 'https://games.example/play/index.html',
				tags: ['arcade'],
				engine: 'iframe',
				description: null
			}
		]);
	});
});
