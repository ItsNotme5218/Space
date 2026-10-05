import { describe, expect, it } from 'vitest';
import { assetUrl } from '../../src/runtime/asset-url';

describe('assetUrl', () => {
	it('keeps assets inside a static package opened through its SVG', () => {
		expect(
			assetUrl(
				'/s/scramjet.js',
				'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/index.svg'
			)
		).toBe(
			'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/s/scramjet.js'
		);
	});

	it('keeps origin-root paths on regular app pages', () => {
		expect(assetUrl('/s/scramjet.js', 'https://space.example/game/')).toBe(
			'https://space.example/s/scramjet.js'
		);
	});
});
