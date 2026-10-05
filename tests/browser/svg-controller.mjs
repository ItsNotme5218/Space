// Run from Space-v2: node tests/browser/svg-controller.mjs
// Real installed controllers/hooks/SW; controlled transport replaces live Wisp.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import ts from 'typescript';
import { rolldown } from 'rolldown';

const root = resolve('..');
const space = resolve('.');
const svg = readFileSync('dist/index.svg', 'utf8');
const build = await rolldown({ input: resolve('src/runtime/index.ts') });
const output = await build.generate({ format: 'iife', name: 'FixtureRuntime' });
const runtime = output.output.find(c => c.type === 'chunk').code;
await build.close();
const mime = file =>
	({
		'.js': 'text/javascript',
		'.html': 'text/html',
		'.svg': 'image/svg+xml',
		'.css': 'text/css',
		'.json': 'application/json',
		'.wasm': 'application/wasm',
		'.woff2': 'font/woff2'
	})[extname(file)] || 'application/octet-stream';
const ast = ts.createSourceFile(
	'loader.ts',
	readFileSync(
		resolve(root, 'Nebula/src/components/settings/Loader.astro'),
		'utf8'
	)
		.replace(/^<script>/, '')
		.replace(/<\/script>\s*$/, ''),
	ts.ScriptTarget.Latest,
	true
);
let codec;
function visit(n) {
	if (ts.isPropertyAssignment(n) && n.name.getText(ast) === 'codec')
		codec = n.initializer.getText(ast);
	ts.forEachChild(n, visit);
}
visit(ast);
assert.ok(codec);
const nebulaCodec = ts.transpileModule(`const codec=${codec}`, {
	compilerOptions: { target: ts.ScriptTarget.ES2022 }
}).outputText;
const outcomes = [];
for (const host of ['Nebula', 'Daydream']) {
	const requests = [],
		workers = [],
		errors = [],
		physicalNavigations = [];
	const controller =
		host === 'Nebula'
			? 'Nebula/node_modules/@mercuryworkshop/scramjet-controller/dist/controller.'
			: 'src/core/SJ/controller/dist/';
	const routes = {
		'/engine.js': resolve(
			root,
			'node_modules/@mercuryworkshop/scramjet/dist/scramjet.js'
		),
		'/engine.wasm': resolve(
			root,
			'node_modules/@mercuryworkshop/scramjet/dist/scramjet.wasm'
		),
		'/api.js': resolve(root, controller + 'api.js'),
		'/inject.js': resolve(root, controller + 'inject.js'),
		'/controller-sw.js': resolve(root, controller + 'sw.js'),
		'/bridge.js': resolve(
			root,
			host === 'Nebula'
				? 'Nebula/src/utils/proxyContext-generated/proxy-context-adapter.js'
				: 'src/apis/proxyContext/generated/proxy-context-adapter.js'
		),
		'/obscura.js': resolve(root, 'src/pkgs/Obscura/dist/obscura.iife.js')
	};
	const server = createServer((req, res) => {
		const path = new URL(req.url, 'http://fixture/').pathname;
		res.setHeader('Cache-Control', 'no-store');
		if (routes[path]) {
			res.setHeader('Content-Type', mime(routes[path]));
			res.end(readFileSync(routes[path]));
			return;
		}
		if (path === '/sw.js') {
			res.setHeader('Content-Type', 'text/javascript');
			res.end(
				"importScripts('/controller-sw.js');addEventListener('fetch',e=>{if($scramjetController.shouldRoute(e))e.respondWith($scramjetController.route(e))});"
			);
			return;
		}
		if (path === '/runtime.js') {
			res.setHeader('Content-Type', 'text/javascript');
			res.end(runtime);
			return;
		}
		if (path === '/away') {
			res.setHeader('Content-Type', 'text/html');
			res.end('<h1>Away</h1>');
			return;
		}
		if (path.startsWith('/source/')) {
			const url = new URL(decodeURIComponent(path.slice(8)));
			requests.push(url.href);
			if (url.pathname === '/index.svg') {
				res.setHeader('Content-Type', 'image/svg+xml');
				res.end(svg);
				return;
			}
			if (url.hostname === 'game.example') {
				res.setHeader('Content-Type', 'text/html');
				res.end('<h1>controlled game</h1>');
				return;
			}
			if (url.hostname === 'space.example') {
				const file = resolve(space, 'dist', url.pathname.slice(1));
				if (
					file.startsWith(resolve(space, 'dist') + '/') &&
					existsSync(file)
				) {
					res.setHeader('Content-Type', mime(file));
					res.end(readFileSync(file));
					return;
				}
			}
			res.writeHead(404);
			res.end('unavailable fixture resource');
			return;
		}
		res.setHeader('Content-Type', 'text/html');
		res.end(`<!doctype html><script src="/engine.js"></script><script src="/api.js"></script><script src="/bridge.js"></script>${host === 'Daydream' ? '<script src="/obscura.js"></script>' : ''}<iframe id="outer" style="width:100%;height:90vh"></iframe><script>
    (async()=>{
      const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
      if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));
      const nativeFetch=fetch.bind(window);
      const transport={ready:true,init:async()=>{},connect:()=>{throw Error('No live Wisp')},request:async(url)=>{const response=await nativeFetch('/source/'+encodeURIComponent(url.href));return {body:await response.arrayBuffer(),headers:[...response.headers],status:response.status,statusText:response.statusText}}};
      ${host === 'Daydream' ? 'const codec={encode:__obscura.encode,decode:__obscura.decode};' : nebulaCodec}
      window.controller=new $scramjetController.Controller({serviceworker:reg.active,transport,config:{prefix:'/proxy/',scramjetPath:'/engine.js',wasmPath:'/engine.wasm',injectPath:'/inject.js',codec}});
      window.disposeAdapter=SpaceProxyContext.installScramjetProxyContext(controller,await(await nativeFetch('/bridge.js')).text());
      await controller.wait();window.frame=controller.createFrame(document.getElementById('outer'));
      window.hooks=[];$scramjet.Tap.tap(frame.hooks.init.post,({window:w,client})=>hooks.push({url:client.meta.origin.href,ready:w[Symbol.for('proxy-context-v1.document')]?.ready}));
      frame.go('https://space.example/index.svg?view=games&ordinary=kept#route?x=1');window.hostReady=true;
    })().catch(e=>window.hostError=String(e));</script>`);
	});
	await new Promise(r => server.listen(0, '127.0.0.1', r));
	const browser = await chromium.launch({
		ignoreDefaultArgs: ['--disable-back-forward-cache']
	});
	const page = await browser.newPage();
	page.on('worker', w => workers.push(w.url()));
	page.on('pageerror', e => errors.push(e.message));
	page.on('request', request => {
		if (request.isNavigationRequest())
			physicalNavigations.push(request.url());
	});
	let app;
	try {
		await page.goto(`http://127.0.0.1:${server.address().port}`);
		await page.waitForFunction(() => window.hostReady || window.hostError);
		assert.equal(await page.evaluate(() => window.hostError), undefined);
		// Browser frame tree only until application mount; no hooked parent probes.
		for (let n = 0; n < 150; n++) {
			app = page
				.frames()
				.find(f => f.parentFrame()?.parentFrame() === page.mainFrame());
			if (app) break;
			await new Promise(r => setTimeout(r, 100));
		}
		assert.ok(app);
		await app.waitForFunction(() => window.proxy?.mode === 'delegated');
		await app.locator('#app-host h1').waitFor();
		assert.equal(await app.locator('#app-host h1').textContent(), 'Games');
		const outer = app.parentFrame();
		await outer.waitForFunction(
			() => document.getElementById('status').style.display === 'none'
		);
		const startup = await outer.evaluate(() => ({
			mime: document.contentType,
			src: document.getElementById('app-frame').getAttribute('src'),
			status: document.getElementById('status').style.display
		}));
		assert.equal(startup.mime, 'text/html');
		assert.ok(startup.src.includes('ordinary=kept'));
		assert.ok(startup.src.includes('space-svg-request='));
		// Client is already authenticated/mounted before any child realm inspection.
		await app.addScriptTag({ content: runtime });
		const lifecycle = await app.evaluate(async () => {
			window.fixtureStage = 'initial-launch';
			const target = document.createElement('iframe');
			document.body.appendChild(target);
			await proxy.navigate(target, 'https://game.example/game');
			window.fixtureStage = 'second-discovery';
			const before = await FixtureRuntime.selectRuntime(window, () => {
				throw Error('Forbidden local fallback');
			});
			window.dispatchEvent(
				new PageTransitionEvent('pagehide', { persisted: true })
			);
			let oldRejected = false;
			try {
				await before.navigate(target, 'https://game.example/stale');
			} catch {
				oldRejected = true;
			}
			window.dispatchEvent(
				new PageTransitionEvent('pageshow', { persisted: true })
			);
			window.fixtureStage = 'restore-discovery';
			const restored = await FixtureRuntime.selectRuntime(window, () => {
				throw Error('Forbidden local fallback');
			});
			window.fixtureStage = 'restored-launch';
			await restored.navigate(target, 'https://game.example/restored');
			window.restoredRuntime = restored;
			return {
				oldRejected,
				restoredMode: restored.mode,
				local: !!restored.local
			};
		});
		assert.deepEqual(lifecycle, {
			oldRejected: true,
			restoredMode: 'delegated',
			local: false
		});
		await expect
			.poll(() =>
				page.evaluate(
					urls =>
						urls.some(url => {
							const path = new URL(url).pathname;
							return (
								path.startsWith(frame.prefix) &&
								controller.config.codec.decode(
									path.slice(frame.prefix.length)
								) === 'https://game.example/restored'
							);
						}),
					physicalNavigations
				)
			)
			.toBe(true);
		await page.evaluate(() => disposeAdapter());
		const failure = await app.evaluate(async () => {
			try {
				await restoredRuntime.navigate(
					document.createElement('iframe'),
					'https://game.example/lost'
				);
				return false;
			} catch {
				return true;
			}
		});
		assert.equal(failure, true);
		assert.ok(
			!requests.some(url =>
				/space\.example\/(?:w\/|b\/|c\/|u\/config|sw\.js)/.test(url)
			)
		);
		assert.deepEqual(workers, []);
		assert.deepEqual(errors, []);
		// Separately attempt a genuine browser history restoration. Admission is
		// browser-controlled; record the actual reason if this fixture is denied.
		await page.evaluate(() => {
			window.actualRestore = null;
			addEventListener('pageshow', e => {
				window.actualRestore = e.persisted;
			});
		});
		await page.goto(`http://127.0.0.1:${server.address().port}/away`);
		await page.goBack();
		await page.waitForFunction(() => window.hostReady || window.hostError);
		const bfcache = await page.evaluate(() => ({
			persisted: window.actualRestore === true,
			notRestoredReasons:
				performance
					.getEntriesByType('navigation')[0]
					?.notRestoredReasons?.toJSON() ?? null
		}));
		if (bfcache.persisted) {
			const child = page
				.frames()
				.find(f => f.parentFrame()?.parentFrame() === page.mainFrame());
			assert.ok(child);
			bfcache.disposedLaunchRejected = await child.evaluate(async () => {
				try {
					await restoredRuntime.navigate(
						document.createElement('iframe'),
						'https://game.example/bfcache-lost'
					);
					return false;
				} catch {
					return true;
				}
			});
			assert.equal(bfcache.disposedLaunchRejected, true);
		}
		outcomes.push({
			host,
			passed: true,
			startup,
			lifecycle,
			owningPrefixVerified: true,
			disposedLaunchRejected: failure,
			bfcache,
			requests,
			physicalNavigations,
			workers,
			errors,
			lifecycleKind:
				'synthetic persisted events for renegotiation; separate genuine history/BFCache attempt recorded'
		});
	} catch (e) {
		outcomes.push({
			host,
			passed: false,
			error: String(e),
			diagnostics: await app
				?.evaluate(() => ({
					stage: window.fixtureStage,
					mode: window.proxy?.mode,
					ready: window[Symbol.for('proxy-context-v1.document')]
						?.ready,
					disposed:
						window[Symbol.for('proxy-context-v1.document')]
							?.disposed
				}))
				.catch(() => null),
			hooks: await page.evaluate(() => window.hooks).catch(() => null),
			requests,
			workers,
			errors
		});
	} finally {
		await browser.close();
		await new Promise(r => server.close(r));
	}
}
console.log(JSON.stringify(outcomes, null, 2));
if (outcomes.some(o => !o.passed)) process.exitCode = 1;
