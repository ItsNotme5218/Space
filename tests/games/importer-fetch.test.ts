import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImportedGames } from '../../src/utils/games/import';

afterEach(() => vi.unstubAllGlobals());

describe('catalog importer fetch', () => {
	it('uses the available Space proxy instead of browser-native fetch', async () => {
		const proxyFetch = vi.fn(async () => 'proxied catalog');
		const nativeFetch = vi.fn(async () => ({
			ok: true,
			text: async () => 'native catalog'
		}));
		vi.stubGlobal('window', {
			proxy: {
				mode: 'standalone',
				ready: Promise.resolve(),
				fetch: proxyFetch
			}
		});
		vi.stubGlobal('fetch', nativeFetch);

		const result = await new ImportedGames().fetch(
			'https://catalog.example/games.json'
		);

		expect(result).toBe('proxied catalog');
		expect(proxyFetch).toHaveBeenCalledWith(
			'https://catalog.example/games.json',
			undefined
		);
		expect(nativeFetch).not.toHaveBeenCalled();
	});

	it('uses native fetch only when no Space proxy exists', async () => {
		const nativeFetch = vi.fn(async () => ({
			ok: true,
			text: async () => 'native catalog'
		}));
		vi.stubGlobal('window', {});
		vi.stubGlobal('fetch', nativeFetch);

		const result = await new ImportedGames().fetch(
			'https://catalog.example/games.json'
		);

		expect(result).toBe('native catalog');
		expect(nativeFetch).toHaveBeenCalledOnce();
	});
});
