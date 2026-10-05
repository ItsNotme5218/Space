import { getSpaceConfig, validateConfig, type SpaceConfig } from './config';

export function apiUrl(path: string, config: SpaceConfig): string | null {
	const valid = validateConfig(config);
	if (
		!path.startsWith('/') ||
		path.startsWith('//') ||
		path.includes('\\') ||
		/(?:^|\/)\.\.(?:\/|$)/.test(path)
	) {
		throw new Error('API path must be an absolute local path');
	}
	if (valid.apiOrigin) return valid.apiOrigin + path;
	return valid.mode === 'server' ? path : null;
}

export function apiAvailability(config = getSpaceConfig()): string | null {
	return apiUrl('/api/plus', config) === null
		? 'Optional account and Plus APIs are unavailable in this deployment.'
		: null;
}

export async function requestApi(
	path: string,
	init: RequestInit = {},
	config = getSpaceConfig(),
	fetcher: typeof fetch = fetch
): Promise<Response> {
	const url = apiUrl(path, config);
	if (url === null) throw new Error(apiAvailability(config)!);
	return fetcher(url, init);
}
