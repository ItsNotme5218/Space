export function assetUrl(
	path: string,
	pageUrl = globalThis.location?.href
): string {
	if (!pageUrl) return path;
	const page = new URL(pageUrl);
	const base = page.pathname.toLowerCase().endsWith('.svg')
		? new URL('./', page)
		: new URL('/', page.origin);
	if (path.startsWith('//')) return new URL(path, page.origin).href;
	return new URL(path.replace(/^\//, ''), base).href;
}

export function resolveAssetConfig<T extends Record<string, unknown>>(
	config: T,
	pageUrl = globalThis.location?.href
): T {
	const resolved: Record<string, unknown> = { ...config };
	if (!pageUrl) return resolved as T;
	for (const key of [
		'prefix',
		'scramjetPath',
		'wasmPath',
		'injectPath'
	] as const) {
		const value = resolved[key];
		if (typeof value === 'string') {
			resolved[key] = new URL(assetUrl(value, pageUrl)).pathname;
		}
	}
	return resolved as T;
}
