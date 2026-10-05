import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tsImport } from 'tsx/esm/api';

const { finalizeBuild } =
	typeof globalThis.Bun !== 'undefined'
		? await import('../srv/vite/finalize.ts')
		: await tsImport('../srv/vite/finalize.ts', import.meta.url);
const dir = resolve(process.argv[2] ?? 'dist');
const config = JSON.parse(
	await readFile(resolve(dir, 'space-config.json'), 'utf8')
);
await finalizeBuild(dir, config);
