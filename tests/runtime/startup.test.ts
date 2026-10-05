import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStandaloneRuntime, selectRuntime } from '../../src/runtime';

const spies = vi.hoisted(() => ({
	discover: vi.fn(),
	moduleLoad: vi.fn(),
	construct: vi.fn(),
	worker: vi.fn(),
	controller: vi.fn(),
	initialTransport: vi.fn(),
	settingsTransport: vi.fn(),
	navigate: vi.fn(),
	fetch: vi.fn(),
	dispose: vi.fn()
}));
vi.mock('../../src/bridge/client', () => ({
	discoverProxyContext: spies.discover
}));
vi.mock('../../src/utils/proxy', () => {
	spies.moduleLoad();
	return {
		Proxy: class {
			ready = Promise.resolve();
			proxySetting = 'sj';
			searchVar = '';
			config = {
				sj: {
					func: async () => {
						spies.controller();
						spies.initialTransport();
						await spies.worker();
					}
				}
			};
			constructor() {
				spies.construct();
			}
			registerSW = spies.worker;
			setTransports = spies.settingsTransport;
			navigate = spies.navigate;
			fetch = spies.fetch;
			dispose = spies.dispose;
		}
	};
});
const win = (href = 'https://space.test/') =>
	Object.assign(new EventTarget(), {
		location: { origin: 'https://space.test', href },
		fetch: vi
			.fn()
			.mockResolvedValue({ ok: true, text: async () => 'catalog' })
	}) as unknown as Window;
const frame = () => ({ src: '' }) as HTMLIFrameElement;
beforeEach(() => {
	for (const [name, spy] of Object.entries(spies)) {
		if (name !== 'moduleLoad') spy.mockReset();
	}
});
afterEach(() => vi.unstubAllGlobals());

describe('runtime selection', () => {
	it('navigation generations are per iframe and never assign an obsolete URL while the newest check is pending', async () => {
		const releases: (() => void)[] = [];
		spies.discover.mockResolvedValue({
			assertReady: vi.fn(
				() => new Promise<void>(resolve => releases.push(resolve))
			),
			dispose: vi.fn()
		});
		const w = win();
		const runtime = await selectRuntime(w, vi.fn());
		const first = frame(),
			other = frame();
		const oldLaunch = runtime.navigate(first, 'https://game.test/older');
		const newLaunch = runtime.navigate(first, 'https://game.test/newer');
		await runtime.navigate(other, 'spc://newtab');
		releases[0]();
		await oldLaunch;
		expect(first.src).toBe('');
		expect(w.location.href).toBe('https://space.test/');
		releases[1]();
		await newLaunch;
		expect(first.src).toBe('');
		expect(w.location.href).toBe('https://game.test/newer');
		expect((runtime as any).mode).toBe('delegated');
		expect(other.src).toBe('https://space.test/newtab.html');
		const independent = runtime.navigate(
			first,
			'https://game.test/independent'
		);
		await runtime.navigate(other, 'spc://newtab');
		releases[2]();
		await independent;
		expect(first.src).toBe('');
		expect(w.location.href).toBe('https://game.test/independent');
		runtime.dispose();
	});
	it('rehosts internal HTML beneath the standalone SVG package', async () => {
		spies.discover.mockResolvedValue(null);
		const w = win(
			'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/index.svg'
		);
		const runtime = await selectRuntime(w, vi.fn());
		const iframe = frame();
		await runtime.navigate(iframe, 'spc://newtab');
		expect(iframe.src).toBe(
			'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/newtab.html'
		);
		runtime.dispose();
	});
	it.each(['spc://newtab', 'https://game.test/newer'])(
		'a newer %s supersedes pending delegated assignment',
		async newer => {
			const releases: (() => void)[] = [];
			spies.discover.mockResolvedValue({
				assertReady: vi.fn(
					() => new Promise<void>(resolve => releases.push(resolve))
				),
				dispose: vi.fn()
			});
			const w = win();
			const runtime = await selectRuntime(w, vi.fn());
			const iframe = frame();
			const oldLaunch = runtime.navigate(
				iframe,
				'https://game.test/older'
			);
			const newLaunch = runtime.navigate(iframe, newer);
			if (newer.startsWith('https:')) releases[1]();
			await newLaunch;
			const expected = newer.startsWith('https:')
				? newer
				: 'https://space.test/newtab.html';
			expect(iframe.src).toBe(newer.startsWith('https:') ? '' : expected);
			if (newer.startsWith('https:')) expect(w.location.href).toBe(newer);
			expect((runtime as any).mode).toBe('delegated');
			releases[0]();
			await oldLaunch;
			expect(iframe.src).toBe(newer.startsWith('https:') ? '' : expected);
			runtime.dispose();
		}
	);
	it('a concurrent late readiness success cannot revive a lost session', async () => {
		let fail!: (error: Error) => void;
		let succeed!: () => void;
		const assertReady = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise<void>((_resolve, reject) => {
						fail = reject;
					})
			)
			.mockImplementationOnce(
				() =>
					new Promise<void>(resolve => {
						succeed = resolve;
					})
			);
		spies.discover.mockResolvedValue({ assertReady, dispose: vi.fn() });
		const runtime = await selectRuntime(win(), vi.fn());
		const first = frame(),
			second = frame();
		const a = expect(
			runtime.navigate(first, 'https://game.test/one')
		).rejects.toThrow();
		const b = expect(
			runtime.navigate(second, 'https://game.test/two')
		).rejects.toThrow();
		fail(new Error('lost'));
		await a;
		succeed();
		await b;
		expect(second.src).toBe('');
		runtime.dispose();
	});
	it('negotiates before any scripts, constructor, workers, controller or transports; delegated does none', async () => {
		const assertReady = vi.fn().mockResolvedValue(undefined);
		spies.discover.mockResolvedValue({ assertReady, dispose: vi.fn() });
		const scripts = vi.fn();
		const w = win();
		const runtime = await selectRuntime(w, () =>
			createStandaloneRuntime(scripts)
		);
		expect(runtime.mode).toBe('delegated');
		await runtime.ready;
		for (const spy of [
			scripts,
			spies.moduleLoad,
			spies.construct,
			spies.worker,
			spies.controller,
			spies.initialTransport,
			spies.settingsTransport
		])
			expect(spy).not.toHaveBeenCalled();
		let release!: () => void;
		assertReady.mockImplementation(
			() =>
				new Promise<void>(resolve => {
					release = resolve;
				})
		);
		const iframe = frame();
		const launch = runtime.navigate(iframe, 'https://game.test/play');
		await Promise.resolve();
		expect(iframe.src).toBe('');
		expect(w.location.href).toBe('https://space.test/');
		release();
		await launch;
		expect(iframe.src).toBe('');
		expect(w.location.href).toBe('https://game.test/play');
		expect(spies.navigate).not.toHaveBeenCalled();
		runtime.dispose();
	});
	it('lost session blocks subsequent launches and fetch without local fallback', async () => {
		spies.discover.mockResolvedValue({
			assertReady: vi.fn().mockRejectedValue(new Error('lost')),
			dispose: vi.fn()
		});
		const factory = vi.fn();
		const w = win();
		const runtime = await selectRuntime(w, factory);
		const iframe = frame();
		await expect(
			runtime.navigate(iframe, 'https://game.test')
		).rejects.toThrow('Proxy context is unavailable');
		expect(runtime.mode).toBe('unavailable');
		await expect(runtime.fetch('https://catalog.test')).rejects.toThrow();
		expect(iframe.src).toBe('');
		expect(w.fetch).not.toHaveBeenCalled();
		expect(factory).not.toHaveBeenCalled();
		runtime.dispose();
	});
	it('delegated fetch checks readiness and uses document fetch only', async () => {
		const w = win();
		const check = vi.fn().mockResolvedValue(undefined);
		spies.discover.mockResolvedValue({
			assertReady: check,
			dispose: vi.fn()
		});
		const runtime = await selectRuntime(w, vi.fn());
		expect(
			await runtime.fetch('https://catalog.test', {
				headers: { Accept: 'text/html' }
			})
		).toBe('catalog');
		expect(check).toHaveBeenCalledOnce();
		expect(w.fetch).toHaveBeenCalledOnce();
		expect(spies.fetch).not.toHaveBeenCalled();
		runtime.dispose();
	});
	it('standalone starts only after discovery and proxies each external entry exactly once regardless of legacy engine', async () => {
		const order: string[] = [];
		spies.discover.mockImplementation(async () => {
			order.push('discovery');
			return null;
		});
		const runtime = await selectRuntime(win(), () =>
			createStandaloneRuntime(async () => {
				order.push('scripts');
			})
		);
		expect(order).toEqual(['discovery', 'scripts']);
		expect(spies.construct).toHaveBeenCalledOnce();
		expect(spies.worker).toHaveBeenCalledOnce();
		expect(spies.controller).toHaveBeenCalledOnce();
		expect(spies.initialTransport).toHaveBeenCalledOnce();
		expect(spies.settingsTransport).not.toHaveBeenCalled();
		for (const engine of [undefined, 'iframe', 'proxy', 'sj', 'uv']) {
			const entry = { url: 'https://game.test/play', engine };
			await runtime.navigate(frame(), entry.url);
		}
		expect(spies.navigate).toHaveBeenCalledTimes(5);
		const iframe = frame();
		await runtime.navigate(iframe, 'spc://newtab');
		expect(iframe.src).toBe('https://space.test/newtab.html');
		expect(spies.navigate).toHaveBeenCalledTimes(5);
		expect(runtime.mode).toBe('standalone');
		runtime.dispose();
	});
});
