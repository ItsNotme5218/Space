import { SettingsAPI } from '@utils/settings';
import { apiAvailability, apiUrl, requestApi } from '../runtime/api';
import { getSpaceConfig } from '../runtime/config';


const API_BASE_URL = '/api/plus';

export interface NightPlusStatus {
	active: boolean;
	status: string;
	member_length: number;
	expires_at: string | null;
}

export interface WispServer {
	id: string;
	name: string;
	region: string;
	url: string;
}

export interface ProxyServer {
	id: string;
	name: string;
	region: string;
	url: string;
}

export interface NightPlusCache {
	status: NightPlusStatus | null;
	wispServers: WispServer[];
	proxyServers: ProxyServer[];
	lastUpdated: number;
}

export interface MullvadRelay {
	hostname: string;
	country: string;
	city: string;
}

const KEY_ACCESS = 'nightplus.access_token';
const KEY_SESSION = 'nightplus.token';
const KEY_PROFILE = 'nightplus.profile';
const KEY_CACHE = 'nightplus.cache';

const store = new SettingsAPI();

export async function getAccessToken(): Promise<string | null> {
	return ((await store.getItem(KEY_ACCESS)) as string | null) ?? null;
}

export async function getSessionToken(): Promise<string | null> {
	return ((await store.getItem(KEY_SESSION)) as string | null) ?? null;
}

export async function setAccessToken(token: string): Promise<void> {
	await store.setItem(KEY_ACCESS, token);
}

export async function setSessionToken(token: string): Promise<void> {
	await store.setItem(KEY_SESSION, token);
}

export async function clearAccessToken(): Promise<void> {
	await store.removeItem(KEY_ACCESS);
}

export async function clearSessionToken(): Promise<void> {
	await store.removeItem(KEY_SESSION);
}

async function refreshAccessToken(): Promise<boolean> {
	try {
		const response = await requestApi(`${API_BASE_URL}/refresh`, {
			method: 'POST',
			credentials: 'include'
		});

		if (!response.ok) return false;

		const data = await response.json();
		await setAccessToken(data.access_token);
		return true;
	} catch (error) {
		console.error('[nightplus] failed to refresh access token', error);
		return false;
	}
}

async function makeAuthRequest(
	endpoint: string,
	options: RequestInit = {},
	isRetry = false
): Promise<Response> {
	const token = await getAccessToken();
	if (!token) throw new Error('No access token found. Please log in.');

	const response = await requestApi(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			...options.headers
		},
		credentials: 'include'
	});

	if (response.status !== 401) return response;

	if (isRetry || !(await refreshAccessToken())) {
		throw new Error('Session expired. Please log in again.');
	}

	const retry = await makeAuthRequest(endpoint, options, true);
	if (retry.status === 401) {
		throw new Error('Session expired. Please log in again.');
	}

	return retry;
}

export async function tryRefreshOnBoot(): Promise<boolean> {
	try {
		if (!(await getAccessToken())) return false;
		return await refreshAccessToken();
	} catch (error) {
		console.warn('[nightplus] boot-time refresh failed', error);
		return false;
	}
}

export async function isAuthenticated(): Promise<boolean> {
	if (apiAvailability()) return false;
	const [access, session] = await Promise.all([
		getAccessToken(),
		getSessionToken()
	]);
	return access !== null || session !== null;
}

export async function getNightPlusInfo(): Promise<NightPlusStatus | null> {
	try {
		if (!(await getAccessToken())) return null;

		const response = await makeAuthRequest('/night-plus/status', {
			method: 'POST'
		});
		if (!response.ok) return null;

		return await response.json();
	} catch (error) {
		console.error('[nightplus] failed to get status', error);
		return null;
	}
}

export async function getPremiumWispServers(): Promise<WispServer[]> {
	try {
		const response = await makeAuthRequest('/night-plus/wisp-servers', {
			method: 'POST'
		});
		if (!response.ok)
			throw new Error('Failed to fetch premium WISP servers');

		const data = await response.json();
		return data.servers ?? [];
	} catch (error) {
		console.error('[nightplus] failed to get premium WISP servers', error);
		return [];
	}
}

export async function getPremiumProxyServers(): Promise<ProxyServer[]> {
	try {
		const response = await makeAuthRequest('/night-plus/proxy-servers', {
			method: 'POST'
		});
		if (!response.ok)
			throw new Error('Failed to fetch premium proxy servers');

		const data = await response.json();
		return data.servers ?? [];
	} catch (error) {
		console.error('[nightplus] failed to get premium proxy servers', error);
		return [];
	}
}

export async function getProfileEmail(): Promise<string | null> {
	const profile = await store.getItem(KEY_PROFILE);
	if (profile && typeof profile === 'object') {
		return (profile as { email?: string }).email ?? null;
	}
	return null;
}

export async function getCachedNightPlusData(): Promise<NightPlusCache | null> {
	if (apiAvailability()) return null;
	try {
		return (
			((await store.getItem(KEY_CACHE)) as NightPlusCache | null) ?? null
		);
	} catch (error) {
		console.error('[nightplus] failed to read cache', error);
		return null;
	}
}

export async function setCachedNightPlusData(
	data: Partial<NightPlusCache>
): Promise<void> {
	try {
		const existing = await getCachedNightPlusData();
		const updated: NightPlusCache = {
			status: data.status ?? existing?.status ?? null,
			wispServers: data.wispServers ?? existing?.wispServers ?? [],
			proxyServers: data.proxyServers ?? existing?.proxyServers ?? [],
			lastUpdated: Date.now()
		};
		await store.setItem(KEY_CACHE, updated as never);
	} catch (error) {
		console.error('[nightplus] failed to cache data', error);
	}
}

export async function clearNightPlusCache(): Promise<void> {
	await store.removeItem(KEY_CACHE);
	await store.removeItem(KEY_PROFILE);
}

export async function dumpNightPlusData(): Promise<void> {
	const [status, wispServers, proxyServers] = await Promise.all([
		getNightPlusInfo(),
		getPremiumWispServers(),
		getPremiumProxyServers()
	]);

	await setCachedNightPlusData({ status, wispServers, proxyServers });
}

export async function getNightPlusDataWithCache(): Promise<NightPlusCache | null> {
	if (apiAvailability()) return null;
	try {
		await dumpNightPlusData();
	} catch (error) {
		console.warn(
			'[nightplus] refresh failed, falling back to cache',
			error
		);
	}
	return await getCachedNightPlusData();
}

const hostnameToSocksUrl = (hostname: string): string | null => {
	const parts = hostname.split('-');
	if (parts.length < 4) return null;
	const nodeNumber = parts[parts.length - 1];
	const baseHostname = parts.slice(0, -2).join('-');
	return `socks5h://${baseHostname}-socks5-${nodeNumber}.relays.mullvad.net:1080`;
};

export { hostnameToSocksUrl };

let mullvadCache: { ts: number; data: MullvadRelay[] } | null = null;

export async function fetchMullvadRelays(): Promise<MullvadRelay[]> {
	if (mullvadCache && Date.now() - mullvadCache.ts < 3_600_000) {
		return mullvadCache.data;
	}

	const body = await window.proxy.fetch(
		'https://api.mullvad.net/public/relays/wireguard/v1/'
	);
	const data = JSON.parse(body);
	const relays: MullvadRelay[] = [];

	for (const country of data?.countries ?? []) {
		for (const city of country?.cities ?? []) {
			for (const relay of city?.relays ?? []) {
				if (!relay?.hostname) continue;
				relays.push({
					hostname: relay.hostname,
					country: country.name ?? 'Unknown',
					city: city.name ?? ''
				});
			}
		}
	}

	mullvadCache = { ts: Date.now(), data: relays };
	return relays;
}

const findLoginCard = (): Element | null => {
	const shadow = document.getElementById('night-login-root')?.shadowRoot;
	if (!shadow) return null;

	const maxWidth = window.innerWidth * 0.95;
	const maxHeight = window.innerHeight * 0.95;
	let card: Element | null = null;
	let cardArea = 0;

	for (const element of shadow.querySelectorAll('*')) {
		const rect = element.getBoundingClientRect();
		if (rect.width > maxWidth || rect.height > maxHeight) continue;

		const area = rect.width * rect.height;
		if (area > cardArea) {
			card = element;
			cardArea = area;
		}
	}

	return card;
};

const installDismissHandlers = (login: { close: () => void }): (() => void) => {
	const cleanup = () => {
		window.removeEventListener('pointerdown', onPointerDown, true);
		window.removeEventListener('keydown', onKeyDown, true);
	};

	const dismiss = () => {
		cleanup();
		login.close();
		document.getElementById('night-login-root')?.remove();
		document.getElementById('night-login-overlay')?.remove();
	};

	const onPointerDown = (event: PointerEvent) => {
		const card = findLoginCard();
		if (!card) return;

		const rect = card.getBoundingClientRect();
		const inside =
			event.clientX >= rect.left &&
			event.clientX <= rect.right &&
			event.clientY >= rect.top &&
			event.clientY <= rect.bottom;

		if (!inside) dismiss();
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') dismiss();
	};

	window.addEventListener('pointerdown', onPointerDown, true);
	window.addEventListener('keydown', onKeyDown, true);

	return cleanup;
};

export async function openNightPlusLogin(): Promise<boolean> {
	const unavailable = apiAvailability();
	if (unavailable) {
		window.alert(unavailable);
		return false;
	}
	const { default: NightLogin } = await import('@nightnetwork/night-auth');

	return await new Promise<boolean>(resolve => {
		let cleanup: () => void = () => {};

		const login = new NightLogin({
			service: 'Space',
			theme: 'dark',
			API_URL: apiUrl('/auth', getSpaceConfig())!,
			onSuccess: async () => {
				cleanup();

				let token: string | null = null;
				try {
					token = localStorage.getItem('access_token');
				} catch {
					/* storage unavailable */
				}

				if (!token) {
					console.error(
						'[nightplus] login succeeded but no access_token was stored'
					);
					resolve(false);
					return;
				}

				await setAccessToken(token);

				try {
					await dumpNightPlusData();
				} catch (error) {
					console.warn(
						'[nightplus] post-login refresh failed',
						error
					);
				}

				resolve(true);
			},
			onCancel: () => {
				cleanup();
				resolve(false);
			}
		});

		login.show();
		cleanup = installDismissHandlers(login);
	});
}

export const nightPlusFeatures = [
	'Premium WISP servers',
	'Mullvad VPN routing',
	'Premium proxy routing',
	'NyxAI assistant',
	'Cloudflare Turnstile auto-solver'
];
