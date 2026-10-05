import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	configFromEnv,
	getSpaceConfig,
	validateConfig
} from '../../src/runtime/config';
import { runtimeConfigPlugin } from '../../srv/vite/runtime-config';
afterEach(() => vi.unstubAllGlobals());

describe('public deployment configuration', () => {
	it('supports a validated explicit mirror deployment override without changing WebSocket globally', () => {
		const config = {
			mode: 'static',
			wispUrl: 'wss://mirror.test/w/',
			apiOrigin: null,
			buildId: 'mirror'
		} as const;
		vi.stubGlobal('__SPACE_RUNTIME_CONFIG__', config);
		expect(getSpaceConfig()).toEqual(config);
		vi.stubGlobal('__SPACE_RUNTIME_CONFIG__', {
			...config,
			apiOrigin: 'https://user:secret@api.test'
		});
		expect(() => getSpaceConfig()).toThrow('origin');
	});
	it('defaults to server without exposing arbitrary environment values', () => {
		expect(configFromEnv({ SECRET_TOKEN: 'private' })).toEqual({
			mode: 'server',
			wispUrl: null,
			apiOrigin: null,
			buildId: 'development'
		});
	});
	it('static configuration does not require an API or detection request', () => {
		expect(
			configFromEnv({
				SPACE_BUILD_MODE: 'static',
				SPACE_WISP_URL: 'wss://wisp.test/w/',
				SPACE_BUILD_ID: 'fixture'
			})
		).toEqual({
			mode: 'static',
			wispUrl: 'wss://wisp.test/w/',
			apiOrigin: null,
			buildId: 'fixture'
		});
	});
	it.each([
		'ftp://api.test',
		'https://user:secret@api.test',
		'https://api.test/path',
		'https://api.test?token=x',
		'bad',
		'//api.test',
		'https://api.test/#x'
	])('rejects invalid API origin %s', apiOrigin => {
		expect(() =>
			validateConfig({
				mode: 'static',
				wispUrl: null,
				apiOrigin,
				buildId: 'test'
			})
		).toThrow(/Invalid|origin/);
	});
	it.each([
		'ws://wisp.test/w/',
		'wss://user:secret@wisp.test/',
		'https://wisp.test/',
		'garbage'
	])('rejects invalid static Wisp endpoint %s', wispUrl => {
		expect(() =>
			configFromEnv({
				SPACE_BUILD_MODE: 'static',
				SPACE_WISP_URL: wispUrl
			})
		).toThrow(/Invalid|WebSocket/);
	});
	it('rejects unknown mode and empty build identity', () => {
		expect(() => configFromEnv({ SPACE_BUILD_MODE: 'automatic' })).toThrow(
			'SPACE_BUILD_MODE'
		);
		expect(() =>
			validateConfig({
				mode: 'server',
				wispUrl: null,
				apiOrigin: null,
				buildId: ''
			})
		).toThrow('SPACE_BUILD_ID');
	});
	it.each(['server', 'static'])(
		'build plugin emits matching allowlisted %s config',
		mode => {
			const plugin = runtimeConfigPlugin({
				SPACE_BUILD_MODE: mode,
				SPACE_BUILD_ID: 'test-build',
				SECRET_TOKEN: 'do-not-publish'
			});
			const artifacts: { fileName: string; source: string }[] = [];
			const hook = plugin.generateBundle as Function;
			hook.call({
				emitFile: (asset: { fileName: string; source: string }) =>
					artifacts.push(asset)
			});
			expect(artifacts[0].fileName).toBe('space-config.json');
			expect(JSON.parse(artifacts[0].source)).toEqual({
				mode,
				wispUrl: null,
				apiOrigin: null,
				buildId: 'test-build'
			});
			expect(artifacts[0].source).not.toContain('do-not-publish');
		}
	);
});
