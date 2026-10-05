import { afterEach, describe, expect, it, vi } from 'vitest';

const settingsStore = vi.hoisted(() => ({
	values: new Map<string, unknown>(),
	writes: [] as Array<[string, string]>
}));

vi.mock('@mercuryworkshop/proxy-transports', () => ({
	BareCompatibleClient: class {}
}));
vi.mock('@utils/settings', () => ({
	SettingsAPI: class {
		async getItem(key: string) {
			return settingsStore.values.get(key) ?? null;
		}
		async setItem(key: string, value: string) {
			settingsStore.values.set(key, value);
			settingsStore.writes.push([key, value]);
		}
	}
}));
vi.mock('../../src/runtime/config', () => ({
	getSpaceConfig: () => ({ buildId: 'test-build' }),
	getWispDomains: () => []
}));
vi.mock('../../src/runtime/wisp', () => ({
	generateWisp: () => 'wss://generated.test/',
	probeWisp: vi.fn(),
	resolveWisp: vi.fn().mockResolvedValue('wss://resolved.test/')
}));
vi.mock('../../src/runtime/api', () => ({ apiUrl: () => null }));
vi.mock('../../src/runtime/bootstrap', () => ({
	verifyBootstrapContext: vi.fn().mockResolvedValue(null)
}));
vi.mock('../../src/runtime/navigation', () => ({
	formatInput: (input: string) => input
}));

afterEach(() => {
	settingsStore.values.clear();
	settingsStore.writes.length = 0;
	delete (
		globalThis as typeof globalThis & { __SPACE_PROXY_CONFIG__?: unknown }
	).__SPACE_PROXY_CONFIG__;
	vi.unstubAllGlobals();
});

describe('proxy setting normalization', () => {
	it.each([
		'uv',
		'Ultraviolet',
		'sj',
		'Scramjet',
		'unknown',
		undefined,
		null
	])("normalizes engine %s to Scramjet's backend key", async value => {
		const { normalizeProxyEngine } =
			await import('../../src/runtime/proxy-settings');

		expect(normalizeProxyEngine(value)).toBe('sj');
	});

	it.each([
		'uv',
		'Ultraviolet',
		'sj',
		'Scramjet',
		'unknown',
		undefined,
		null
	])('normalizes display %s to the Scramjet label', async value => {
		const { normalizeProxyDisplay } =
			await import('../../src/runtime/proxy-settings');

		expect(normalizeProxyDisplay(value)).toBe('Scramjet');
	});

	it.each(['uv', 'Ultraviolet', undefined])(
		'persists a normalized backend key during Proxy startup for %s',
		async stored => {
			const config = {
				prefix: '/~/sj/',
				scramjetPath: '/s/scramjet.js',
				wasmPath: '/s/scramjet.wasm',
				injectPath: '/s/inject.js',
				codec: { encode: (value: string) => value }
			};
			vi.stubGlobal('window', { __SPACE_PROXY_CONFIG__: config });
			(
				globalThis as typeof globalThis & {
					__SPACE_PROXY_CONFIG__?: typeof config;
				}
			).__SPACE_PROXY_CONFIG__ = config;
			if (stored !== undefined) settingsStore.values.set('proxy', stored);
			const { Proxy } = await import('../../src/utils/proxy');

			const proxy = new Proxy();
			await proxy.ready;

			expect(proxy.proxySetting).toBe('sj');
			expect(settingsStore.values.get('proxy')).toBe('sj');
			expect(settingsStore.writes).toContainEqual(['proxy', 'sj']);
		}
	);
});
