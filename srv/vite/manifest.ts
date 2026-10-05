export interface SpaceManifest {
	version: 1;
	buildId: string;
	entry: string;
	worker: string;
	assets: {
		path: string;
		sha256: string;
		contentType: string;
		size: number;
	}[];
}
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { relative, extname, join } from 'node:path';
import { walkFiles } from './scrub';

export function contentType(path: string): string {
	const types: Record<string, string> = {
		'.html': 'text/html',
		'.svg': 'image/svg+xml',
		'.js': 'application/javascript',
		'.mjs': 'application/javascript',
		'.css': 'text/css',
		'.json': 'application/json',
		'.wasm': 'application/wasm',
		'.woff2': 'font/woff2',
		'.woff': 'font/woff',
		'.ttf': 'font/ttf',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.webp': 'image/webp',
		'.ico': 'image/x-icon',
		'.txt': 'text/plain'
	};
	return types[extname(path).toLowerCase()] ?? 'application/octet-stream';
}
function assertPath(path: string): void {
	if (
		!path.startsWith('/') ||
		path.startsWith('//') ||
		/[\\?#\x00]/.test(path) ||
		path
			.slice(1)
			.split('/')
			.some(part => ['.', '..', ''].includes(part)) ||
		/%(?:2e|2f|5c)/i.test(path)
	)
		throw new Error(`Invalid manifest path: ${path}`);
}
export async function writeManifest(
	dir: string,
	buildId: string
): Promise<SpaceManifest> {
	const assets: SpaceManifest['assets'] = [];
	for (const file of await walkFiles(dir)) {
		const path = '/' + relative(dir, file).split('\\').join('/');
		if (path === '/space-manifest.json') continue;
		assertPath(path);
		const bytes = await readFile(file);
		assets.push({
			path,
			sha256: createHash('sha256').update(bytes).digest('hex'),
			contentType: contentType(path),
			size: bytes.length
		});
	}
	const manifest: SpaceManifest = {
		version: 1,
		buildId,
		entry: '/index.svg',
		worker: '/sw.js',
		assets
	};
	await writeFile(
		join(dir, 'space-manifest.json'),
		JSON.stringify(manifest, null, 2) + '\n'
	);
	return manifest;
}
export async function verifyManifest(dir: string): Promise<void> {
	const manifest: SpaceManifest = JSON.parse(
		await readFile(join(dir, 'space-manifest.json'), 'utf8')
	);
	if (
		manifest.version !== 1 ||
		!manifest.buildId?.trim() ||
		manifest.entry !== '/index.svg' ||
		manifest.worker !== '/sw.js' ||
		!Array.isArray(manifest.assets)
	)
		throw new Error('Invalid Space manifest');
	const paths = new Set<string>();
	for (const asset of manifest.assets) {
		assertPath(asset.path);
		if (paths.has(asset.path) || asset.path === '/space-manifest.json')
			throw new Error('Duplicate/self manifest path');
		paths.add(asset.path);
		const bytes = await readFile(join(dir, asset.path.slice(1)));
		if (
			asset.size !== bytes.length ||
			asset.sha256 !== createHash('sha256').update(bytes).digest('hex')
		)
			throw new Error(`Manifest hash mismatch: ${asset.path}`);
		if (asset.contentType !== contentType(asset.path))
			throw new Error(`Manifest MIME mismatch: ${asset.path}`);
	}
	const emitted = (await walkFiles(dir))
		.map(file => '/' + relative(dir, file).split('\\').join('/'))
		.filter(path => path !== '/space-manifest.json');
	if (
		paths.size !== emitted.length ||
		emitted.some(path => !paths.has(path)) ||
		!paths.has(manifest.entry) ||
		!paths.has(manifest.worker)
	)
		throw new Error('Incomplete manifest coverage');
}
