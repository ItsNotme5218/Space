if (navigator.userAgent.includes('Firefox')) {
	Object.defineProperty(globalThis, 'crossOriginIsolated', {
		value: true,
		writable: false
	});
}

importScripts('./space-runtime.js');
importScripts('./c/controller.sw.js');

const BLOCK_RULES = ['**/cdn-cgi/**'];

function wildcardToRegex(pattern) {
	return new RegExp(
		'^' +
			pattern
				.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
				.replace(/\*\*/g, '.*')
				.replace(/\*/g, '[^/]*') +
			'$',
		'i'
	);
}

const BLOCK_REGEX = BLOCK_RULES.map(wildcardToRegex);
const isAdRequest = url => BLOCK_REGEX.some(rule => rule.test(url));

// First-party analytics library (fixed upstream only, never an open
// proxy) so static deploys work without an API server.
const ANALYTICS_TAG_URL =
	'https://www.googletagmanager.com/gtag/js?id=G-3DTW1KTNCF';
const ANALYTICS_CACHE = 'space-analytics-v1';
const ANALYTICS_MAX_AGE_MS = 300000;

async function spaceAnalyticsResponse(request) {
	const origin = self.location.origin;
	let pathname;
	try {
		const url = new URL(request.url);
		if (url.origin !== origin) return null;
		pathname = url.pathname;
	} catch {
		return null;
	}
	if (request.method !== 'GET' || !pathname.endsWith('/api/tag')) return null;
	const cache = await caches.open(ANALYTICS_CACHE);
	const cached = await cache.match(request.url);
	if (
		cached !== null &&
		Number(cached.headers.get('x-analytics-cached-at') ?? 0) +
			ANALYTICS_MAX_AGE_MS >
			Date.now()
	)
		return cached;
	try {
		const upstream = await fetch(ANALYTICS_TAG_URL, {
			redirect: 'error',
			signal: AbortSignal.timeout(5000)
		});
		if (!upstream.ok) return cached;
		const body = await upstream.text();
		const headers = new Headers({
			'x-analytics-cached-at': String(Date.now())
		});
		headers.set('content-type', 'application/javascript; charset=utf-8');
		await cache.put(request.url, new Response(body, { headers }));
		return new Response(body, { headers });
	} catch {
		return cached;
	}
}

const STATIC_CACHE_FAMILY = 'space-static-v1:';

const packageScope = () => new URL(self.registration.scope);
const staticCachePrefix = () =>
	`${STATIC_CACHE_FAMILY}${encodeURIComponent(packageScope().pathname)}:`;
const staticCacheName = () =>
	`${staticCachePrefix()}${encodeURIComponent(self.__SPACE_PROXY_CONFIG__?.buildId || 'development')}`;

function packagePath(request) {
	const url = new URL(request.url);
	const scope = packageScope();
	if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname))
		return null;
	return url.pathname.slice(scope.pathname.length);
}

function isPackageAsset(request) {
	if (request.method !== 'GET' || request.headers.has('range')) return false;
	const url = new URL(request.url);
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
	const path = packagePath(request);
	if (path === null || !path) return false;

	const proxyPrefix = String(
		self.__SPACE_PROXY_CONFIG__?.prefix || '/s/res/'
	).replace(/^\//, '');
	if (path.startsWith(proxyPrefix) || path.startsWith('api/')) return false;
	return /^(?:index\.svg|index\.html|newtab\.html|space-config\.json|space-runtime\.js|space-manifest\.json|sw\.js|assets\/|fonts\/|s\/(?!res\/)|c\/|l\/|ep\/|ut\/)/.test(
		path
	);
}

async function spaceStaticAssetResponse(request, fetchImpl = fetch) {
	if (!isPackageAsset(request)) return null;
	const htmlResponse = response => {
		if (
			response.status !== 200 ||
			response.type === 'opaque' ||
			(response.url && packagePath({ url: response.url }) === null) ||
			!packagePath(request)?.endsWith('.html')
		)
			return response;
		const headers = new Headers(response.headers);
		headers.set('Content-Type', 'text/html; charset=utf-8');
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers
		});
	};

	const cache = await caches.open(staticCacheName());
	try {
		const response = htmlResponse(await fetchImpl(request));
		if (
			response.status === 200 &&
			response.type !== 'opaque' &&
			(!response.url || packagePath({ url: response.url }) !== null)
		) {
			await cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		const cached = await cache.match(request);
		if (cached) return htmlResponse(cached);
		return new Response('Space package resource is unavailable', {
			status: 503,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}
}

async function cleanupSpaceStaticCaches() {
	const prefix = staticCachePrefix();
	const current = staticCacheName();
	await Promise.all(
		(await caches.keys())
			.filter(name => name.startsWith(prefix) && name !== current)
			.map(name => caches.delete(name))
	);
}

self.spaceAnalyticsResponse = spaceAnalyticsResponse;
self.spaceStaticAssetResponse = spaceStaticAssetResponse;
self.cleanupSpaceStaticCaches = cleanupSpaceStaticCaches;

self.addEventListener('fetch', event => {
	event.respondWith(
		(async () => {
			if (isAdRequest(event.request.url))
				return new Response(null, { status: 204 });

			const analyticsResponse = await self.spaceAnalyticsResponse(
				event.request
			);
			if (analyticsResponse) return analyticsResponse;

			const staticResponse = await self.spaceStaticAssetResponse(
				event.request
			);
			if (staticResponse) return staticResponse;

			if ($scramjetController.shouldRoute(event))
				return $scramjetController.route(event);
			return fetch(event.request);
		})()
	);
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
	event.waitUntil(
		(async () => {
			await clients.claim();
			await cleanupSpaceStaticCaches();
		})()
	);
});

self.addEventListener('message', () => {});
