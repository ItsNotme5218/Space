// Adapted from Nebula/build/scrub.ts and Daydream's pure scrub helpers,
// AGPL-3.0. See BUILD_REFERENCE.md. No sibling runtime imports.
import { createHmac } from 'node:crypto';
import { readdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join, relative } from 'node:path';

// Shared engine members and controller RPC keys must be rewritten in every
// emitted realm, not only the vendor's global/filename. Do not include generic
// proxy/Wisp paths, display labels, or external bridge protocol constants.
export const SCRUB_WORDS = [
	'__SPACE_PROXY_CONFIG__',
	'proxy-context-adapter',
	'proxy-context-host',
	'proxy-settings',
	'space-proxy',
	'controller frame handle',
	'mercuryworkshop',
	'ultraviolet',
	'versionInfo',
	'rewriteUrl',
	'unrewrite',
	'scramjet',
	'libcurl',
	'$method',
	'$token',
	'$error',
	'$args',
	'$type',
	'$data',
	'epoxy',
	'scram',
	'bare'
] as const;
const TEXT = /\.(?:[cm]?js|css|html|svg|json|xml|webmanifest)$/i;
export function isDeveloperArtifact(path: string): boolean {
	return /\.map$|\.d\.[cm]?ts$|(?:^|[/\\])temp-types-build[/\\].*\.[cm]?js$/i.test(
		path
	);
}
export async function walkFiles(dir: string): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isSymbolicLink())
			throw new Error(`Symlink not allowed in build: ${path}`);
		if (entry.isDirectory()) files.push(...(await walkFiles(path)));
		else if (entry.isFile()) files.push(path);
	}
	return files.sort();
}
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function replaceWords(
	source: string,
	vocabulary: Record<string, string>
): string {
	for (const word of SCRUB_WORDS) {
		if (vocabulary[word])
			source = source.replace(
				new RegExp(escape(word), 'gi'),
				vocabulary[word]!
			);
	}
	return source;
}
// URLs and canonical base64 are opaque data, not executable identifiers.
// Preserve WASM ABI symbols too: validating a module alone cannot detect a
// renamed JS import/export interface. Fonts, images and WASM remain byte-exact.
export function scrubText(
	source: string,
	vocabulary: Record<string, string>,
	abi: readonly string[] = []
): string {
	const saved: string[] = [];
	let marker = '__SPACE_GUARD_';
	while (source.includes(marker)) marker += '_';
	const guard = (value: string) => `${marker}${saved.push(value) - 1}__`;
	let text = source.replace(
		/(?:https?:|wss?:)?\/\/[^\s'"`<>\\]+|(?:data:[^'"`]*;base64,)?[A-Za-z0-9+/]{256,}={0,2}/g,
		value =>
			guard(
				value.replace(
					/\$\{([^}]+)\}/g,
					(_all, expression) =>
						'${' + scrubText(expression, vocabulary, abi) + '}'
				)
			)
	);
	for (const symbol of ['scramjetPath', 'scramitize', ...abi])
		text = text.replace(new RegExp(escape(symbol), 'g'), guard);
	// Stable settings/wire keys are not renamed; their values survive reloads.
	text = text.replace(
		/(['"`])(?:epoxy|libcurl|Scramjet|Ultraviolet|Libcurl|Epoxy|Libcurl\.js|Epoxy TLS)\1/g,
		guard
	);
	text = text.replace(/(?<![\w/'"`])(?:epoxy|libcurl)(?![\w/\-])/g, guard);
	text = text.replace(/\b(?:Scramjet|Libcurl|Epoxy)(?=\s*:)/g, guard);
	text = replaceWords(text, vocabulary);
	return text.replace(
		new RegExp(`${marker}(\\d+)__`, 'g'),
		(_all, index) => saved[Number(index)]!
	);
}
function wasmSymbols(bytes: Uint8Array): string[] {
	const module = new WebAssembly.Module(new Uint8Array(bytes));
	return [
		...WebAssembly.Module.imports(module),
		...WebAssembly.Module.exports(module)
	].map(item => item.name);
}
export async function spaceScrub(
	dir: string,
	seed = process.env.SPACE_SCRUB_SEED ?? 'space-static-v1'
): Promise<{ vocabulary: Record<string, string>; files: number }> {
	// Both public/ sync and Vite's direct vendor copy emit runtime assets. Prune
	// after BOTH have finished, before deriving vocabulary or manifest hashes.
	// Delete only developer files; license/attribution documents remain intact.
	const staged = await walkFiles(dir);
	const files: string[] = [];
	for (const file of staged) {
		if (isDeveloperArtifact(file)) await unlink(file);
		else {
			files.push(file);
			if (/\.[cm]?js$/i.test(file)) {
				const source = await readFile(file, 'utf8');
				const clean = source
					.replace(
						/^[\t ]*\/\/[#@][\t ]*sourceMappingURL=[^\r\n]*$/gm,
						''
					)
					.replace(
						/^[\t ]*\/\*[#@][\t ]*sourceMappingURL=[^\r\n]*?\*\/[\t ]*$/gm,
						''
					);
				if (clean !== source) await writeFile(file, clean);
			}
		}
	}
	const sources = await Promise.all(files.map(file => readFile(file)));
	const corpus =
		sources.map(bytes => bytes.toString('utf8')).join('\n') +
		files.join('\n');
	const vocabulary: Record<string, string> = {};
	const used = new Set<string>();
	for (const word of SCRUB_WORDS) {
		for (let attempt = 0; attempt < 1024; attempt++) {
			const bytes = createHmac('sha256', seed)
				.update(`${word}#${attempt}`)
				.digest();
			const token = [...bytes.subarray(0, word.length)]
				.map(
					(byte, index) =>
						(index
							? 'abcdefghijklmnopqrstuvwxyz0123456789'
							: 'abcdefghijklmnopqrstuvwxyz')[
							byte % (index ? 36 : 26)
						]
				)
				.join('');
			if (
				corpus.toLowerCase().includes(token) ||
				used.has(token) ||
				SCRUB_WORDS.some(tell => token.includes(tell))
			)
				continue;
			vocabulary[word] = token;
			used.add(token);
			break;
		}
		if (!vocabulary[word])
			throw new Error(`Unable to derive scrub token: ${word}`);
	}
	const abi = new Set<string>();
	for (let i = 0; i < files.length; i++) {
		if (files[i]!.endsWith('.wasm'))
			for (const symbol of wasmSymbols(sources[i]!)) abi.add(symbol);
		if (/\.[cm]?js$/.test(files[i]!)) {
			for (const match of sources[i]!.toString('utf8').matchAll(
				/[A-Za-z0-9+/]{256,}={0,2}/g
			)) {
				const bytes = Buffer.from(match[0], 'base64');
				if (bytes.subarray(0, 4).equals(Buffer.from([0, 97, 115, 109])))
					for (const symbol of wasmSymbols(bytes)) abi.add(symbol);
			}
		}
	}
	const targetPaths = files.map(file =>
		replaceWords(relative(dir, file), vocabulary)
	);
	if (new Set(targetPaths).size !== files.length)
		throw new Error('Scrub rename collision');
	for (let i = 0; i < files.length; i++) {
		const file = files[i]!;
		// Content-addressed font mappings and public deployment settings are data,
		// not vendor source. Their filenames/contents must retain their identity.
		if (
			!TEXT.test(file) ||
			/[/\\]fonts[/\\]|[/\\]space-config\.json$/.test(file)
		)
			continue;
		await writeFile(
			file,
			scrubText(sources[i]!.toString('utf8'), vocabulary, [...abi])
		);
	}
	async function renameTree(root: string): Promise<void> {
		const entries = await readdir(root, { withFileTypes: true });
		for (const entry of entries)
			if (entry.isDirectory()) await renameTree(join(root, entry.name));
		for (const entry of entries) {
			const name = replaceWords(entry.name, vocabulary);
			if (name !== entry.name)
				await rename(join(root, entry.name), join(root, name));
		}
	}
	await renameTree(dir);
	for (let i = 0; i < files.length; i++) {
		if (TEXT.test(files[i]!)) continue;
		if (!(await readFile(join(dir, targetPaths[i]!))).equals(sources[i]!))
			throw new Error(`Binary changed during scrub: ${files[i]}`);
	}
	return { vocabulary, files: files.length };
}
