import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// Exercise the exact installed engine's response-body implementation, not a
// fake controller that incorrectly assumes SVG documents receive HTML hooks.
// Dependencies unused by the SVG branch are traps, so an unexpected branch
// cannot accidentally appear to pass. No application implementation is added.
function installedRewriteBody(relativeRoot: string) {
	const path = fileURLToPath(
		new URL(
			`${relativeRoot}/node_modules/@mercuryworkshop/scramjet/dist/scramjet.js.map`,
			import.meta.url
		)
	);
	const map = JSON.parse(readFileSync(path, 'utf8')) as {
		sources: string[];
		sourcesContent: string[];
	};
	const body =
		map.sourcesContent[
			map.sources.findIndex(name => name.endsWith('/fetch/body.ts'))
		];
	const mime =
		map.sourcesContent[
			map.sources.findIndex(name => name.endsWith('/shared/mime.ts'))
		];
	if (!body || !mime)
		throw new Error(`Installed engine source maps missing: ${path}`);
	const withoutImports = (source: string) =>
		source.replace(/^import\s[\s\S]*?from\s+["'][^"']+["'];/gm, '');
	const compile = (source: string) =>
		ts.transpileModule(withoutImports(source), {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2022
			}
		}).outputText;
	const mimeExports: Record<string, unknown> = {};
	runInNewContext(compile(mime), { exports: mimeExports, _Set: Set });
	const exports: Record<string, any> = {};
	runInNewContext(compile(body), {
		exports,
		isHtmlMimeType: mimeExports.isHtmlMimeType,
		_TextDecoder: TextDecoder,
		rewriteHtml: () => {
			throw new Error('HTML rewriter reached: add a full HTML fixture');
		}
	});
	return exports.rewriteBody;
}

describe('installed engine SVG document-start compatibility gate', () => {
	for (const [host, root] of [
		['Space', '../..'],
		['Daydream', '../../..'],
		['Nebula', '../../../Nebula']
	] as const) {
		it(`${host}: native SVG body is passed through (host response hook must adapt it)`, async () => {
			const svg =
				'<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="100%" height="100%"><iframe xmlns="http://www.w3.org/1999/xhtml" src="./index.html?view=games"/></foreignObject></svg>';
			const response = new Response(svg, {
				headers: { 'content-type': 'image/svg+xml' }
			});
			const result = await installedRewriteBody(root)(
				{},
				{},
				{
					destination: 'iframe',
					url: new URL('https://space.example/index.svg'),
					meta: { origin: new URL('https://space.example/index.svg') }
				},
				response
			);
			const output =
				result instanceof ReadableStream
					? await new Response(result).text()
					: String(result);
			// Without a rewrite, this relative URL resolves against the host's
			// encoded proxy route, not Space's canonical HTML document.
			expect(output).toBe(svg);
		});
	}
});
