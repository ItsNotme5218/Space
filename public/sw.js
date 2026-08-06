if (navigator.userAgent.includes('Firefox')) {
	Object.defineProperty(globalThis, 'crossOriginIsolated', {
		value: true,
		writable: false
	});
}

importScripts('/c/controller.sw.js');

importScripts('/u/config.js', '/u/bundle.js');
importScripts(__uv$config.sw || '/u/worker.js');

const uv = new UVServiceWorker();

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

self.addEventListener('fetch', event => {
	if (isAdRequest(event.request.url)) {
		event.respondWith(new Response(null, { status: 204 }));
		return;
	}

	if ($scramjetController.shouldRoute(event)) {
		event.respondWith($scramjetController.route(event));
		return;
	}

	if (uv.route(event)) {
		event.respondWith(uv.fetch(event));
	}
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));

self.addEventListener('message', () => {});
