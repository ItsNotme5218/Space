import { afterEach, expect, it, vi } from 'vitest';
import { ImportedGames } from '../../src/utils/games/import';
import { dispatchGameLaunch } from '../../src/pages/GamesPage';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});
it('catalog fetch in delegated mode goes through the guarded facade, not unguarded native fallback', async () => {
	const fetch = vi.fn().mockRejectedValue(new Error('lost session'));
	const native = vi
		.fn()
		.mockResolvedValue({ ok: true, text: async () => 'unguarded' });
	vi.stubGlobal('window', {
		proxy: { mode: 'delegated', ready: Promise.resolve(), fetch }
	});
	vi.stubGlobal('fetch', native);
	vi.useFakeTimers();
	await expect(
		new ImportedGames().fetch('https://catalog.test')
	).rejects.toThrow();
	expect(fetch).toHaveBeenCalledOnce();
	expect(native).not.toHaveBeenCalled();
});

it.each([undefined, 'iframe', 'proxy', 'sj', 'uv'])(
	'grid/custom launch ignores legacy engine %s and uses the shared policy',
	engine => {
		const dispatchEvent = vi.fn();
		vi.stubGlobal('window', {
			location: { origin: 'https://space.test' },
			dispatchEvent
		});
		dispatchGameLaunch({
			id: 'fixture',
			title: 'Fixture',
			url: '/games/fixture#level',
			source: 'saved',
			...{ engine }
		});
		expect(dispatchEvent.mock.calls[0][0].detail).toMatchObject({
			url: 'https://space.test/games/fixture#level',
			kind: 'game',
			librarySource: 'custom'
		});
		const count = dispatchEvent.mock.calls.length;
		expect(() =>
			dispatchGameLaunch({
				id: 'unsafe',
				title: 'Unsafe',
				url: 'javascript:alert(1)'
			})
		).toThrow('Invalid navigation URL');
		expect(dispatchEvent).toHaveBeenCalledTimes(count);
	}
);
