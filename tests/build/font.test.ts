import { describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { mkdtemp, copyFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

describe('Space font artifacts', () => {
	it('provides Space-owned generation tooling', async () => {
		const tooling = await import('../../srv/vite/font/index').catch(
			() => null
		);
		expect(tooling?.fontObfuscationPlugin).toBeTypeOf('function');
	});
	it('generates identical bytes and versioned identities for identical input', async () => {
		const { generateFontArtifacts } =
			await import('../../srv/vite/font/index');
		const path = resolve('public/ttf/Roboto-Regular.ttf');
		const first = await generateFontArtifacts(path);
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2035-01-01'));
		const second = await generateFontArtifacts(path).finally(() =>
			vi.useRealTimers()
		);
		expect(second).toEqual(first);
		expect(first.fontName).toMatch(/^fonts\/space-[a-f0-9]{16}\.woff2$/);
		expect(first.mappingName).toMatch(/^fonts\/space-[a-f0-9]{16}\.json$/);
		expect(first.woff2.subarray(0, 4).toString()).toBe('wOF2');
		const mapping = JSON.parse(first.mapping);
		expect(Object.keys(mapping.encode)).toHaveLength(95);
		expect(mapping.encode[' ']).toBe(' '); // retain natural word wrapping
		for (const [plain, encoded] of Object.entries(mapping.encode)) {
			expect(mapping.decode[encoded as string]).toBe(plain);
		}
	});
	it('fails the actual generator explicitly when build tooling is unavailable', async () => {
		const directory = await mkdtemp(
			'/tmp/opencode/space-font-missing-tools-'
		);
		await copyFile(
			'srv/vite/font/index.ts',
			resolve(directory, 'index.ts')
		);
		await writeFile(
			resolve(directory, 'package.json'),
			'{"type":"module"}'
		);
		const result = spawnSync(
			'node',
			[
				'--input-type=module',
				'-e',
				`const { generateFontArtifacts } = await import(${JSON.stringify(pathToFileURL(resolve(directory, 'index.ts')).href)}); await generateFontArtifacts(${JSON.stringify(resolve('public/ttf/Roboto-Regular.ttf'))});`
			],
			{ encoding: 'utf8' }
		);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain(
			'Space font build requires opentype.js and ttf2woff2'
		);
	});
	it('fails explicitly on missing source assets', async () => {
		const { generateFontArtifacts } =
			await import('../../srv/vite/font/index');
		await expect(
			generateFontArtifacts('/missing/space-font.ttf')
		).rejects.toThrow();
	});
});
