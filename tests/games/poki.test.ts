import { describe, expect, it, vi } from 'vitest';
import { PokiGames } from '../../src/utils/games/import/poki';

describe('Poki catalog loader', () => {
	it('returns games without making a separate image-search request for each one', async () => {
		const fetch = vi.fn(async (url: string) => {
			if (url === 'https://poki.com/en/all-games') {
				return '<a href="/en/g/100-meters-race">100 Metres Race</a><a href="/en/g/100-golf">100% Golf</a>';
			}
			throw new Error(`Unexpected request: ${url}`);
		});
		const games = new PokiGames(fetch);

		await expect(games.rewriteGamesList()).resolves.toEqual([
			{
				name: '100 Metres Race',
				image: '',
				url: 'https://poki.com/en/g/100-meters-race',
				tags: [],
				engine: 'proxy'
			},
			{
				name: '100% Golf',
				image: '',
				url: 'https://poki.com/en/g/100-golf',
				tags: [],
				engine: 'proxy'
			}
		]);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(
			fetch.mock.calls.every(
				([url]) => url === 'https://poki.com/en/all-games'
			)
		).toBe(true);
	});
});
