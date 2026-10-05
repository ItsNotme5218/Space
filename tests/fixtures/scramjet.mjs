import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(
	new URL('../../../package.json', import.meta.url)
);
const { JSDOM } = require('jsdom');

export const svg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><foreignObject width="100%" height="100%"><iframe xmlns="http://www.w3.org/1999/xhtml" src="./index.html?view=games"/></foreignObject></svg>';

export function engineFixture(root = new URL('../..', import.meta.url)) {
	const dom = new JSDOM('', {
		url: 'http://host.example/',
		runScripts: 'outside-only'
	});
	const win = dom.window;
	Object.assign(win, {
		TextEncoder,
		TextDecoder,
		Response,
		Request,
		Headers,
		ReadableStream,
		TransformStream,
		MessageChannel,
		fetch
	});
	win.URL.createObjectURL = URL.createObjectURL;
	win.URL.revokeObjectURL = URL.revokeObjectURL;
	win.eval(
		readFileSync(
			new URL(
				`${root.href.replace(/\/$/, '')}/node_modules/@mercuryworkshop/scramjet/dist/scramjet_bundled.js`
			),
			'utf8'
		)
	);
	const engine = win.$scramjet;
	const controller = {
		frames: [],
		createFrame() {
			const context = {
				config: engine.defaultConfig,
				prefix: new win.URL('http://host.example/proxy/frame/'),
				cookieJar: new engine.CookieJar(),
				interface: {
					codecEncode: encodeURIComponent,
					codecDecode: decodeURIComponent,
					getInjectScripts: (_meta, _handler, _html, script) => [
						script('/engine.js'),
						script('/bootstrap.js')
					]
				}
			};
			const handler = new engine.ScramjetFetchHandler({
				context,
				transport: {},
				sendSetCookie: async () => {},
				fetchDataUrl: async () => {},
				fetchBlobUrl: async () => {}
			});
			const frame = {
				controller: this,
				fetchHandler: handler,
				hooks: { fetch: handler.hooks.fetch, init: engine.Tap.create() }
			};
			this.frames.push(frame);
			return frame;
		}
	};
	async function response(
		frame,
		body = svg,
		type = 'image/svg+xml',
		destination = 'iframe',
		cached = false
	) {
		const { fetchHandler: handler } = frame;
		engine.Tap.tap(handler.hooks.fetch.request, (_ctx, props) => {
			props.earlyResponse = engine.BareResponse.fromNativeResponse(
				new Response(body, {
					headers: {
						'content-type': type,
						etag: 'old',
						'content-length': String(body.length),
						'content-encoding': 'identity'
					}
				})
			);
		});
		if (cached)
			engine.Tap.tap(
				handler.hooks.fetch.preresponse,
				async (_ctx, props) => {
					const raw = await props.response.text();
					props.response = engine.BareResponse.fromNativeResponse(
						new Response(raw, {
							headers: props.response.rawHeaders
						})
					);
				}
			);
		return handler.handleFetch({
			rawUrl: new win.URL(
				'http://host.example/proxy/frame/' +
					encodeURIComponent('https://space.example/index.svg')
			),
			rawDestination: destination,
			rawReferrer: null,
			mode: 'navigate',
			referrer: '',
			method: 'GET',
			body: null,
			cache: 'default',
			clientId: 'fixture',
			initialHeaders: new engine.ScramjetHeaders()
		});
	}
	return { win, engine, controller, response, close: () => win.close() };
}
