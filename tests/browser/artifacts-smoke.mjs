// Local-only real final worker/controller/codec/WASM + copied transport imports.
// Controlled native HTTP transport replaces live Wisp; no public deployment.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { tsImport } from 'tsx/esm/api';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const dist = resolve('dist');
const { readWorkerRuntime } = await tsImport(
	'../../srv/vite/assert-artifacts.ts',
	import.meta.url
);
const { bootstrapPath, config } = await readWorkerRuntime(dist);
// The slot name is emitted vocabulary too; share the discovered configuration
// through a fixture-only global rather than relying on its source spelling.
const controllerSource = readFileSync(
	resolve(dist, 'c/controller.api.js'),
	'utf8'
);
const controllerName = controllerSource.match(/^var (\$[\w$]+);/)[1];
const server = createServer((req, res) => {
	const url = new URL(req.url, 'http://fixture');
	res.setHeader('Cache-Control', 'no-cache');
	if (url.pathname === '/fixture-source') {
		res.setHeader('Content-Type', 'text/html');
		res.end(
			'<!doctype html><h1 id="controlled">Controlled final-byte game</h1>'
		);
		return;
	}
	if (url.pathname === '/task7-fixture') {
		res.setHeader('Content-Type', 'text/html');
		res.end(`<!doctype html><meta charset="utf-8"><script src="/${bootstrapPath}"></script><script>window.fixtureConfig=Object.values(Object.getOwnPropertyDescriptors(window)).map(d=>d.value).find(v=>v&&v.prefix===${JSON.stringify(config.prefix)}&&typeof v.codec?.encode==='function'&&typeof v.codec?.decode==='function');</script><script src="${config.scramjetPath}"></script><script src="/c/controller.api.js"></script><iframe id="game"></iframe><script>
    (async()=>{
      const reg=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});await navigator.serviceWorker.ready;
      if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));
      const nativeFetch=fetch.bind(window);
      const transport={ready:true,init:async()=>{},connect:()=>{throw Error('No live Wisp')},request:async(url)=>{const response=await nativeFetch('/fixture-source?url='+encodeURIComponent(url.href));return {body:await response.arrayBuffer(),headers:[...response.headers],status:response.status,statusText:response.statusText}}};
      window.controller=new ${controllerName}.Controller({serviceworker:reg.active,transport,config:window.fixtureConfig});
      await controller.wait();window.frame=controller.createFrame(document.getElementById('game'));
      frame.go('https://game.example/雪?q=a%20b&x=1#fragment');window.fixtureReady=true;
    })().catch(e=>window.fixtureError=String(e));</script>`);
		return;
	}
	const path = resolve(dist, '.' + url.pathname);
	if (!path.startsWith(dist + '/') || !existsSync(path)) {
		res.writeHead(404);
		res.end();
		return;
	}
	res.setHeader(
		'Content-Type',
		{
			'.js': 'application/javascript',
			'.mjs': 'application/javascript',
			'.html': 'text/html',
			'.wasm': 'application/wasm',
			'.json': 'application/json',
			'.css': 'text/css',
			'.woff2': 'font/woff2'
		}[extname(path)] || 'application/octet-stream'
	);
	res.end(readFileSync(path));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
	await page.goto(`http://127.0.0.1:${server.address().port}/task7-fixture`);
	await page.waitForFunction(
		() => window.fixtureReady || window.fixtureError
	);
	assert.equal(await page.evaluate(() => window.fixtureError), undefined);
	await page.frameLocator('#game').locator('#controlled').waitFor();
	const physical = page
		.frames()
		.find(frame => frame.parentFrame() === page.mainFrame())
		.url();
	assert.ok(new URL(physical).pathname.startsWith(config.prefix));
	const framePrefix = await page.evaluate(() => frame.prefix);
	const physicalUrl = new URL(physical);
	assert.equal(
		config.codec.decode(physicalUrl.pathname.slice(framePrefix.length)) +
			'#' +
			config.codec.decode(physicalUrl.hash.slice(1)),
		new URL('https://game.example/雪?q=a%20b&x=1#fragment').href
	);
	const imports = await page.evaluate(async () => {
		const results = [];
		for (const path of ['/ep/index.mjs', '/l/index.mjs']) {
			const module = await import(path);
			results.push({
				path,
				defaultConstructor: typeof module.default === 'function'
			});
		}
		return results;
	});
	assert.ok(imports.every(item => item.defaultConstructor));
	assert.deepEqual(errors, []);
	console.log(
		JSON.stringify(
			{
				passed: true,
				controlledGame: true,
				actualFinalWorker: true,
				physical,
				imports,
				errors
			},
			null,
			2
		)
	);
} finally {
	await browser.close();
	await new Promise(r => server.close(r));
}
