import { MessageChannel } from 'node:worker_threads';
import { setImmediate } from 'node:timers/promises';
import { afterEach, expect, it, vi } from 'vitest';
import { installProxyContextAdapter } from '../../src/bridge/adapter';
import { selectRuntime, type SpaceRuntime } from '../../src/runtime';

function documentWindow() {
	const win = Object.assign(new EventTarget(), {
		MessageChannel,
		crypto: globalThis.crypto,
		performance: globalThis.performance,
		setTimeout: globalThis.setTimeout,
		clearTimeout: globalThis.clearTimeout,
		location: { origin: 'https://space.test' },
		fetch: vi.fn(),
		postMessage(data: unknown, _origin: string, ports: Transferable[]) {
			const cloned = structuredClone(
				{ data, ports },
				{ transfer: ports }
			);
			queueMicrotask(() => {
				const event = new Event('message');
				Object.assign(event, {
					data: cloned.data,
					ports: cloned.ports,
					source: win
				});
				win.dispatchEvent(event);
			});
		}
	});
	return win as unknown as Window;
}
async function flush() {
	for (let i = 0; i < 8; i++) await setImmediate();
}
const cleanup: (() => void)[] = [];
afterEach(() => {
	cleanup.splice(0).forEach(dispose => dispose());
	vi.useRealTimers();
});

it('actual bridge readiness precedes delegated assignment and adapter teardown blocks subsequent launch', async () => {
	const win = documentWindow();
	let ready = true;
	const stop = installProxyContextAdapter(win, () => ready);
	cleanup.push(stop);
	const local = vi.fn();
	const selected = selectRuntime(win, local);
	await flush();
	const runtime = await selected;
	cleanup.push(runtime.dispose);
	const iframe = { src: '' } as HTMLIFrameElement;
	const launch = runtime.navigate(iframe, 'https://game.test/play');
	expect(iframe.src).toBe('');
	expect((win.location as Location & { href?: string }).href).toBeUndefined();
	await flush();
	await launch;
	expect(iframe.src).toBe('');
	expect((win.location as Location & { href?: string }).href).toBe(
		'https://game.test/play'
	);
	expect(local).not.toHaveBeenCalled();
	ready = false;
	const denied = expect(
		runtime.navigate(iframe, 'https://game.test/next')
	).rejects.toThrow('Proxy context is unavailable');
	await flush();
	await denied;
	expect(iframe.src).toBe('');
	expect(runtime.mode).toBe('unavailable');
	await expect(runtime.fetch('https://catalog.test')).rejects.toThrow();
	expect(win.fetch).not.toHaveBeenCalled();
	expect(local).not.toHaveBeenCalled();
});

it('actual discovery timeout selects standalone once; late capability messages cannot switch mode', async () => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
	const win = documentWindow();
	let port: MessagePort;
	let id: string;
	win.addEventListener('message', event => {
		port = event.ports[0];
		id = event.data.requestId;
	});
	const navigate = vi.fn();
	const local = vi.fn(async (): Promise<SpaceRuntime> => ({
		mode: 'standalone',
		ready: Promise.resolve(),
		navigate,
		fetch: vi.fn(),
		dispose: vi.fn()
	}));
	const selected = selectRuntime(win, local);
	await flush();
	expect(local).not.toHaveBeenCalled();
	await vi.advanceTimersByTimeAsync(1500);
	const runtime = await selected;
	cleanup.push(runtime.dispose);
	port!.postMessage({
		protocol: 'proxy-context-v1',
		version: 1,
		type: 'capabilities',
		requestId: id!,
		sessionId: 'late',
		capabilities: ['nested-iframe-navigation', 'document-fetch']
	});
	await flush();
	expect(runtime.mode).toBe('standalone');
	await runtime.navigate(
		{ src: '' } as HTMLIFrameElement,
		'https://game.test'
	);
	expect(local).toHaveBeenCalledOnce();
	expect(navigate).toHaveBeenCalledOnce();
	port!.close();
});
