import { expect, test } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { build } from 'vite';
import { runInNewContext } from 'node:vm';
import { runtimeConfigPlugin } from '../../srv/vite/runtime-config';
import { spaceScrub } from '../../srv/vite/scrub';
import { writeManifest, verifyManifest } from '../../srv/vite/manifest';

test.each(['server', 'static'])(
	'final minified %s deployment values survive scrub and match JSON/manifest',
	async mode => {
		const root = await mkdtemp('/tmp/opencode/space-deployment-config-');
		await writeFile(
			`${root}/entry.js`,
			'globalThis.fixture={config:__SPACE_CONFIG__,domains:__SPACE_WISP_DOMAINS__};'
		);
		const buildId = 'bare-scramjet-epoxy-libcurl-ultraviolet-雪😀';
		const plugin = runtimeConfigPlugin({
			SPACE_BUILD_MODE: mode,
			SPACE_BUILD_ID: buildId,
			SPACE_WISP_DOMAINS: 'bare.example,epoxy.example',
			SPACE_WISP_URL: 'wss://scramjet.example/bare/',
			SPACE_API_ORIGIN: 'https://libcurl.example'
		});
		await build({
			root,
			configFile: false,
			plugins: [plugin],
			logLevel: 'silent',
			build: {
				outDir: 'dist',
				minify: true,
				rolldownOptions: {
					input: `${root}/entry.js`,
					output: { format: 'iife', entryFileNames: 'entry.js' }
				}
			}
		});
		const dir = `${root}/dist`;
		await spaceScrub(dir, 'deployment-regression');
		const context: any = {};
		runInNewContext(await readFile(`${dir}/entry.js`, 'utf8'), context);
		const config = JSON.parse(
			await readFile(`${dir}/space-config.json`, 'utf8')
		);
		expect.soft(context.fixture.config).toEqual(config);
		expect.soft(context.fixture.config.buildId).toBe(buildId);
		expect
			.soft(context.fixture.domains)
			.toEqual(['bare.example', 'epoxy.example']);
		// The manifest names every byte but uses the same untouched deployment ID.
		for (const path of ['index.svg', 'sw.js'])
			await writeFile(`${dir}/${path}`, 'fixture');
		const manifest = await writeManifest(dir, config.buildId);
		expect.soft(manifest.buildId).toBe(context.fixture.config.buildId);
		await verifyManifest(dir);
	}
);
