import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(
	new URL('../../public/sw.js', import.meta.url),
	'utf8'
).catch(() => '');

function workerEnvironment({
	scope = 'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/',
	buildId = 'build-a'
} = {}) {
	const entries = new Map();
	const cache = {
		async match(request) {
			return entries.get(String(request.url ?? request))?.clone() ?? null;
		},
		async put(request, response) {
			entries.set(String(request.url ?? request), response.clone());
		}
	};
	const cacheStorage = {
		async open(name) {
			cacheStorage.names.add(name);
			return cache;
		},
		async keys() {
			return [...cacheStorage.names];
		},
		async delete(name) {
			cacheStorage.names.delete(name);
			return true;
		},
		names: new Set()
	};
	const self = {
		location: new URL(scope),
		registration: { scope },
		__SPACE_PROXY_CONFIG__: { buildId, prefix: '/s/res/' },
		addEventListener() {}
	};
	const context = vm.createContext({
		URL,
		Request,
		Response,
		Headers,
		AbortSignal,
		navigator: { userAgent: 'node' },
		importScripts: () => {},
		caches: cacheStorage,
		self,
		fetch: async () => {
			throw new Error('Unexpected default fetch');
		}
	});
	vm.runInContext(source, context, { filename: 'static-assets-sw.js' });
	return { self, cacheStorage, entries };
}

test('caches successful same-package static requests and serves complete cached content on failure', async () => {
	const { self } = workerEnvironment();
	const request = new Request(
		'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/assets/imgs/g/game.webp'
	);
	let online = true;
	const fetchImpl = async () => {
		if (!online) throw new Error('offline');
		return new Response('complete image bytes', {
			status: 200,
			headers: { 'Content-Type': 'image/webp' }
		});
	};

	const first = await self.spaceStaticAssetResponse(request, fetchImpl);
	assert.equal(first.status, 200);
	assert.equal(await first.text(), 'complete image bytes');
	online = false;
	const second = await self.spaceStaticAssetResponse(request, fetchImpl);
	assert.equal(second.status, 200);
	assert.equal(second.headers.get('Content-Type'), 'image/webp');
	assert.equal(await second.text(), 'complete image bytes');
});

test('rehosts package HTML and worker runtime files but bypasses proxy, API, cross-origin, ranged, and non-GET traffic', async () => {
	const { self } = workerEnvironment();
	const fetchImpl = async () => new Response('ok', { status: 200 });
	for (const path of [
		'newtab.html',
		's/cuf7avvz.wasm',
		'c/controller.sw.js'
	]) {
		const request = new Request(
			`https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/${path}`
		);
		assert.equal(
			(await self.spaceStaticAssetResponse(request, fetchImpl)).status,
			200,
			path
		);
	}

	const bypass = [
		new Request(
			'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/s/res/encoded-game'
		),
		new Request(
			'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/api/catalog'
		),
		new Request(
			'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/assets/partial.webp',
			{ headers: { Range: 'bytes=0-10' } }
		),
		new Request(
			'https://cdn.jsdelivr.net/gh/TwiLabs/other@main/assets/imgs/g/game.webp'
		),
		new Request(
			'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/assets/save',
			{ method: 'POST', body: 'x' }
		)
	];
	for (const request of bypass)
		assert.equal(
			await self.spaceStaticAssetResponse(request, fetchImpl),
			null,
			request.url
		);
});

test('does not cache error responses and scopes old-cache cleanup to this package', async () => {
	const { self, cacheStorage, entries } = workerEnvironment();
	const request = new Request(
		'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/newtab.html'
	);
	const response = await self.spaceStaticAssetResponse(
		request,
		async () => new Response('missing', { status: 404 })
	);
	assert.equal(response.status, 404);
	assert.equal(entries.size, 0);

	cacheStorage.names.add(
		'space-static-v1:%2Fgh%2FTwiLabs%2Fq7v3m9c2%40main%2F:old'
	);
	cacheStorage.names.add(
		'space-static-v1:%2Fgh%2FTwiLabs%2Fother%40main%2F:keep'
	);
	await self.cleanupSpaceStaticCaches();
	assert.deepEqual([...cacheStorage.names].sort(), [
		'space-static-v1:%2Fgh%2FTwiLabs%2Fother%40main%2F:keep',
		'space-static-v1:%2Fgh%2FTwiLabs%2Fq7v3m9c2%40main%2F:build-a'
	]);
});

test('does not persist redirected or partial app responses', async () => {
	const { self, entries } = workerEnvironment();
	const request = new Request(
		'https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/newtab.html'
	);
	const redirected = new Response('redirected', { status: 200 });
	Object.defineProperty(redirected, 'url', {
		value: 'https://outside.example/newtab.html'
	});
	await self.spaceStaticAssetResponse(request, async () => redirected);
	assert.equal(entries.size, 0);
	await self.spaceStaticAssetResponse(
		request,
		async () => new Response('partial', { status: 206 })
	);
	assert.equal(entries.size, 0);
});

test('serves CDN text/plain HTML as an HTML document online and offline', async () => {
	const { self } = workerEnvironment();
	for (const path of ['index.html', 'newtab.html']) {
		const request = new Request(
			`https://cdn.jsdelivr.net/gh/TwiLabs/q7v3m9c2@main/${path}`
		);
		const html = '<!doctype html><html><body>Space</body></html>';
		const online = await self.spaceStaticAssetResponse(
			request,
			async () =>
				new Response(html, {
					headers: {
						'Content-Type': 'text/plain',
						'X-Content-Type-Options': 'nosniff',
						'X-Test': 'preserved'
					}
				})
		);
		assert.equal(
			online.headers.get('Content-Type'),
			'text/html; charset=utf-8'
		);
		assert.equal(online.headers.get('X-Test'), 'preserved');
		assert.equal(await online.text(), html);
		const offline = await self.spaceStaticAssetResponse(
			request,
			async () => {
				throw new Error('offline');
			}
		);
		assert.equal(
			offline.headers.get('Content-Type'),
			'text/html; charset=utf-8'
		);
		assert.equal(await offline.text(), html);
	}
});
