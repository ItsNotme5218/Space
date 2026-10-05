import { expect, test } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join, normalize, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');

async function sourceFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		if (entry.name === 'node_modules') continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
		else if (/\.[cm]?[jt]s$/.test(entry.name)) files.push(path);
	}
	return files;
}

test('no source import escapes the Space package root', async () => {
	const offenders: string[] = [];
	for (const dir of ['srv', 'scripts']) {
		for (const file of await sourceFiles(join(ROOT, dir))) {
			const text = await readFile(file, 'utf8');
			for (const match of text.matchAll(
				/(?:import|export)[^'"]*['"]([^'"]+)['"]/g
			)) {
				const spec = match[1]!;
				if (!spec.startsWith('.')) continue;
				const resolved = normalize(
					join(file.slice(0, file.lastIndexOf('/')), spec)
				);
				if (!resolved.startsWith(ROOT + '/'))
					offenders.push(`${file}: ${spec}`);
			}
		}
	}
	expect(offenders).toEqual([]);
});
