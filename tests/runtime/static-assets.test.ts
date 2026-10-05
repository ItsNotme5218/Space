import { describe, expect, it } from 'vitest';
import { assetUrl, resolveAssetConfig } from '../../src/runtime/asset-url';

const svg = 'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/index.svg';

describe('static package asset URLs', () => {
	it.each([
		'/newtab.html',
		'/assets/imgs/g/10_Minutes_till_Dawn.webp',
		'/s/cuf7avvz.wasm'
	])('keeps app-owned path %s inside the SVG package', path => {
		expect(assetUrl(path, svg)).toBe(
			`https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main${path}`
		);
	});

	it('resolves proxy runtime URLs and the initial internal page under the package base', () => {
		const config = resolveAssetConfig(
			{
				prefix: '/s/res/',
				scramjetPath: '/s/scramjet.js',
				wasmPath: '/s/scramjet.wasm',
				injectPath: '/c/controller.inject.js'
			},
			svg
		);
		expect(config).toEqual({
			prefix: '/gh/TwiLabs/q7v3m9c2@main/s/res/',
			scramjetPath: '/gh/TwiLabs/q7v3m9c2@main/s/scramjet.js',
			wasmPath: '/gh/TwiLabs/q7v3m9c2@main/s/scramjet.wasm',
			injectPath: '/gh/TwiLabs/q7v3m9c2@main/c/controller.inject.js'
		});
	});

	it('preserves protocol-relative external assets', () => {
		expect(assetUrl('//images.example.test/cover.webp', svg)).toBe(
			'https://images.example.test/cover.webp'
		);
	});
});
