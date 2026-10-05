import { afterEach, expect, test, vi } from 'vitest';
import { selectRuntime, type SpaceRuntime } from '../../src/runtime';
import { Proxy } from '../../src/utils/proxy';

vi.mock('../../src/bridge/client', () => ({
	discoverProxyContext: async () => null
}));
vi.mock('@mercuryworkshop/proxy-transports', () => ({}));
vi.mock('@utils/settings', () => ({ SettingsAPI: class {} }));
afterEach(() => vi.unstubAllGlobals());

test.each(['home', 'external', 'dispose'])(
	'Scramjet actual local commit retains ownership after delayed setup superseded by %s',
	async action => {
		const win = Object.assign(new EventTarget(), {
			location: {
				origin: 'https://space.test',
				href: 'https://space.test/'
			}
		}) as unknown as Window;
		vi.stubGlobal('window', win);
		vi.stubGlobal('navigator', { serviceWorker: { controller: null } });
		const iframe = { src: '' } as HTMLIFrameElement;
		let release!: () => void;
		const delayed = new Promise<void>(resolve => {
			release = resolve;
		});
		const entered = vi.fn();
		const go = vi.fn((url: string) => {
			iframe.src = url;
		});
		// Constructor-free instance, but real navigate AND bootstrap validation.
		const proxy = Object.assign(Object.create(Proxy.prototype), {
			ready: Promise.resolve(),
			bootstrap: Promise.resolve(null),
			keepalive: null,
			proxySetting: 'sj',
			searchVar: '',
			config: { sj: {} },
			attachFrame: vi
				.fn()
				.mockImplementationOnce(async () => {
					entered();
					await delayed;
					return { go };
				})
				.mockResolvedValue({ go }),
			registerSW: vi.fn().mockResolvedValue({})
		}) as Proxy;
		const local: SpaceRuntime = {
			mode: 'standalone',
			ready: proxy.ready,
			navigate: proxy.navigate.bind(proxy),
			fetch: proxy.fetch.bind(proxy),
			dispose: proxy.dispose.bind(proxy)
		};
		const runtime = await selectRuntime(win, async () => local);
		const old = runtime.navigate(iframe, 'https://game.test/old');
		await vi.waitFor(() => expect(entered).toHaveBeenCalledOnce());
		if (action === 'home') await runtime.navigate(iframe, 'spc://newtab');
		if (action === 'external')
			await runtime.navigate(iframe, 'https://game.test/new');
		if (action === 'dispose') runtime.dispose();
		const expected = iframe.src;
		expect(expected).toBe(
			action === 'home'
				? 'https://space.test/newtab.html'
				: action === 'external'
					? 'https://game.test/new'
					: ''
		);
		release();
		await old;
		expect(iframe.src).toBe(expected);
		expect(go).not.toHaveBeenCalledWith('https://game.test/old');
		runtime.dispose();
	}
);

test('Scramjet final commit still validates bootstrap ownership without an ownership predicate', async () => {
	const iframe = { src: '' } as HTMLIFrameElement;
	const worker = {};
	const serviceWorker = { controller: worker };
	vi.stubGlobal('navigator', { serviceWorker });
	vi.stubGlobal('window', {});
	const go = vi.fn();
	const proxy = Object.assign(Object.create(Proxy.prototype), {
		bootstrap: Promise.resolve({ worker }),
		proxySetting: 'sj',
		searchVar: '',
		config: { sj: {} },
		attachFrame: async () => {
			serviceWorker.controller = {};
			return { go };
		},
		registerSW: async () => worker
	}) as Proxy;
	await expect(
		proxy.navigate(iframe, 'https://game.test/new')
	).rejects.toThrow('control was lost');
	expect(go).not.toHaveBeenCalled();
	expect(iframe.src).toBe('');
});

test('Scramjet local URL conversion does not require UV globals or configuration', async () => {
	const win = {} as Window & { __uv$config?: unknown };
	vi.stubGlobal('window', win);
	vi.stubGlobal('navigator', { serviceWorker: { controller: {} } });
	expect('__uv$config' in win).toBe(false);
	const proxy = Object.assign(Object.create(Proxy.prototype), {
		ready: Promise.resolve(),
		bootstrap: Promise.resolve(null),
		keepalive: null,
		proxySetting: 'sj',
		searchVar: '',
		config: { sj: {} },
		scramConfig: {
			prefix: '/s/res/',
			codec: { encode: (url: string) => `sj:${url}` }
		},
		bootController: vi.fn().mockResolvedValue(undefined),
		search: (url: string) => url
	}) as Proxy;

	await expect(
		proxy.convertURL({}, 'sj', 'https://game.test/play')
	).resolves.toBe('/s/res/sj:https://game.test/play');
	expect('__uv$config' in win).toBe(false);
});
