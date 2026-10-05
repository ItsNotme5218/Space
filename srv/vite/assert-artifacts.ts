import { readFile } from 'node:fs/promises';
import { join, relative, posix } from 'node:path';
import { runInNewContext } from 'node:vm';
import { walkFiles, isDeveloperArtifact } from './scrub';
import { FALLBACK_ASSET } from './analytics-inline';
import { validateConfig } from '../../src/runtime/config';
import { createEmbeddedSvg } from './svg-host';

export function cacheControl(path: string): string {
	return /(?:^|\/)(?:assets|fonts)\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|mjs|css|json|woff2?|ttf|otf|wasm|png|jpe?g|webp|svg|ico)$/.test(
		path
	)
		? 'public, max-age=31536000, immutable'
		: 'no-cache';
}

const REMOVED_RUNTIME_PATH =
	/^(?:u\/|uv\/|en\/|r\/|bare-mux\/|baremux\/|b\/(?:worker|bare|bare-mux|baremux)\b)/i;
const REMOVED_RUNTIME_TEXT =
	/(?:['"`]\/(?:u|uv|bare-mux|baremux)\/|['"`]\/b\/worker\.js|['"`]@titaniumnetwork-dev\/ultraviolet['"`]|['"`]@mercuryworkshop\/bare-mux['"`]|UVServiceWorker|__uv\$config|BareMux|bare-mux|baremux)/i;

// The bootstrap name and its global slot are build vocabulary, not an ABI.
// Discover the worker's first relative bootstrap import and identify its
// self-contained configuration by shape, never by a pre-scrub name.
export async function readWorkerRuntime(
	dir: string
): Promise<{ bootstrapPath: string; config: any; worker: string }> {
	const worker = await readFile(join(dir, 'sw.js'), 'utf8');
	const ref = worker.match(
		/\bimportScripts\(\s*(['"])(\.\/[^'"\s]+\.js)\1\s*\)/
	)?.[2];
	if (!ref)
		throw new Error('Worker missing relative runtime bootstrap import');
	const bootstrapPath = posix.normalize(ref);
	if (bootstrapPath.startsWith('../') || bootstrapPath.includes('\\'))
		throw new Error('Invalid worker bootstrap path');
	const context: any = { TextEncoder, TextDecoder };
	context.self = context;
	runInNewContext(await readFile(join(dir, bootstrapPath), 'utf8'), context, {
		timeout: 1000
	});
	const configs = Object.values(context).filter(
		(value: any) =>
			value &&
			typeof value.prefix === 'string' &&
			typeof value.scramjetPath === 'string' &&
			typeof value.wasmPath === 'string' &&
			typeof value.injectPath === 'string' &&
			typeof value.codec?.encode === 'function' &&
			typeof value.codec?.decode === 'function'
	);
	if (configs.length !== 1)
		throw new Error(
			'Worker bootstrap must expose one runtime configuration'
		);
	return { bootstrapPath, config: configs[0], worker };
}

export async function assertArtifacts(
	dir: string,
	options: { canonical?: boolean; finalized?: boolean } = {}
): Promise<void> {
	const files = await walkFiles(dir);
	const paths = new Set(
		files.map(file => relative(dir, file).split('\\').join('/'))
	);
	const check = (ref: string, from: string, root = false) => {
		if (
			!ref ||
			/^(?:[a-z]+:|\/\/|#)/i.test(ref) ||
			ref.includes('${') ||
			ref.includes('\\')
		)
			return;
		const clean = ref.split(/[?#]/)[0]!;
		const target = posix.normalize(
			clean.startsWith('/')
				? clean.slice(1)
				: posix.join(root ? '' : posix.dirname(from), clean)
		);
		if (target.startsWith('../') || !paths.has(target))
			throw new Error(`Missing asset ${ref} referenced by ${from}`);
	};
	for (const file of files) {
		const path = relative(dir, file).split('\\').join('/');
		if (
			options.finalized &&
			/(?:^|\/)[^/]*proxy[^/]*\.[cm]?js$/i.test(path)
		)
			throw new Error(`Finalized runtime tell filename: ${path}`);
		if (isDeveloperArtifact(path))
			throw new Error(`Developer artifact emitted: ${path}`);
		if (REMOVED_RUNTIME_PATH.test(path))
			throw new Error(`Removed proxy runtime artifact emitted: ${path}`);
		const bytes = await readFile(file);
		if (/\.wasm$/.test(path) && !WebAssembly.validate(bytes))
			throw new Error(`Invalid WASM: ${path}`);
		if (
			/\.woff2$/.test(path) &&
			(bytes.toString('ascii', 0, 4) !== 'wOF2' ||
				bytes.readUInt32BE(8) !== bytes.length)
		)
			throw new Error(`Invalid WOFF2: ${path}`);
		if (!/\.(?:[cm]?js|html|svg|css|json)$/.test(path)) continue;
		const text = bytes.toString('utf8');
		// External URL bytes and protocol strings are deliberately not scrubbed.
		const local = text.replace(/(?:https?:|wss?:)?\/\/[^\s'"`<>\\]+/g, '');
		if (
			options.finalized &&
			/\.(?:[cm]?js|html|svg)$/.test(path) &&
			/space-proxy\.js|proxy-context-(?:adapter|host)\.js|proxy-settings[^'"`\s]*\.js|__SPACE_PROXY_CONFIG__|\$scramjet(?:Controller|Utils)?\b/.test(
				local
			)
		)
			throw new Error(`Finalized runtime tell reference/global: ${path}`);
		if (REMOVED_RUNTIME_TEXT.test(text))
			throw new Error(`Removed proxy runtime reference emitted: ${path}`);
		// The analytics fallback is a verbatim third-party payload: its
		// internal strings are not bundle asset references.
		if (/\.[cm]?js$/.test(path) && path !== FALLBACK_ASSET) {
			for (const match of text.matchAll(
				/\b(?:import|export)\s*(?:\(\s*|[^;]*?\bfrom\s*)?['"]([^'"\n]+)['"]/g
			))
				if (/^(?:\.|\/)/.test(match[1]!)) check(match[1]!, path);
			// Vite emits lazy import targets using backticks too. Only static
			// templates are resolvable here; check() excludes ${...} interpolation.
			for (const match of text.matchAll(/\bimport\s*\(\s*`([^`\n]*)`/g))
				if (/^(?:\.|\/)/.test(match[1]!)) check(match[1]!, path);
			for (const match of text.matchAll(
				/['"]((?:\.\.?\/|\/)[^'"\s]+\.(?:[cm]?js|wasm|woff2?|json))['"]/g
			))
				check(match[1]!, path);
			for (const match of text.matchAll(
				/['"]((?:fonts|assets)\/[^'"\s]+\.(?:[cm]?js|wasm|woff2?|json))['"]/g
			))
				check(match[1]!, path, true);
			for (const call of text.matchAll(/\bimportScripts\(([^)]+)\)/g))
				for (const arg of call[1]!.matchAll(/['"]([^'"]+)['"]/g))
					check(arg[1]!, path);
			for (const match of text.matchAll(
				/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g
			))
				check(match[1]!, path);
		}
		if (/\.(?:html|svg)$/.test(path)) {
			for (const tag of text.matchAll(
				/<(?:script|link|img|iframe|image)\b[^>]*>/gi
			)) {
				for (const match of tag[0].matchAll(
					/(?:src|href)\s*=\s*['"]([^'"]+)['"]/g
				))
					check(match[1]!, path);
			}
		}
		if (/\.css$/.test(path))
			for (const match of text.matchAll(
				/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g
			))
				check(match[1]!, path);
		if (/^fonts\/.*\.json$/.test(path))
			check(JSON.parse(text).font, path, true);
	}
	if (options.canonical === false) return;
	for (const path of [
		'index.html',
		'index.svg',
		'newtab.html',
		'sw.js',
		'space-config.json'
	])
		if (!paths.has(path))
			throw new Error(`Missing canonical asset: ${path}`);
	const [svg, html] = await Promise.all([
		readFile(join(dir, 'index.svg'), 'utf8'),
		readFile(join(dir, 'index.html'), 'utf8')
	]);
	// Static SVGs are generated from the emitted HTML, matching Daydream's
	// standalone foreignObject build path rather than hosting an iframe.
	if (svg !== createEmbeddedSvg(html))
		throw new Error('Invalid canonical embedded SVG artifact');
	validateConfig(
		JSON.parse(await readFile(join(dir, 'space-config.json'), 'utf8'))
	);
	const {
		bootstrapPath,
		config: proxy,
		worker
	} = await readWorkerRuntime(dir);
	if (proxy?.prefix !== '/s/res/')
		throw new Error('Page/worker prefix mismatch');
	for (const path of [proxy.scramjetPath, proxy.wasmPath, proxy.injectPath])
		check(path, bootstrapPath);
	for (const url of [
		'https://test/雪/😀?q=a%20b#fragment',
		'https://test/?x=1&x=2'
	]) {
		const encode = runInNewContext(`(${proxy.codec.encode.toString()})`, {
			TextEncoder
		});
		const decode = runInNewContext(`(${proxy.codec.decode.toString()})`, {
			TextDecoder
		});
		if (decode(encode(url)) !== url)
			throw new Error('Page/worker codec mismatch');
	}
	if (!worker.includes("importScripts('./c/controller.sw.js')"))
		throw new Error('Worker missing relative runtime imports');
	const executable = (
		await Promise.all(
			files
				.filter(file => /\.[cm]?js$/.test(file))
				.map(file => readFile(file, 'utf8'))
		)
	).join('\n');
	for (const wire of [
		'proxy-context-v1',
		'nested-iframe-navigation',
		'document-fetch'
	])
		if (!executable.includes(wire))
			throw new Error(`Missing bridge wire constant: ${wire}`);
}
