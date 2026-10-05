import { expect, test } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { finalizeBuild } from '../../srv/vite/finalize';
import {
	assertArtifacts,
	readWorkerRuntime
} from '../../srv/vite/assert-artifacts';
import { walkFiles } from '../../srv/vite/scrub';
import { proxyRuntimeSource } from '../../srv/vite/runtime-config';
import { createEmbeddedSvg } from '../../srv/vite/svg-host';

test('final output hides bootstrap filename and controller global while page and worker agree', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-bootstrap-');
	try {
		for (const name of ['s', 'c', 'assets']) await mkdir(`${dir}/${name}`);
		const config = {
			mode: 'static' as const,
			wispUrl: null,
			apiOrigin: null,
			buildId: 'bootstrap-test'
		};
		const html =
			'<html><body><script src="./space-proxy.js"></script><script src="./c/controller.api.js"></script><script src="./page.js"></script></body></html>';
		await writeFile(`${dir}/index.html`, html);
		await writeFile(`${dir}/index.svg`, createEmbeddedSvg(html));
		await writeFile(`${dir}/newtab.html`, html);
		await writeFile(`${dir}/space-config.json`, JSON.stringify(config));
		await writeFile(
			`${dir}/space-proxy.js`,
			proxyRuntimeSource(config.buildId)
		);
		await writeFile(
			`${dir}/proxy-context-adapter.js`,
			`self.adapterWire='proxy-context-v1';`
		);
		await writeFile(
			`${dir}/proxy-context-host.js`,
			`self.hostWire='document-fetch';`
		);
		await writeFile(
			`${dir}/assets/proxy-settings-CD12ab34.js`,
			'export const value=1;'
		);
		await writeFile(
			`${dir}/assets/proxy-Ab12cd34.js`,
			`import './proxy-settings-CD12ab34.js';self.chunkConfig=__SPACE_PROXY_CONFIG__;`
		);
		await writeFile(`${dir}/s/scramjet.js`, 'self.$scramjet={};');
		await writeFile(
			`${dir}/s/scramjet.wasm`,
			Buffer.from([0, 97, 115, 109, 1, 0, 0, 0])
		);
		await writeFile(`${dir}/c/controller.inject.js`, '');
		const controller =
			'self.$scramjetController={read:()=>__SPACE_PROXY_CONFIG__.buildId};';
		for (const name of ['api', 'sw'])
			await writeFile(`${dir}/c/controller.${name}.js`, controller);
		await writeFile(
			`${dir}/page.js`,
			`self.result=$scramjetController.read();self.scripts=['./proxy-context-adapter.js','./proxy-context-host.js','./assets/proxy-Ab12cd34.js'];`
		);
		await writeFile(
			`${dir}/sw.js`,
			`importScripts('./space-proxy.js');importScripts('./c/controller.sw.js');self.result=$scramjetController.read();
      const wires=['proxy-context-v1','nested-iframe-navigation','document-fetch'];`
		);
		await finalizeBuild(dir, config);
		const files = await walkFiles(dir);
		const names = files.map(file => file.slice(dir.length + 1));
		expect(names).not.toContain('space-proxy.js');
		expect(
			names
				.filter(name => name.endsWith('.js'))
				.some(name => /proxy/i.test(name))
		).toBe(false);
		const executable = (
			await Promise.all(
				files
					.filter(file => /\.(?:js|html|svg)$/.test(file))
					.map(file => readFile(file, 'utf8'))
			)
		).join('\n');
		expect(executable).not.toMatch(
			/space-proxy\.js|proxy-context-(?:adapter|host)\.js|proxy-settings|proxy-Ab12cd34|__SPACE_PROXY_CONFIG__|\$scramjet(?:Controller)?\b/
		);
		const {
			worker,
			bootstrapPath: bootstrap,
			config: emittedConfig
		} = await readWorkerRuntime(dir);
		expect(emittedConfig.buildId).toBe('bootstrap-test');
		expect(await readFile(`${dir}/index.html`, 'utf8')).toContain(
			`src="./${bootstrap}"`
		);
		const makeContext = () => {
			const context: any = { TextEncoder, TextDecoder };
			context.self = context;
			return context;
		};
		const page = makeContext();
		for (const name of [
			bootstrap,
			emittedConfig.scramjetPath.slice(1),
			'c/controller.api.js',
			'page.js'
		])
			runInNewContext(await readFile(`${dir}/${name}`, 'utf8'), page);
		for (const ref of page.scripts) expect(names).toContain(ref.slice(2));
		const workerContext = makeContext();
		const imports = new Map(
			await Promise.all(
				[bootstrap, 'c/controller.sw.js'].map(
					async name =>
						[
							`./${name}`,
							await readFile(`${dir}/${name}`, 'utf8')
						] as const
				)
			)
		);
		workerContext.importScripts = (name: string) =>
			runInNewContext(imports.get(name)!, workerContext);
		runInNewContext(worker, workerContext);
		expect(page.result).toBe('bootstrap-test');
		expect(workerContext.result).toBe('bootstrap-test');
		expect(Object.keys(page).some(key => /^\$scramjet/.test(key))).toBe(
			false
		);
		await assertArtifacts(dir, { finalized: true });
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test.each([
	['space-proxy.js', 'self.config={};'],
	['main.js', 'self.$scramjetController={};'],
	['main.js', `const bootstrap='./space-proxy.js';`],
	['proxy-context-adapter.js', ''],
	['proxy-context-host.js', ''],
	['proxy-settings-Ab12cd34.js', ''],
	['proxy-Ab12cd34.js', ''],
	['main.js', 'self.__SPACE_PROXY_CONFIG__={};']
])(
	'finalized assertion rejects bootstrap/global leak in %s',
	async (name, source) => {
		const dir = await mkdtemp('/tmp/opencode/space-bootstrap-gate-');
		try {
			await writeFile(`${dir}/${name}`, source);
			await expect(
				assertArtifacts(dir, { canonical: false, finalized: true })
			).rejects.toThrow(/finalized runtime tell/i);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	}
);

test('finalized guard preserves external URLs and stable bridge wire contracts', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-bootstrap-wire-');
	try {
		await writeFile(
			`${dir}/main.js`,
			`const urls=['https://external.example/space-proxy.js','https://external.example/proxy-context-adapter.js'];const wires=['proxy-context-v1','document-fetch'];`
		);
		await assertArtifacts(dir, { canonical: false, finalized: true });
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
