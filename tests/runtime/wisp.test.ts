import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateWisp, probeWisp, resolveWisp } from '../../src/runtime/wisp';
import type { SpaceConfig } from '../../src/runtime/config';
import { selectRuntime } from '../../src/runtime';
import { discoverProxyContext } from '../../src/bridge/client';
vi.mock('../../src/bridge/client', () => ({
	discoverProxyContext: vi.fn(async () => ({
		assertReady: async () => {},
		dispose() {}
	}))
}));
const config = (mode: SpaceConfig['mode'] = 'static'): SpaceConfig => ({
	mode,
	wispUrl: null,
	apiOrigin: null,
	buildId: 'test'
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});
describe('standalone Wisp selection', () => {
	it('startup retains an actionable Wisp configuration error for the unavailable UI', async () => {
		vi.mocked(discoverProxyContext).mockResolvedValueOnce(null);
		const win = Object.assign(new EventTarget(), {
			location: {
				origin: 'https://space.test',
				href: 'https://space.test/'
			}
		}) as unknown as Window;
		const runtime = await selectRuntime(win, async () => {
			await resolveWisp(config(), null, {
				ping: async () => false,
				generate: () => 'wss://candidate.test/'
			});
			throw new Error('unreachable');
		});
		expect(runtime.mode).toBe('unavailable');
		expect(runtime.error).toContain('configure SPACE_WISP_URL');
		runtime.dispose();
	});
	it('delegated selection and game navigation do zero Wisp work', async () => {
		let probes = 0,
			generations = 0,
			standaloneCalls = 0;
		const win = Object.assign(new EventTarget(), {
			location: { origin: 'https://space.test' }
		}) as unknown as Window;
		const runtime = await selectRuntime(win, async () => {
			standaloneCalls++;
			await resolveWisp(config(), null, {
				ping: async () => {
					probes++;
					return true;
				},
				generate: () => {
					generations++;
					return 'wss://candidate.test/';
				}
			});
			throw new Error('Standalone must not run');
		});
		const iframe = { src: '' } as HTMLIFrameElement;
		await runtime.navigate(iframe, 'https://game.test/');
		expect(runtime.mode).toBe('delegated');
		expect(iframe.src).toBe('');
		expect(win.location.href).toBe('https://game.test/');
		expect([standaloneCalls, probes, generations]).toEqual([0, 0, 0]);
		runtime.dispose();
	});
	it('preserves saved endpoints without probing or generating', async () => {
		const deps = { ping: vi.fn(), generate: vi.fn() };
		expect(
			await resolveWisp(config(), 'wss://saved.test/wisp/', deps)
		).toBe('wss://saved.test/wisp/');
		expect(deps.ping).not.toHaveBeenCalled();
		expect(deps.generate).not.toHaveBeenCalled();
	});
	it.each(['https:', 'http:'])(
		'server defaults to same-origin /w/ on %s',
		async protocol => {
			vi.stubGlobal('location', { protocol, host: 'space.test:6060' });
			expect(
				await resolveWisp(config('server'), null, {
					ping: vi.fn(),
					generate: vi.fn()
				})
			).toBe(
				`${protocol === 'https:' ? 'wss' : 'ws'}://space.test:6060/w/`
			);
		}
	);
	it('static uses explicit external endpoint independently of API availability', async () => {
		const c = { ...config(), wispUrl: 'wss://configured.test/w/' };
		const generate = vi.fn();
		expect(
			await resolveWisp(c, null, { ping: async () => true, generate })
		).toBe(c.wispUrl);
		expect(generate).not.toHaveBeenCalled();
		await expect(
			resolveWisp(c, null, { ping: async () => false, generate })
		).rejects.toThrow('configured');
	});
	it('returns first reachable generated candidate', async () => {
		let count = 0;
		expect(
			await resolveWisp(config(), null, {
				generate: () => `wss://candidate${++count}.test/w/`,
				ping: async url => url.includes('candidate3')
			})
		).toBe('wss://candidate3.test/w/');
		expect(count).toBe(3);
	});
	it('caps generated probes at five and reports exhaustion', async () => {
		let count = 0;
		await expect(
			resolveWisp(config(), null, {
				generate: () => `wss://candidate${++count}.test/`,
				ping: async () => {
					throw new Error('offline');
				}
			})
		).rejects.toThrow('five');
		expect(count).toBe(5);
	});
	it('bounds even a hanging probe to five seconds per attempt', async () => {
		vi.useFakeTimers();
		let count = 0;
		const result = expect(
			resolveWisp(config(), null, {
				generate: () => {
					count++;
					return 'wss://candidate.test/';
				},
				ping: () => new Promise(() => {})
			})
		).rejects.toThrow('five');
		await vi.advanceTimersByTimeAsync(24_999);
		expect(count).toBe(5);
		await vi.advanceTimersByTimeAsync(1);
		await result;
		expect(vi.getTimerCount()).toBe(0);
	});
	it('generates only within explicitly supplied domain configuration', () => {
		expect(generateWisp(['example.test'])).toMatch(
			/^wss:\/\/[a-z0-9]+\.example\.test\.cdn\.cloudflare\.net\/wisp\/$/
		);
		expect(() => generateWisp([])).toThrow();
		expect(() => generateWisp(['user:secret@bad'])).toThrow();
	});
	it('closes socket and clears timeout after reachability success', async () => {
		vi.useFakeTimers();
		let socket!: EventTarget & { close: ReturnType<typeof vi.fn> };
		vi.stubGlobal(
			'WebSocket',
			class extends EventTarget {
				close = vi.fn();
				constructor() {
					super();
					socket = this;
				}
			}
		);
		const result = probeWisp('wss://candidate.test/');
		socket.dispatchEvent(new Event('open'));
		expect(await result).toBe(true);
		expect(socket.close).toHaveBeenCalledOnce();
		expect(vi.getTimerCount()).toBe(0);
	});
});
