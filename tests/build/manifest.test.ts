import { expect, test } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { writeManifest, verifyManifest } from '../../srv/vite/manifest';
test('manifest covers all final copied/lazy/binary bytes except itself', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-manifest-');
	await mkdir(`${dir}/assets`);
	for (const path of [
		'index.html',
		'index.svg',
		'sw.js',
		'assets/lazy.js',
		'copied.wasm',
		'font.woff2'
	])
		await writeFile(`${dir}/${path}`, path);
	const manifest = await writeManifest(dir, 'fixture');
	expect(manifest.assets).toHaveLength(6);
	expect(manifest.entry).toBe('/index.svg');
	expect(manifest.worker).toBe('/sw.js');
	for (const asset of manifest.assets)
		expect(asset.sha256).toBe(
			createHash('sha256')
				.update(await readFile(`${dir}${asset.path}`))
				.digest('hex')
		);
	await verifyManifest(dir);
	await writeFile(`${dir}/assets/lazy.js`, 'changed');
	await expect(verifyManifest(dir)).rejects.toThrow(/hash/);
});
test.each([
	'https://external.test/x.js',
	'/../secret',
	'/%2e%2e/secret',
	'/space-manifest.json'
])('rejects unsafe or self manifest entries: %s', async path => {
	const dir = await mkdtemp('/tmp/opencode/space-invalid-manifest-');
	await writeFile(
		`${dir}/space-manifest.json`,
		JSON.stringify({
			version: 1,
			buildId: 'test',
			entry: '/index.svg',
			worker: '/sw.js',
			assets: [{ path, sha256: '', contentType: '', size: 0 }]
		})
	);
	await expect(verifyManifest(dir)).rejects.toThrow(/manifest path/i);
});
