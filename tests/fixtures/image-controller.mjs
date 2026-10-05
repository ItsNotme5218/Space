import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { createProxyConfig } from '../../src/runtime/codec.ts';
import { resolveAssetConfig } from '../../src/runtime/asset-url.ts';

const require = createRequire(
	new URL('../../../package.json', import.meta.url)
);
const { JSDOM } = require('jsdom');
const root = new URL('../../node_modules/', import.meta.url);

/** Installed controller + worker + engine, with only the remote network replaced. */
export async function imageControllerFixture(
	pageUrl = 'https://space.example/index.svg'
) {
	const dom = new JSDOM('', { url: pageUrl, runScripts: 'outside-only' });
	const win = dom.window;
	const channels = [],
		broadcasts = [],
		timers = [],
		errors = [],
		requests = [];
	const pixels = new Uint8Array(
		Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=',
			'base64'
		)
	);
	class TrackedChannel extends MessageChannel {
		constructor() {
			super();
			channels.push(this);
		}
	}
	class TrackedBroadcast extends BroadcastChannel {
		constructor(name) {
			super(name);
			broadcasts.push(this);
		}
	}
	const wasm = readFileSync(
		new URL('@mercuryworkshop/scramjet/dist/scramjet.wasm', root)
	);
	Object.assign(win, {
		TextEncoder,
		TextDecoder,
		Response,
		Request,
		Headers,
		ReadableStream,
		TransformStream,
		MessageChannel: TrackedChannel,
		BroadcastChannel: TrackedBroadcast,
		// Exercise the controller's supported storage-denied branch, not a fake DB.
		indexedDB: {
			open() {
				throw new Error('Fixture cookie storage unavailable');
			}
		},
		fetch: async () => new Response(wasm)
	});
	win.console.error = (...args) => errors.push(args);
	win.URL.createObjectURL = URL.createObjectURL;
	win.URL.revokeObjectURL = URL.revokeObjectURL;
	win.eval(
		readFileSync(
			new URL('@mercuryworkshop/scramjet/dist/scramjet_bundled.js', root),
			'utf8'
		)
	);
	win.eval(
		readFileSync(
			new URL(
				'@mercuryworkshop/scramjet-controller/dist/controller.api.js',
				root
			),
			'utf8'
		)
	);

	const listeners = new Map();
	const workerContext = createContext({
		URL,
		Response,
		Request,
		Headers,
		ReadableStream,
		ArrayBuffer,
		console: {
			...console,
			error: (...args) => errors.push(args),
			log() {}
		},
		addEventListener(type, listener) {
			if (!listeners.has(type)) listeners.set(type, []);
			listeners.get(type).push(listener);
		},
		setTimeout(fn, delay) {
			const timer = setTimeout(fn, delay);
			timers.push(timer);
			return timer;
		},
		clearTimeout,
		clients: {
			get: async () => ({ url: win.location.href }),
			matchAll: async () => [],
			claim: async () => {}
		},
		skipWaiting() {}
	});
	workerContext.self = workerContext;
	runInContext(
		readFileSync(
			new URL(
				'@mercuryworkshop/scramjet-controller/dist/controller.sw.js',
				root
			),
			'utf8'
		),
		workerContext
	);
	const worker = {
		postMessage(data, ports) {
			for (const listener of listeners.get('message') ?? [])
				listener({ data, ports });
		}
	};
	Object.defineProperty(win.navigator, 'serviceWorker', {
		value: Object.assign(new win.EventTarget(), { controller: worker })
	});
	const config = resolveAssetConfig(createProxyConfig(), pageUrl);
	const controller = new win.$scramjetController.Controller({
		serviceworker: worker,
		config,
		transport: {
			ready: true,
			async request(url) {
				requests.push(url.href);
				return {
					body: pixels.slice().buffer,
					status: 200,
					statusText: 'OK',
					headers: [['content-type', 'image/png']]
				};
			}
		}
	});
	await controller.wait();
	function event(url) {
		const request = new Request(url);
		Object.defineProperty(request, 'destination', { value: 'image' });
		return { request, clientId: 'image-fixture' };
	}
	return {
		win,
		controller,
		config,
		worker: workerContext.$scramjetController,
		requests,
		pixels,
		errors,
		accepts: url =>
			workerContext.$scramjetController.shouldRoute(event(url)),
		route: url => workerContext.$scramjetController.route(event(url)),
		close() {
			dom.window.close();
			for (const channel of channels) {
				channel.port1.close();
				channel.port2.close();
			}
			for (const channel of broadcasts) channel.close();
			for (const timer of timers) clearTimeout(timer);
		}
	};
}
