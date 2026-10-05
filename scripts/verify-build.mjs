import { resolve } from 'node:path';
import { tsImport } from 'tsx/esm/api';

const load = path =>
	typeof globalThis.Bun !== 'undefined'
		? import(path)
		: tsImport(path, import.meta.url);
const { assertArtifacts } = await load('../srv/vite/assert-artifacts.ts');
const { verifyManifest } = await load('../srv/vite/manifest.ts');
const outDir = resolve(process.argv[2] ?? 'dist');
await assertArtifacts(outDir, { finalized: true });
await verifyManifest(outDir);
console.log('[space:verify] artifacts and full final-byte manifest verified');
