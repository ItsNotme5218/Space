import { readFileSync, existsSync } from 'node:fs';
import { expect, it } from 'vitest';

it('does not load or publish the removed gg-bypass scripts', () => {
	const html = readFileSync(
		new URL('../../index.html', import.meta.url),
		'utf8'
	);
	expect(html).not.toContain('gg-bypass.js');
	expect(
		existsSync(new URL('../../public/gg-bypass.js', import.meta.url))
	).toBe(false);
	expect(existsSync(new URL('../../gg-bypass', import.meta.url))).toBe(false);
});
