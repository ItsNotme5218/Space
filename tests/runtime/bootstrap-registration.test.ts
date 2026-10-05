import { afterEach, expect, test, vi } from 'vitest';
vi.mock('@mercuryworkshop/proxy-transports', () => ({
	BareCompatibleClient: class {}
}));
vi.mock('@utils/settings', () => ({ SettingsAPI: class {} }));
import { Proxy } from '../../src/utils/proxy';
import { verifyBootstrapContext } from '../../src/runtime/bootstrap';
afterEach(() => vi.unstubAllGlobals());
test('verified controlling worker is reused without registering or updating another worker', async () => {
	const worker = {} as ServiceWorker,
		register = vi.fn();
	vi.stubGlobal('navigator', {
		serviceWorker: { controller: worker, register }
	});
	const proxy = Object.create(Proxy.prototype);
	proxy.bootstrap = Promise.resolve({ worker, wispUrl: 'ws://localhost/w/' });
	expect(await proxy.registerSW({ type: 'sw', file: '/sw.js' })).toBe(worker);
	expect(register).not.toHaveBeenCalled();
});
test('losing verified control blocks rather than registering a competing worker', async () => {
	const register = vi.fn();
	vi.stubGlobal('navigator', { serviceWorker: { controller: {}, register } });
	const proxy = Object.create(Proxy.prototype);
	proxy.bootstrap = Promise.resolve({ worker: {}, wispUrl: null });
	await expect(
		proxy.registerSW({ type: 'sw', file: '/sw.js' })
	).rejects.toThrow('control was lost');
	expect(register).not.toHaveBeenCalled();
});
test('cached verified registration rejects controller replacement on every reuse', async () => {
	const worker = {},
		register = vi.fn();
	const serviceWorker = { controller: worker, register };
	vi.stubGlobal('navigator', { serviceWorker });
	const proxy = Object.create(Proxy.prototype);
	proxy.bootstrap = Promise.resolve({ worker, wispUrl: null });
	expect(await proxy.registerSW({ type: 'sw', file: '/sw.js' })).toBe(worker);
	serviceWorker.controller = {};
	await expect(
		proxy.registerSW({ type: 'sw', file: '/sw.js' })
	).rejects.toThrow('control was lost');
	expect(register).not.toHaveBeenCalled();
});
test('cached Scramjet controller/frame blocks navigation after bootstrap controller takeover', async () => {
	const worker = {},
		register = vi.fn(),
		go = vi.fn(),
		createFrame = vi.fn();
	const serviceWorker = { controller: worker, register };
	vi.stubGlobal('navigator', { serviceWorker });
	const proxy = Object.create(Proxy.prototype);
	proxy.bootstrap = Promise.resolve({ worker, wispUrl: null });
	proxy.proxySetting = 'sj';
	proxy.searchVar = '';
	proxy.controllerBoot = Promise.resolve();
	proxy.controller = { createFrame };
	const iframe = {} as HTMLIFrameElement;
	proxy.frames = new WeakMap([[iframe, { go }]]);
	await proxy.navigate(iframe, 'http://localhost/first');
	expect(go).toHaveBeenCalledTimes(1);
	serviceWorker.controller = {};
	await expect(
		proxy.navigate(iframe, 'http://localhost/second')
	).rejects.toThrow('control was lost');
	expect(go).toHaveBeenCalledTimes(1);
	expect(createFrame).not.toHaveBeenCalled();
	expect(register).not.toHaveBeenCalled();
});
test('pending handshake takeover cannot fall through to a competing /sw.js registration', async () => {
	let reply: () => void = () => {};
	const original = {
		postMessage(data: any, ports: MessagePort[]) {
			reply = () =>
				ports[0].postMessage({
					...data,
					type: 'owned',
					workerOwned: true,
					wispUrl: null
				});
		}
	};
	const replacement = {},
		register = vi
			.fn()
			.mockResolvedValue({ update: async () => {}, active: replacement });
	const serviceWorker = {
		controller: original as unknown,
		register,
		ready: Promise.resolve()
	};
	vi.stubGlobal('navigator', { serviceWorker });
	const win = {
		navigator,
		MessageChannel,
		setTimeout,
		clearTimeout
	} as unknown as Window;
	const proxy = Object.create(Proxy.prototype);
	proxy.bootstrap = verifyBootstrapContext(win, 'build', 20);
	const registration = proxy.registerSW({ type: 'sw', file: '/sw.js' });
	serviceWorker.controller = replacement;
	reply();
	await expect(registration).rejects.toThrow('control was lost');
	expect(register).not.toHaveBeenCalled();
});
test('true no-context startup preserves ordinary standalone worker registration', async () => {
	const worker = {},
		update = vi.fn().mockResolvedValue(undefined);
	const serviceWorker = {
		controller: null as unknown,
		ready: Promise.resolve(),
		register: vi.fn(async () => {
			serviceWorker.controller = worker;
			return { active: worker, update };
		})
	};
	vi.stubGlobal('navigator', { serviceWorker });
	const win = {
		navigator,
		MessageChannel,
		setTimeout,
		clearTimeout
	} as unknown as Window;
	const proxy = Object.create(Proxy.prototype);
	proxy.bootstrap = verifyBootstrapContext(win, 'build', 20);
	expect(await proxy.registerSW({ type: 'sw', file: '/sw.js' })).toBe(worker);
	expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
		scope: '/',
		updateViaCache: 'none'
	});
	expect(update).toHaveBeenCalledTimes(1);
});
