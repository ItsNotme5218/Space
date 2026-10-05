import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
await build({
	root,
	configFile: false,
	publicDir: false,
	build: {
		outDir: 'public',
		emptyOutDir: false,
		minify: false,
		lib: {
			entry: fileURLToPath(
				new URL('../src/bridge/scramjet-adapter.ts', import.meta.url)
			),
			name: 'SpaceProxyContext',
			formats: ['es', 'iife'],
			fileName: format =>
				format === 'es'
					? 'proxy-context-host.js'
					: 'proxy-context-adapter.js'
		}
	}
});
await writeFile(
	new URL('../public/proxy-context-host.d.ts', import.meta.url),
	`export declare function installScramjetProxyContext(controller: unknown, adapterSource: string): () => void;
export declare function installDocument(token: string, win?: Window): void;
export declare function activeSvgEnvelope(svg: string): string | null;
export declare function spaceGamesUrl(origin: string): string;
`
);
