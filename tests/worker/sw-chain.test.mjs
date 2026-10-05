import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(
	new URL('../../public/sw.js', import.meta.url),
	'utf8'
);

function swEnvironment() {
	const requests = [];
	const context = vm.createContext({
		navigator: { userAgent: 'node' },
		URL,
		Request,
		Response,
		Headers,
		AbortSignal,
		Date,
		Number,
		caches: {
			open: async () => ({
				async match() {
					return null;
				},
				async put() {}
			})
		},
		fetch: async input =>
			new Response(`upstream:${String(input.url ?? input)}`, {
				headers: { 'x-analytics-cached-at': '0' }
			}),
		importScripts: () => {},
		$scramjetController: {
			shouldRoute: () => false,
			route: async () => new Response('routed')
		},
		self: {
			location: new URL('https://space.example/sw.js'),
			registration: { scope: 'https://space.example/' },
			addEventListener(type, listener) {
				if (type === 'fetch') context.__fetchListener = listener;
			},
			$scramjetController: {
				shouldRoute: () => false,
				route: async () => new Response('routed')
			}
		}
	});
	vm.runInContext(source, context, { filename: 'sw.js' });
	return {
		dispatch: url => {
			let response;
			context.__fetchListener({
				request: new Request(url),
				respondWith(r) {
					response = r;
				}
			});
			requests.push(url);
			return response;
		}
	};
}

test('analytics requests short-circuit before static, scramjet, and network', async () => {
	const sw = swEnvironment();
	const response = await sw.dispatch('https://space.example/api/tag');
	assert.equal(await response.text(), 'upstream:https://www.googletagmanager.com/gtag/js?id=G-3DTW1KTNCF');
});

test('non-analytics requests fall through to network', async () => {
	const sw = swEnvironment();
	const response = await sw.dispatch('https://space.example/other.js');
	assert.equal(await response.text(), 'upstream:https://space.example/other.js');
});
