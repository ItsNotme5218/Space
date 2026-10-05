import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(
	new URL('../../public/sw.js', import.meta.url),
	'utf8'
);

function swEnvironment({ upstreamBody = 'window.gtagLoaded=true;' } = {}) {
	const store = new Map();
	const cache = {
		async match(url) {
			const entry = store.get(String(url));
			if (!entry) return null;
			return new Response(entry.body, {
				headers: { 'x-analytics-cached-at': String(entry.storedAt) }
			});
		},
		async put(url, response) {
			store.set(String(url), {
				body: await response.text(),
				storedAt: Number(
					response.headers.get('x-analytics-cached-at') ?? Date.now()
				)
			});
		}
	};
	const upstream = [];
	const context = vm.createContext({
		URL,
		Request,
		Response,
		Headers,
		AbortSignal,
		navigator: { userAgent: 'node' },
		importScripts: () => {},
		caches: { open: async () => cache },
		fetch: async url => {
			upstream.push(String(url));
			return new Response(upstreamBody);
		},
		self: {
			location: new URL('https://space.example/'),
			registration: { scope: 'https://space.example/' },
			addEventListener() {}
		},
		Date,
		Number
	});
	vm.runInContext(source, context, { filename: 'analytics-sw.js' });
	return vm.runInContext('self', context);
}

test('serves the fixed tag from upstream then cache', async () => {
	const self = swEnvironment();
	const first = await self.spaceAnalyticsResponse(
		new Request('https://space.example/api/tag')
	);
	assert.equal(await first.text(), 'window.gtagLoaded=true;');
	const second = await self.spaceAnalyticsResponse(
		new Request('https://space.example/api/tag')
	);
	assert.equal(await second.text(), 'window.gtagLoaded=true;');
});

test('serves package-subpath mounts on static hosts', async () => {
	const self = swEnvironment();
	const response = await self.spaceAnalyticsResponse(
		new Request('https://space.example/gh/TwiLabs/q7v3m9c2@main/api/tag')
	);
	assert.equal(await response.text(), 'window.gtagLoaded=true;');
});

test('ignores foreign origins, other paths, and non-GET', async () => {
	const self = swEnvironment();
	assert.equal(
		await self.spaceAnalyticsResponse(
			new Request('https://evil.example/api/tag')
		),
		null
	);
	assert.equal(
		await self.spaceAnalyticsResponse(
			new Request('https://space.example/other.js')
		),
		null
	);
	assert.equal(
		await self.spaceAnalyticsResponse(
			new Request('https://space.example/api/tag', { method: 'POST' })
		),
		null
	);
});
