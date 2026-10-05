import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsPage } from '../../src/pages/SettingsPage';
import {
	getCachedNightPlusData,
	getNightPlusInfo,
	isAuthenticated,
	openNightPlusLogin
} from '../../src/utils/nightplus';
import { apiUrl, apiAvailability, requestApi } from '../../src/runtime/api';
import type { SpaceConfig } from '../../src/runtime/config';
const config: SpaceConfig = {
	mode: 'static',
	wispUrl: null,
	apiOrigin: null,
	buildId: 'test'
};
vi.mock('@utils/settings', () => ({
	SettingsAPI: class {
		async getItem(key: string) {
			if (key === 'nightplus.cache') return { status: { active: true } };
			return 'saved-token';
		}
	}
}));
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
describe('optional backend APIs', () => {
	it.each([
		[{ ...config, apiOrigin: 'https://api.test' }, 'https://api.test/auth'],
		[{ ...config, mode: 'server' }, '/auth']
	])(
		'enabled login supplies the configured account base to the installed widget (%s)',
		async (deployment, expected) => {
			vi.stubGlobal('__SPACE_CONFIG__', deployment);
			vi.stubGlobal('window', new EventTarget());
			const { default: NightLogin } =
				await import('@nightnetwork/night-auth');
			// Keep the installed constructor/interface; isolate DOM/font rendering only.
			vi.spyOn(NightLogin.prototype, 'injectFont').mockImplementation(
				() => {}
			);
			let accountBase: string | undefined;
			vi.spyOn(NightLogin.prototype, 'show').mockImplementation(
				function (this: {
					options: { API_URL?: string; onCancel(): void };
				}) {
					accountBase = this.options.API_URL;
					queueMicrotask(() => this.options.onCancel());
				}
			);
			expect(await openNightPlusLogin()).toBe(false);
			expect(accountBase).toBe(expected);
		}
	);
	it('server auth keeps the absolute same-origin URL default', async () => {
		vi.stubGlobal('__SPACE_CONFIG__', { ...config, mode: 'server' });
		vi.stubGlobal('location', { origin: 'https://space.test' });
		const { Proxy } = await import('../../src/utils/proxy');
		const proxy = { settings: { getItem: async () => null } };
		expect(
			await Proxy.prototype.getAuthUrl.call(proxy as unknown as Proxy)
		).toBe('https://space.test/auth');
	});
	it('an explicit API origin governs auth URL rather than an old saved backend', async () => {
		vi.stubGlobal('__SPACE_CONFIG__', {
			...config,
			apiOrigin: 'https://api.test'
		});
		const { Proxy } = await import('../../src/utils/proxy');
		const proxy = {
			settings: { getItem: async () => 'https://old-api.test/auth' }
		};
		expect(
			await Proxy.prototype.getAuthUrl.call(proxy as unknown as Proxy)
		).toBe('https://api.test/auth');
	});
	it('disabled Plus APIs cannot turn saved tokens or premium cache into success', async () => {
		vi.stubGlobal('__SPACE_CONFIG__', config);
		const fetcher = vi.fn();
		const alert = vi.fn();
		vi.stubGlobal('fetch', fetcher);
		vi.stubGlobal('window', { alert });
		expect(await isAuthenticated()).toBe(false);
		expect(await getCachedNightPlusData()).toBeNull();
		expect(await openNightPlusLogin()).toBe(false);
		expect(alert).toHaveBeenCalledWith(apiAvailability(config));
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('Plus status request uses configured origin and real backend response', async () => {
		vi.stubGlobal('__SPACE_CONFIG__', {
			...config,
			apiOrigin: 'https://api.test'
		});
		let requested = '';
		vi.stubGlobal('fetch', async (url: string) => {
			requested = url;
			return Response.json({ active: false, status: 'inactive' });
		});
		expect(await getNightPlusInfo()).toEqual({
			active: false,
			status: 'inactive'
		});
		expect(requested).toBe('https://api.test/api/plus/night-plus/status');
	});
	it('Settings visibly explains missing APIs for static deployment', () => {
		vi.stubGlobal('__SPACE_CONFIG__', config);
		const html = renderToStaticMarkup(createElement(SettingsPage));
		expect(html).toContain(
			'Optional account and Plus APIs are unavailable in this deployment.'
		);
	});
	it('disabled static API is visibly unavailable, never a successful fake response', async () => {
		expect(apiUrl('/api/plus', config)).toBeNull();
		expect(apiAvailability(config)).toBe(
			'Optional account and Plus APIs are unavailable in this deployment.'
		);
		const fetcher = vi.fn();
		await expect(
			requestApi('/api/plus', {}, config, fetcher)
		).rejects.toThrow('unavailable');
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('retains same-origin server behavior', () => {
		expect(apiUrl('/api/plus', { ...config, mode: 'server' })).toBe(
			'/api/plus'
		);
		expect(apiAvailability({ ...config, mode: 'server' })).toBeNull();
	});
	it('routes actual requests through configured API origin', async () => {
		const response = new Response('backend', { status: 503 });
		let requested = '';
		const result = await requestApi(
			'/api/plus/status',
			{},
			{ ...config, apiOrigin: 'https://api.test' },
			async url => {
				requested = String(url);
				return response;
			}
		);
		expect(requested).toBe('https://api.test/api/plus/status');
		expect(result.status).toBe(503);
	});
	it.each(['//evil.test/', 'https://evil.test', '/../evil', '/api\\evil'])(
		'rejects non-local API path %s',
		path => {
			expect(() => apiUrl(path, { ...config, mode: 'server' })).toThrow(
				'API path'
			);
		}
	);
});
