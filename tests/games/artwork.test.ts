import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExpandedMosaic } from '../../src/components/grid/ExpandedMosaic';
import { GridCard } from '../../src/components/grid/GridCard';
import { Proxy } from '../../src/utils/proxy';
import { imageControllerFixture } from '../fixtures/image-controller.mjs';

vi.mock('@utils/settings', () => ({ SettingsAPI: class {} }));
const cleanups: (() => void)[] = [];
afterEach(() => {
	cleanups.splice(0).forEach(close => close());
	vi.unstubAllGlobals();
});

async function setup(
	mode = 'standalone',
	page = 'https://cdn.jsdelivr.net/gh/owner/space@main/index.svg'
) {
	if (mode === 'standalone') {
		const fixture = await imageControllerFixture(page);
		cleanups.push(fixture.close);
		const proxy = Object.assign(Object.create(Proxy.prototype), {
			controller: fixture.controller,
			scramConfig: fixture.config,
			keepalive: null
		}) as Proxy;
		cleanups.push(() => proxy.dispose());
		fixture.win.proxy = { mode, imageUrl: url => proxy.imageUrl(url) };
		vi.stubGlobal('window', fixture.win);
		vi.stubGlobal('document', fixture.win.document);
		return fixture;
	}
	vi.stubGlobal('window', {
		location: { href: page },
		proxy: {
			mode,
			imageUrl() {
				throw new Error(
					'Non-standalone images must not use a local router'
				);
			}
		}
	});
}

function render(image?: string, expanded = true) {
	const item = {
		id: '2048',
		title: '2048',
		url: 'https://www.2048.org/',
		image
	};
	return renderToStaticMarkup(
		createElement(expanded ? ExpandedMosaic : GridCard, {
			item,
			isExpanded: false,
			isHovered: false,
			isHiddenByExpansion: false,
			expandedStyle: {},
			staggerIndex: 0,
			staggerDelay: 0,
			onCardClick() {},
			onHoverStart() {},
			onHoverEnd() {}
		})
	);
}

it('expanded local game artwork uses the same repository base as collapsed artwork', async () => {
	await setup();
	const expected =
		'src="https://cdn.jsdelivr.net/gh/owner/space@main/assets/imgs/g/2048.webp"';
	expect(render('/assets/imgs/g/2048.webp')).toContain(expected);
	expect(render('/assets/imgs/g/2048.webp', false)).toContain(expected);
});

it('regular-host local artwork remains on the site root', async () => {
	await setup('standalone', 'https://space.example/games');
	expect(render('/assets/imgs/g/2048.webp')).toContain(
		'src="https://space.example/assets/imgs/g/2048.webp"'
	);
});

it.each([true, false])(
	'external artwork uses a registered worker image route (expanded=%s)',
	async expanded => {
		const fixture = (await setup())!;
		const source =
			'https://raw.githubusercontent.com/gn-math/covers/main/2048.png';
		const src = render(source, expanded).match(
			/<img[^>]*src="([^"]+)"/
		)?.[1];
		expect(src).toBeDefined();
		expect(fixture.accepts(src)).toBe(true);
		const response = await fixture.route(src);
		expect(response.status).toBe(200);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			fixture.pixels
		);
		expect(fixture.requests).toEqual([source]);
	}
);

it('favicon fallback is proxied rather than fetched directly', async () => {
	const fixture = (await setup())!;
	const src = render().match(/<img[^>]*src="([^"]+)"/)?.[1];
	expect(src).toBeDefined();
	expect(fixture.accepts(src)).toBe(true);
	expect((await fixture.route(src)).status).toBe(200);
	expect(fixture.requests).toEqual([
		'https://www.google.com/s2/favicons?domain=2048.org&sz=128'
	]);
});

it('delegated images remain external for the owning host to rewrite', async () => {
	await setup('delegated');
	expect(render('https://images.example/cover.png')).toContain(
		'src="https://images.example/cover.png"'
	);
});

it('unavailable runtime does not leak external artwork requests', async () => {
	await setup('unavailable');
	expect(render('https://images.example/cover.png')).not.toContain('<img');
});
