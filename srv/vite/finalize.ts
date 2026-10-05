import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, dirname } from 'node:path';
import type { SpaceConfig } from '../../src/runtime/config';
import { validateConfig } from '../../src/runtime/config';
import { spaceScrub, walkFiles } from './scrub';
import { assertArtifacts, cacheControl } from './assert-artifacts';
import { writeManifest, verifyManifest } from './manifest';

// Some installed transports embed their WASM but retain an alternate URL
// branch without shipping that file. Emit the identical valid payload at the
// fallback URL, rather than ignoring the unresolved reference during checks.
export async function materializeWasmFallbacks(outDir: string): Promise<void> {
	for (const file of await walkFiles(outDir)) {
		if (!/\.[cm]?js$/.test(file)) continue;
		const source = await readFile(file, 'utf8');
		const fallback = [
			...source.matchAll(
				/new URL\(\s*['"]([^'"/]+\.wasm)['"]\s*,\s*import\.meta\.url\s*\)/g
			)
		];
		if (!fallback.length) continue;
		const payloads = [
			...source.matchAll(/(['"`])(AGFzbQ[A-Za-z0-9+/]*={0,2})\1/g)
		].map(match => Buffer.from(match[2]!, 'base64'));
		if (payloads.length !== 1 || !WebAssembly.validate(payloads[0]!))
			throw new Error(`Cannot resolve embedded WASM fallback: ${file}`);
		for (const match of fallback) {
			const target = join(dirname(file), match[1]!);
			try {
				const existing = await readFile(target);
				if (!existing.equals(payloads[0]!))
					throw new Error(`Conflicting WASM fallback: ${target}`);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
					throw error;
				await writeFile(target, payloads[0]!);
			}
		}
	}
}

// Vite's hashes describe pre-scrub bytes. Use a deterministic final-graph
// identity (not a cyclic per-chunk hash) so changing the scrub seed or any
// emitted byte cannot reuse an immutable chunk URL with different contents.
export async function addressFinalAssets(outDir: string): Promise<void> {
	const files = await walkFiles(outDir);
	const hash = createHash('sha256');
	for (const file of files) {
		const name = relative(outDir, file);
		if (['_headers', 'space-manifest.json'].includes(name)) continue;
		const bytes = await readFile(file);
		hash.update(JSON.stringify([name, bytes.length])).update(bytes);
	}
	const identity = hash.digest('hex').slice(0, 16);
	const changes = new Map<string, string>();
	for (const file of files) {
		const name = relative(outDir, file);
		if (!name.startsWith('assets/')) continue;
		const match = name.match(/^(.*)-([A-Za-z0-9_-]{8})(\.[^.]+)$/);
		// Rename the one generic Vite chunk label as a FILE identity only. A
		// global "proxy" replacement would corrupt bridge contracts and URLs.
		if (match) {
			const stem =
				match[1]!.slice(7) === 'proxy' ? 'runtime' : match[1]!.slice(7);
			changes.set(name.slice(7), `${stem}-${identity}${match[3]}`);
		}
	}
	if (new Set(changes.values()).size !== changes.size)
		throw new Error('Final asset identity collision');
	for (const file of files) {
		if (
			!/\.(?:[cm]?js|css|html|svg|json)$/.test(file) ||
			/[/\\]fonts[/\\]/.test(file)
		)
			continue;
		const source = await readFile(file, 'utf8');
		// Rewrite only non-remote spans, retaining external URL bytes verbatim.
		const wired = source
			.split(/((?:https?:|wss?:)?\/\/[^\s'"`<>\\]+)/g)
			.map((part, index) => {
				if (index % 2) return part;
				for (const [oldName, newName] of changes)
					part = part.split(oldName).join(newName);
				return part;
			})
			.join('');
		if (wired !== source) await writeFile(file, wired);
	}
	for (const [oldName, newName] of changes)
		await rename(
			join(outDir, 'assets', oldName),
			join(outDir, 'assets', newName)
		);
}

export async function wireRuntimeDefaults(outDir: string): Promise<void> {
	const paths: Record<string, string> = {
		'/scramjet/scramjet.js': '/s/scramjet.js',
		'/scramjet/scramjet.wasm': '/s/scramjet.wasm',
		'/controller/controller.inject.js': '/c/controller.inject.js'
	};
	for (const file of await walkFiles(outDir)) {
		if (!/\.[cm]?js$/.test(file)) continue;
		const source = await readFile(file, 'utf8');
		const wired = source.replace(
			/(['"])(\/[^'"\s]+)\1/g,
			(all, quote, path) =>
				paths[path] ? `${quote}${paths[path]}${quote}` : all
		);
		if (wired !== source) await writeFile(file, wired);
	}
}

// Called only after runtime copies and Vite's font/config/SVG emission finish.
export async function finalizeBuild(
	outDir: string,
	config: SpaceConfig
): Promise<void> {
	const emitted = validateConfig(
		JSON.parse(await readFile(join(outDir, 'space-config.json'), 'utf8'))
	);
	if (JSON.stringify(emitted) !== JSON.stringify(validateConfig(config)))
		throw new Error(
			'Finalizer configuration differs from emitted configuration'
		);
	await wireRuntimeDefaults(outDir);
	await materializeWasmFallbacks(outDir);
	const result = await spaceScrub(outDir);
	await addressFinalAssets(outDir);
	const headers = ['/*\n  Cache-Control: no-cache\n'];
	for (const file of await walkFiles(outDir)) {
		const path = '/' + relative(outDir, file);
		const policy = cacheControl(path);
		if (policy.includes('immutable'))
			headers.push(`${path}\n  Cache-Control: ${policy}\n`);
	}
	await writeFile(join(outDir, '_headers'), headers.join('\n'));
	await assertArtifacts(outDir, { finalized: true });
	await writeManifest(outDir, config.buildId);
	await verifyManifest(outDir);
	console.log(
		`[space:finalize] validated ${result.files} files; final-byte manifest emitted`
	);
}
