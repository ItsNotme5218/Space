import { expect, test } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { spaceScrub, walkFiles } from '../../srv/vite/scrub';
import { assertArtifacts } from '../../srv/vite/assert-artifacts';

test('post-copy scrub excludes source maps and developer-only runtime copies, not licenses', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-engine-metadata-');
	try {
		await mkdir(`${dir}/s/temp-types-build`, { recursive: true });
		await writeFile(
			`${dir}/s/scramjet.js`,
			'self.$scramjet={};\n//# sourceMappingURL=scramjet.js.map'
		);
		await writeFile(
			`${dir}/s/scramjet.js.map`,
			'{"sourcesContent":["self.$scramjet={}"]}'
		);
		await writeFile(
			`${dir}/s/types.d.ts`,
			'declare const $scramjet: unknown;'
		);
		await writeFile(
			`${dir}/s/temp-types-build/index.js`,
			'self.$scramjet={unneeded:true};'
		);
		await writeFile(
			`${dir}/s/LICENSE`,
			'Original attribution and AGPL-3.0'
		);
		await spaceScrub(dir, 'metadata-test');
		const files = await walkFiles(dir);
		expect(
			files.some(file =>
				/\.map$|\.d\.ts$|temp-types-build\/.*\.js$/.test(file)
			)
		).toBe(false);
		expect(await readFile(`${dir}/s/LICENSE`, 'utf8')).toBe(
			'Original attribution and AGPL-3.0'
		);
		const executable = await readFile(
			files.find(file => file.endsWith('.js'))!,
			'utf8'
		);
		expect(executable).not.toContain('sourceMappingURL');
		await assertArtifacts(dir, { canonical: false });
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test('coordinated engine vocabulary preserves producer/consumer globals, RPC and helper behavior', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-engine-vocabulary-');
	try {
		await writeFile(
			`${dir}/engine.js`,
			`self.$scramjet={versionInfo:{version:'1'},rewriteUrl:u=>'local:'+u,unrewrite:u=>u.slice(6)};
      self.$scramjetController={frame:Symbol.for('controller frame handle')};
      self.message={$type:'response',$token:1,$data:'ok',$args:[],$method:'fetch',$error:null};
      self.packageName='@mercuryworkshop/scramjet';`
		);
		await writeFile(
			`${dir}/page.js`,
			`self.result=[$scramjet.unrewrite($scramjet.rewriteUrl('test')),$scramjet.versionInfo.version,
      message.$data,message.$token,message.$type,message.$method,message.$args.length,message.$error,
      $scramjetController.frame===Symbol.for('controller frame handle')];`
		);
		await spaceScrub(dir, 'engine-test');
		const engine = await readFile(`${dir}/engine.js`, 'utf8');
		const page = await readFile(`${dir}/page.js`, 'utf8');
		expect(engine + page).not.toMatch(
			/scramjet|mercuryworkshop|rewriteUrl|unrewrite|versionInfo|controller frame handle|\$(?:type|token|data|args|method|error)/i
		);
		const context: any = {};
		context.self = context;
		runInNewContext(engine, context);
		runInNewContext(page, context);
		expect(Array.from(context.result)).toEqual([
			'test',
			'1',
			'ok',
			1,
			'response',
			'fetch',
			0,
			null,
			true
		]);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test('artifact gate refuses accidentally reintroduced source metadata after finalization', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-engine-gate-');
	try {
		await writeFile(`${dir}/runtime.js.map`, '{}');
		await expect(
			assertArtifacts(dir, { canonical: false })
		).rejects.toThrow(/developer artifact/i);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test('expanded engine vocabulary preserves external URLs and WASM export ABI bytes', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-engine-abi-');
	try {
		// () => 7, exported under the otherwise scrubbed engine helper name.
		const bytes = Buffer.from([
			0,
			97,
			115,
			109,
			1,
			0,
			0,
			0,
			1,
			5,
			1,
			96,
			0,
			1,
			127,
			3,
			2,
			1,
			0,
			7,
			14,
			1,
			10,
			...Buffer.from('rewriteUrl'),
			0,
			0,
			10,
			6,
			1,
			4,
			0,
			65,
			7,
			11
		]);
		await writeFile(`${dir}/engine.wasm`, bytes);
		const remote = 'https://mercuryworkshop.example/scramjet.js';
		const payload = Buffer.concat([
			bytes,
			Buffer.from([0, 0x81, 2, 0]),
			Buffer.alloc(256)
		]).toString('base64');
		await writeFile(
			`${dir}/page.js`,
			`self.remote='${remote}';self.payload='${payload}';self.call=instance=>instance.exports.rewriteUrl();`
		);
		await spaceScrub(dir, 'abi-test');
		expect(await readFile(`${dir}/engine.wasm`)).toEqual(bytes);
		const context: any = {};
		context.self = context;
		runInNewContext(await readFile(`${dir}/page.js`, 'utf8'), context);
		expect(context.remote).toBe(remote);
		expect(context.payload).toBe(payload);
		expect(
			context.call(
				new WebAssembly.Instance(new WebAssembly.Module(bytes))
			)
		).toBe(7);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
