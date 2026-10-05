import { describe, expect, it } from 'vitest';
import {
	decodeScramjetUrl,
	formatInput,
	resolveNavigation
} from '../../src/runtime/navigation';
import { base32Decode } from '../../src/runtime/codec';

const origin = 'https://space.test';
describe('one navigation policy', () => {
	it.each(['', 'spc://newtab', '/newtab.html', `${origin}/newtab.html`])(
		'routes internal %s',
		input => {
			expect(resolveNavigation(input, origin)).toEqual({
				kind: 'internal',
				url: '/newtab.html'
			});
		}
	);
	it.each([
		'https://game.test/play?q=x#level',
		'http://game.test/',
		'/games/play',
		'../play',
		'#level',
		'//game.test/play'
	])('preserves HTTP(S) or relative %s', input => {
		expect(resolveNavigation(input, origin)).toEqual({
			kind: 'external',
			url: new URL(input, origin + '/').href
		});
	});
	it.each([
		'javascript:alert(1)',
		'data:text/html,hi',
		'blob:https://game.test/id',
		'ftp://game.test',
		'spc://unknown',
		'https://user:secret@game.test/'
	])('rejects unsafe %s without exposing input', input => {
		expect(() => resolveNavigation(input, origin)).toThrow(
			'Invalid navigation URL'
		);
		try {
			resolveNavigation(input, origin);
		} catch (error) {
			expect(String(error)).not.toContain(input);
		}
	});
	it('shares address/search formatting without constructing a proxy', () => {
		expect(formatInput('game.test/play')).toBe('http://game.test/play');
		expect(formatInput('two words', 'https://search.test/?q=%s')).toBe(
			'https://search.test/?q=two%20words'
		);
		expect(formatInput('/games/play')).toBe('/games/play');
		expect(formatInput('#level')).toBe('#level');
		expect(() =>
			resolveNavigation(formatInput('javascript:alert(1)'), origin)
		).toThrow();
	});
	it('decodes a Scramjet YouTube URL even when its $io query is present', () => {
		expect(
			decodeScramjetUrl(
				'http://localhost:6060/s/res/3ia76cxo/fliicjqh/NB2HI4DTHIXS653XO4XHS33VOR2WEZJOMNXW2LY?%24io=https%3A%2F%2Fwww.youtube.com',
				'/s/res/',
				base32Decode
			)
		).toBe('https://www.youtube.com/');
	});
});
