import { expect, test } from 'vitest';
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { assertArtifacts, cacheControl } from '../../srv/vite/assert-artifacts';
import {
	wireRuntimeDefaults,
	addressFinalAssets,
	materializeWasmFallbacks
} from '../../srv/vite/finalize';
test('embedded vendor WASM fallback paths also resolve to valid emitted bytes', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-wasm-fallback-');
	const bytes = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]);
	await writeFile(
		`${dir}/index.mjs`,
		`const embedded=atob('${bytes.toString('base64')}');const fallback=new URL('epoxy.wasm', import.meta.url);`
	);
	await materializeWasmFallbacks(dir);
	const { readFile } = await import('node:fs/promises');
	expect(await readFile(`${dir}/epoxy.wasm`)).toEqual(bytes);
	await assertArtifacts(dir, { canonical: false });
});
import { proxyRuntimeSource } from '../../srv/vite/runtime-config';
import { createEmbeddedSvg } from '../../srv/vite/svg-host';
test('canonical service worker imports and routes Scramjet without UV wiring', async () => {
	const worker = await readFile(
		new URL('../../public/sw.js', import.meta.url),
		'utf8'
	);

	expect(worker).toContain("importScripts('./space-runtime.js')");
	expect(worker).toContain("importScripts('./c/controller.sw.js')");
	expect(worker).toContain('spaceStaticAssetResponse');
	expect(worker).toContain('spaceAnalyticsResponse');
	expect(worker).toContain('$scramjetController.shouldRoute(event)');
	expect(worker).toContain('$scramjetController.route(event)');
	expect(worker).not.toMatch(/importScripts\([^)]*\/u\//);
	expect(worker).not.toContain('UVServiceWorker');
	expect(worker).not.toContain('__uv$config');
	expect(worker).not.toMatch(/\buv\.(?:route|fetch)\(/);
});

test('checked-in runtime assets keep Scramjet transports and omit UV/Bare-Mux outputs', async () => {
	const publicDir = new URL('../../public/', import.meta.url);
	const entries = async (path: string) => {
		try {
			return await readdir(new URL(path, publicDir));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
			throw error;
		}
	};

	for (const dir of ['s/', 'c/', 'ut/', 'l/', 'ep/']) {
		expect(
			await entries(dir),
			`${dir} should remain populated`
		).not.toHaveLength(0);
	}
	expect(await entries('u/')).toEqual([]);
	expect(await entries('b/')).not.toContain('worker.js');
});

test('production artifact validation rejects UV and Bare-Mux runtime assets and routes', async () => {
	const { mkdir } = await import('node:fs/promises');
	const dir = await mkdtemp('/tmp/opencode/space-removed-runtime-');
	await mkdir(`${dir}/u`, { recursive: true });
	await writeFile(`${dir}/u/config.js`, 'self.__uv$config={};');
	await expect(assertArtifacts(dir, { canonical: false })).rejects.toThrow(
		/removed proxy runtime/i
	);

	const routes = await mkdtemp('/tmp/opencode/space-removed-runtime-');
	await writeFile(
		`${routes}/main.js`,
		`import('/u/uv.bundle.js'); import('/b/worker.js'); const pkg='@mercuryworkshop/bare-mux';`
	);
	await expect(assertArtifacts(routes, { canonical: false })).rejects.toThrow(
		/removed proxy runtime/i
	);
});

test('production artifact validation rejects copied Enigma and Reflux root route folders', async () => {
	const { mkdir } = await import('node:fs/promises');

	for (const route of ['en', 'r']) {
		const dir = await mkdtemp('/tmp/opencode/space-removed-route-');
		await mkdir(`${dir}/${route}`, { recursive: true });
		await writeFile(`${dir}/${route}/runtime.js`, 'export default 1;');

		await expect(
			assertArtifacts(dir, { canonical: false })
		).rejects.toThrow(/removed proxy runtime/i);
	}
});

test('production artifact validation does not treat opaque transport payload bytes as removed routes', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-transport-payload-');
	await writeFile(
		`${dir}/index.js`,
		`const certificateChunk='AAAA/u/rgME3PhtNlEBkY0ZcCsStyQmisoL1OWtoYv2uYgdD9mr5eFUjNERW5wClctOiI9z42rrdi';`
	);
	await assertArtifacts(dir, { canonical: false });
});

test('production artifact validation allows legitimate game URLs containing en or r path segments', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-legitimate-routes-');
	await writeFile(
		`${dir}/index.js`,
		`const urls=['https://example.test/games/en/play.html','https://example.test/game/r/index.html'];`
	);

	await assertArtifacts(dir, { canonical: false });
});

test('canonical validation rejects altered worker prefix and missing bridge wire constants', async () => {
	const { mkdir } = await import('node:fs/promises');
	const dir = await mkdtemp('/tmp/opencode/space-canonical-');
	for (const folder of ['s', 'c']) await mkdir(`${dir}/${folder}`);
	for (const path of [
		'index.html',
		'newtab.html',
		's/scramjet.js',
		'c/controller.inject.js',
		'c/controller.sw.js'
	])
		await writeFile(`${dir}/${path}`, '');
	await writeFile(
		`${dir}/s/scramjet.wasm`,
		Buffer.from([0, 97, 115, 109, 1, 0, 0, 0])
	);
	const html = '<html><body><main>Space</main></body></html>';
	await writeFile(`${dir}/index.html`, html);
	await writeFile(`${dir}/index.svg`, createEmbeddedSvg(html));
	await writeFile(
		`${dir}/space-config.json`,
		JSON.stringify({
			mode: 'static',
			wispUrl: null,
			apiOrigin: null,
			buildId: 'test'
		})
	);
	await writeFile(`${dir}/space-proxy.js`, proxyRuntimeSource());
	await writeFile(
		`${dir}/sw.js`,
		`importScripts('./space-proxy.js'); importScripts('./c/controller.sw.js');`
	);
	const wires = `const wires=['proxy-context-v1','nested-iframe-navigation','document-fetch'];`;
	await writeFile(`${dir}/main.js`, wires);
	await assertArtifacts(dir);
	await writeFile(
		`${dir}/space-proxy.js`,
		proxyRuntimeSource().replace('/s/res/', '/wrong/')
	);
	await expect(assertArtifacts(dir)).rejects.toThrow(/prefix mismatch/);
	await writeFile(`${dir}/space-proxy.js`, proxyRuntimeSource());
	await writeFile(
		`${dir}/main.js`,
		wires.replace('proxy-context-v1', 'changed-wire')
	);
	await expect(assertArtifacts(dir)).rejects.toThrow(/bridge wire constant/);
	await writeFile(`${dir}/main.js`, wires);
	await writeFile(
		`${dir}/index.svg`,
		createEmbeddedSvg(html).replace('</foreignObject>', '')
	);
	await expect(assertArtifacts(dir)).rejects.toThrow(
		/Invalid canonical embedded SVG/
	);
});
test('post-scrub assets get a new coherent identity when final bytes change', async () => {
	const { mkdir, readFile, readdir } = await import('node:fs/promises');
	const make = async (value: string) => {
		const dir = await mkdtemp('/tmp/opencode/space-identity-');
		await mkdir(`${dir}/assets`);
		await writeFile(
			`${dir}/index.html`,
			'<script src="/assets/main-Ab12cd34.js"></script>'
		);
		await writeFile(`${dir}/assets/main-Ab12cd34.js`, value);
		await addressFinalAssets(dir);
		return {
			html: await readFile(`${dir}/index.html`, 'utf8'),
			names: await readdir(`${dir}/assets`)
		};
	};
	const first = await make('one'),
		repeated = await make('one'),
		changed = await make('two');
	expect(first).toEqual(repeated);
	expect(first.names).not.toEqual(changed.names);
	expect(first.html).toContain(`/assets/${first.names[0]}`);
});
test('copied vendor defaults are wired to emitted Space paths before scrub', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-defaults-');
	await writeFile(
		`${dir}/main.js`,
		`const paths=['/scramjet/scramjet.js','/controller/controller.inject.js'];`
	);
	await wireRuntimeDefaults(dir);
	const { readFile } = await import('node:fs/promises');
	expect(await readFile(`${dir}/main.js`, 'utf8')).toBe(
		`const paths=['/s/scramjet.js','/c/controller.inject.js'];`
	);
});
test('missing lazy imports and corrupt WASM fail validation', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-assets-');
	await writeFile(`${dir}/index.html`, '<script src="./main.js"></script>');
	await writeFile(`${dir}/main.js`, 'import("./lazy.js")');
	await expect(assertArtifacts(dir, { canonical: false })).rejects.toThrow(
		/lazy.js/
	);
	await writeFile(`${dir}/lazy.js`, 'export default 1');
	await assertArtifacts(dir, { canonical: false });
	await writeFile(`${dir}/test.wasm`, Buffer.from('invalid'));
	await expect(assertArtifacts(dir, { canonical: false })).rejects.toThrow(
		/WASM/
	);
});
test('static template-literal lazy imports emitted by Vite must resolve', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-template-import-');
	await writeFile(
		`${dir}/main.js`,
		'const lazy=()=>import(`./missing-lazy.js`);'
	);
	await expect(assertArtifacts(dir, { canonical: false })).rejects.toThrow(
		/missing-lazy\.js/
	);
	await writeFile(`${dir}/missing-lazy.js`, 'export default 1;');
	await assertArtifacts(dir, { canonical: false });
});
test('interpolated template imports are not misclassified as static assets', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-dynamic-import-');
	await writeFile(
		`${dir}/main.js`,
		'const lazy=name=>import(`./${name}.js`);'
	);
	await assertArtifacts(dir, { canonical: false });
});
test.each([
	`importScripts('one.js','two.js');`,
	`const map='fonts/space-map.json';`,
	`const font=new URL('font.woff2',import.meta.url);`
])('missing worker/font/runtime references fail: %s', async source => {
	const dir = await mkdtemp('/tmp/opencode/space-ref-');
	await writeFile(`${dir}/main.js`, source);
	await writeFile(`${dir}/one.js`, '');
	await expect(assertArtifacts(dir, { canonical: false })).rejects.toThrow(
		/Missing asset/
	);
});
test('stable entries revalidate; hashed assets cache immutably', () => {
	for (const path of [
		'sw.js',
		'space-config.json',
		'space-proxy.js',
		'space-manifest.json',
		'assets/stable.js',
		'index.svg'
	])
		expect(cacheControl(path)).toBe('no-cache');
	for (const path of [
		'assets/main-Ab12cd34.js',
		'fonts/space-23215f462e817230.woff2',
		'assets/engine-Ab12cd34.wasm',
		'assets/image-Ab12cd34.jpg'
	])
		expect(cacheControl(path)).toContain('immutable');
});
