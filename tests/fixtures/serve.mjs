// Local acceptance fixture: installed host controllers/adapters, not a capability mock.
import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { execFileSync } from 'node:child_process';
import { readFile, mkdtemp } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '../..');
const workspace = resolve(root, '..');
let certificate;
async function localCertificate() {
	return (certificate ??= (async () => {
		const dir = await mkdtemp('/tmp/opencode/task10-tls-');
		execFileSync(
			'openssl',
			[
				'req',
				'-x509',
				'-newkey',
				'rsa:2048',
				'-nodes',
				'-keyout',
				dir + '/key.pem',
				'-out',
				dir + '/cert.pem',
				'-days',
				'1',
				'-subj',
				'/CN=localhost',
				'-addext',
				'subjectAltName=IP:127.0.0.1,DNS:localhost'
			],
			{ stdio: 'ignore' }
		);
		return {
			key: await readFile(dir + '/key.pem'),
			cert: await readFile(dir + '/cert.pem')
		};
	})());
}
const mime = path =>
	({
		'.html': 'text/html',
		'.svg': 'image/svg+xml',
		'.js': 'text/javascript',
		'.mjs': 'text/javascript',
		'.json': 'application/json',
		'.wasm': 'application/wasm',
		'.css': 'text/css',
		'.woff2': 'font/woff2',
		'.txt': 'text/plain'
	})[extname(path)] || 'application/octet-stream';
const sockets = new WeakMap();
const listen = server =>
	new Promise(r => {
		const owned = new Set();
		sockets.set(server, owned);
		server.on('connection', socket => {
			owned.add(socket);
			socket.on('close', () => owned.delete(socket));
		});
		server.listen(0, '127.0.0.1', () =>
			r(`http://127.0.0.1:${server.address().port}`)
		);
	});
const close = server =>
	new Promise(r => {
		for (const socket of sockets.get(server) || []) socket.destroy();
		server.closeAllConnections();
		server.close(() => r());
	});
export async function acceptanceFixture({
	host = null,
	shoestring = false,
	entry = 'html',
	externalSmoke = false,
	fontsUnavailable = false
} = {}) {
	const requests = [],
		physical = [],
		servers = [];
	let sourceOffline = false;
	const manifest = JSON.parse(
		await readFile(resolve(root, 'dist/space-manifest.json'), 'utf8')
	);
	const spaceConfig = JSON.parse(
		await readFile(resolve(root, 'dist/space-config.json'), 'utf8')
	);
	const contentTypes = new Map(
		manifest.assets.map(asset => [asset.path, asset.contentType])
	);
	const wisp = createRequire(import.meta.url)(
		resolve(
			root,
			'node_modules/@mercuryworkshop/wisp-js/dist/wisp-server.cjs'
		)
	).server;
	wisp.options.hostname_whitelist = [
		/^127\.0\.0\.1$/,
		...(externalSmoke ? [/^gabrielecirulli\.github\.io$/] : [])
	];
	wisp.options.allow_loopback_ips = true;
	wisp.options.allow_private_ips = true;
	const transport = createSecureServer(await localCertificate());
	transport.on('upgrade', (req, socket, head) => {
		requests.push({ kind: 'wisp', path: req.url });
		wisp.routeRequest(req, socket, head);
	});
	servers.push(transport);
	const wispUrl = (await listen(transport)).replace('http:', 'wss:') + '/w/';
	// A game has a distinct origin. Scramjet correctly denies proxying its own
	// real host origin; that engine safeguard must not be weakened for a fixture.
	const game = createServer(async (req, res) => {
		const path = new URL(req.url, 'http://fixture').pathname;
		requests.push({ kind: 'game', path });
		res.setHeader(
			'Content-Type',
			path.endsWith('.txt') ? 'text/plain' : 'text/html'
		);
		let body = await readFile(
			resolve(
				root,
				'tests/fixtures/game',
				path.endsWith('.txt') ? 'asset.txt' : 'index.html'
			)
		);
		if (path === '/game/second')
			body = Buffer.from(
				body.toString().replace('id="level">first', 'id="level">second')
			);
		res.end(body);
	});
	servers.push(game);
	const gameOrigin = await listen(game);
	const source = createServer(async (req, res) => {
		const path = new URL(req.url, 'http://fixture').pathname;
		requests.push({ kind: 'source', path });
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
		res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
		res.setHeader('Cache-Control', 'no-store');
		try {
			if (path.startsWith('/game/')) {
				res.setHeader(
					'Content-Type',
					path.endsWith('.txt') ? 'text/plain' : 'text/html'
				);
				let body = await readFile(
					resolve(
						root,
						'tests/fixtures/game',
						path.endsWith('.txt') ? 'asset.txt' : 'index.html'
					)
				);
				if (path === '/game/second')
					body = Buffer.from(
						body
							.toString()
							.replace('id="level">first', 'id="level">second')
					);
				res.end(body);
				return;
			}
			if (sourceOffline) {
				res.writeHead(503);
				res.end('source offline');
				return;
			}
			if (fontsUnavailable && /\.(?:woff2?|ttf)$/.test(path)) {
				res.writeHead(404);
				res.end('controlled font outage');
				return;
			}
			const file = resolve(
				root,
				'dist',
				'.' + (path === '/' ? '/index.html' : path)
			);
			if (!file.startsWith(resolve(root, 'dist') + '/'))
				throw Error('unsafe');
			res.setHeader('Content-Type', contentTypes.get(path) || mime(file));
			res.end(await readFile(file));
		} catch {
			res.writeHead(404);
			res.end('fixture missing');
		}
	});
	servers.push(source);
	const sourceOrigin = await listen(source);
	let bootOrigin = null;
	if (shoestring) {
		const bootRoot = resolve(workspace, 'shoestring-space');
		const outDir = await mkdtemp('/tmp/opencode/task10-boot-');
		const config = { sourceOrigin, buildId: manifest.buildId, wispUrl };
		for (const worker of [false, true])
			await build({
				configFile: false,
				root: bootRoot,
				logLevel: 'silent',
				define: { __BOOTSTRAP_CONFIG__: JSON.stringify(config) },
				build: {
					outDir,
					assetsDir: 'bootstrap-assets',
					emptyOutDir: false,
					...(worker
						? {
								lib: {
									entry: resolve(bootRoot, 'src/sw/index.ts'),
									formats: ['iife'],
									name: 'Bootstrap',
									fileName: () => 'bootstrap-sw.js'
								}
							}
						: {})
				}
			});
		const { createStaticServer } = await import(
			resolve(bootRoot, 'serve.mjs')
		);
		const boot = createStaticServer(outDir);
		servers.push(boot);
		bootOrigin = await listen(boot);
	}
	const target =
		(bootOrigin || sourceOrigin) +
		(shoestring ? `/?entry=${entry}` : `/index.${entry}?view=games`);
	let hostOrigin = null;
	if (host) {
		const controller =
			host === 'Nebula'
				? 'Nebula/node_modules/@mercuryworkshop/scramjet-controller/dist/controller.'
				: 'src/core/SJ/controller/dist/';
		const routes = {
			'/engine.js':
				'node_modules/@mercuryworkshop/scramjet/dist/scramjet.js',
			'/engine.wasm':
				'node_modules/@mercuryworkshop/scramjet/dist/scramjet.wasm',
			'/api.js': controller + 'api.js',
			'/inject.js': controller + 'inject.js',
			'/controller-sw.js': controller + 'sw.js',
			'/bridge.js':
				host === 'Nebula'
					? 'Nebula/src/utils/proxyContext-generated/proxy-context-adapter.js'
					: 'src/apis/proxyContext/generated/proxy-context-adapter.js',
			'/obscura.js': 'src/pkgs/Obscura/dist/obscura.iife.js'
		};
		const loader = await readFile(
			resolve(workspace, 'Nebula/src/components/settings/Loader.astro'),
			'utf8'
		);
		const ast = ts.createSourceFile(
			'loader.ts',
			loader.replace(/^<script>/, '').replace(/<\/script>\s*$/, ''),
			ts.ScriptTarget.Latest,
			true
		);
		let codec;
		const visit = n => {
			if (ts.isPropertyAssignment(n) && n.name.getText(ast) === 'codec')
				codec = n.initializer.getText(ast);
			ts.forEachChild(n, visit);
		};
		visit(ast);
		const codecScript =
			host === 'Nebula'
				? ts.transpileModule(`const codec=${codec}`, {
						compilerOptions: { target: ts.ScriptTarget.ES2022 }
					}).outputText
				: 'const codec={encode:__obscura.encode,decode:__obscura.decode};';
		const hostServer = createServer(async (req, res) => {
			const path = new URL(req.url, 'http://fixture').pathname;
			res.setHeader('Cache-Control', 'no-store');
			try {
				if (routes[path]) {
					res.setHeader('Content-Type', mime(path));
					res.end(await readFile(resolve(workspace, routes[path])));
					return;
				}
				if (path === '/sw.js') {
					res.setHeader('Content-Type', 'text/javascript');
					res.end(
						"importScripts('/controller-sw.js');addEventListener('fetch',e=>{if($scramjetController.shouldRoute(e))e.respondWith($scramjetController.route(e))});"
					);
					return;
				}
				if (path.startsWith('/source/')) {
					const url = new URL(decodeURIComponent(path.slice(8)));
					requests.push({ kind: 'host-transport', url: url.href });
					// One successful legacy provider and deliberate failure of other providers.
					if (url.href.includes('gn-math/assets@latest/zones.json')) {
						res.setHeader('Content-Type', 'application/json');
						res.end(
							JSON.stringify([
								{
									id: 1,
									name: 'Controlled acceptance game',
									url: '/controlled.html'
								}
							])
						);
						return;
					}
					if (
						url.href.includes('gn-math/html@main/controlled.html')
					) {
						res.setHeader('Content-Type', 'text/html');
						res.end(
							await readFile(
								resolve(root, 'tests/fixtures/game/index.html')
							)
						);
						return;
					}
					if (url.pathname.startsWith('/game/')) {
						res.setHeader(
							'Content-Type',
							url.pathname.endsWith('.txt')
								? 'text/plain'
								: 'text/html'
						);
						let body = await readFile(
							resolve(
								root,
								'tests/fixtures/game',
								url.pathname.endsWith('.txt')
									? 'asset.txt'
									: 'index.html'
							)
						);
						if (url.pathname === '/game/second')
							body = Buffer.from(
								body
									.toString()
									.replace(
										'id="level">first',
										'id="level">second'
									)
							);
						res.end(body);
						return;
					}
					if (![sourceOrigin, bootOrigin].includes(url.origin)) {
						res.writeHead(503);
						res.end('controlled provider failure');
						return;
					}
					const response = await fetch(url);
					res.writeHead(
						response.status,
						Object.fromEntries(response.headers)
					);
					res.end(Buffer.from(await response.arrayBuffer()));
					return;
				}
				if (path === '/away') {
					res.setHeader('Content-Type', 'text/html');
					res.end('<h1>Away</h1>');
					return;
				}
				res.setHeader('Content-Type', 'text/html');
				res.end(`<!doctype html><script src="/engine.js"></script><script src="/api.js"></script><script src="/bridge.js"></script>${host === 'Daydream' ? '<script src="/obscura.js"></script>' : ''}<iframe id="outer" style="width:100%;height:95vh"></iframe><script>
        (async()=>{const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));const nativeFetch=fetch.bind(window);const transport={ready:true,init:async()=>{},connect:()=>{throw Error('No public Wisp')},request:async(url)=>{const r=await nativeFetch('/source/'+encodeURIComponent(url.href));return{body:await r.arrayBuffer(),headers:[...r.headers],status:r.status,statusText:r.statusText}}};${codecScript}
        window.controller=new $scramjetController.Controller({serviceworker:reg.active,transport,config:{prefix:'/proxy/',scramjetPath:'/engine.js',wasmPath:'/engine.wasm',injectPath:'/inject.js',codec}});window.disposeAdapter=SpaceProxyContext.installScramjetProxyContext(controller,await(await nativeFetch('/bridge.js')).text());await controller.wait();window.frame=controller.createFrame(document.getElementById('outer'));window.hooks=[];$scramjet.Tap.tap(frame.hooks.init.post,({window:w,client})=>hooks.push({time:performance.now(),url:client.meta.origin.href,ready:w[Symbol.for('proxy-context-v1.document')]?.ready}));frame.go(${JSON.stringify(target)});window.hostReady=true;})().catch(e=>window.hostError=String(e));</script>`);
			} catch (e) {
				res.writeHead(500);
				res.end(String(e));
			}
		});
		servers.push(hostServer);
		hostOrigin = await listen(hostServer);
	}
	return {
		url: hostOrigin || target,
		sourceOrigin,
		gameOrigin,
		gameUrl: gameOrigin + '/game/index.html',
		wispUrl,
		manifest,
		spaceConfig,
		requests,
		physical,
		hostOrigin,
		setSourceOffline() {
			sourceOffline = true;
		},
		async close() {
			for (const server of servers.reverse()) await close(server);
		}
	};
}
