import { afterEach, expect, it, vi } from 'vitest';
import { imageControllerFixture } from '../fixtures/image-controller.mjs';
import { Proxy } from '../../src/utils/proxy';
import { selectRuntime } from '../../src/runtime';
import { imageUrl } from '../../src/components/grid/image-url';

vi.mock('../../src/bridge/client', () => ({
	discoverProxyContext: async () => null
}));
vi.mock('@utils/settings', () => ({ SettingsAPI: class {} }));
const cleanups: (() => void)[] = [];
afterEach(() => {
	cleanups.splice(0).forEach(close => close());
	vi.unstubAllGlobals();
});

it('standalone artwork is accepted by the installed worker and delivered by its registered controller/frame', async () => {
	const fixture = await imageControllerFixture();
	cleanups.push(fixture.close);
	vi.stubGlobal('window', fixture.win);
	vi.stubGlobal('document', fixture.win.document);
	vi.stubGlobal('navigator', fixture.win.navigator);
	const proxy = Object.assign(Object.create(Proxy.prototype), {
		controller: fixture.controller,
		scramConfig: fixture.config,
		imageWorker: fixture.win.navigator.serviceWorker.controller,
		bootstrap: Promise.resolve(null),
		keepalive: null
	}) as Proxy;
	const runtime = await selectRuntime(fixture.win, async () => ({
		mode: 'standalone',
		ready: Promise.resolve(),
		local: proxy,
		imageUrl: url => proxy.imageUrl(url),
		navigate: async () => {},
		fetch: async () => '',
		dispose: () => proxy.dispose()
	}));
	fixture.win.proxy = runtime;
	cleanups.push(() => runtime.dispose());

	const source = 'https://images.example/game.png';
	const url = imageUrl(source);
	expect(
		fixture.accepts(url),
		'worker recognizes the real controller registration'
	).toBe(true);
	const response = await fixture.route(url);
	expect(
		response.status,
		'controller finds an actual registered image frame'
	).toBe(200);
	expect(response.headers.get('content-type')).toBe('image/png');
	expect(new Uint8Array(await response.arrayBuffer())).toEqual(
		fixture.pixels
	);
	expect(fixture.requests).toEqual([source]);

	// Hundreds of covers must not allocate hundreds of frames or load an iframe.
	for (let index = 0; index < 100; index++)
		imageUrl(`https://images.example/${index}.png`);
	expect(fixture.controller.frames).toHaveLength(1);
	expect(fixture.controller.frames[0].element.isConnected).toBe(false);
	expect(fixture.controller.frames[0].element.getAttribute('src')).toBeNull();
	const worker = fixture.win.navigator.serviceWorker.controller;
	fixture.win.navigator.serviceWorker.controller = {};
	expect(
		imageUrl(source),
		'lost worker ownership must not emit new routes'
	).toBe('');
	fixture.win.navigator.serviceWorker.controller = worker;
	runtime.dispose();
	expect(fixture.controller.frames).toHaveLength(0);
	expect(imageUrl(source)).toBe('');
});

it('the installed worker rejects the config prefix and controller rejects its prefix without a registered frame', async () => {
	const fixture = await imageControllerFixture();
	cleanups.push(fixture.close);
	const encoded = fixture.config.codec.encode(
		'https://images.example/game.png'
	);
	expect(
		fixture.accepts(
			new URL(fixture.config.prefix + encoded, fixture.win.location.href)
				.href
		)
	).toBe(false);
	const controllerOnly = new URL(
		fixture.controller.prefix + encoded,
		fixture.win.location.href
	).href;
	expect(fixture.accepts(controllerOnly)).toBe(true);
	expect((await fixture.route(controllerOnly)).status).toBe(500);
});
