// Adapted from Nebula build/font/index.ts (Nebula contributors, AGPL-3.0).
// Modified for Space, 2026-09-30: deterministic timestamps, content identity,
// strict build failures and root-scoped React-safe presentation. See NOTICE.md.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);
export interface FontArtifacts {
	fontName: string;
	mappingName: string;
	woff2: Buffer;
	mapping: string;
}

// opentype 2 ignores createdTimestamp: 0 and always writes the current modified
// timestamp. Normalize BOTH in the emitted sfnt, then repair its checksums.
function normalizeTimestamps(font: Buffer): Buffer {
	const checksum = (bytes: Buffer) => {
		let sum = 0;
		for (let i = 0; i < bytes.length; i += 4) {
			let word = 0;
			for (let j = 0; j < 4; j++) word = (word << 8) | (bytes[i + j] || 0);
			sum = (sum + (word >>> 0)) >>> 0;
		}
		return sum;
	};
	for (let i = 0; i < font.readUInt16BE(4); i++) {
		const record = 12 + i * 16;
		if (font.toString('ascii', record, record + 4) !== 'head') continue;
		const offset = font.readUInt32BE(record + 8);
		const length = font.readUInt32BE(record + 12);
		font.fill(0, offset + 20, offset + 36);
		font.writeUInt32BE(0, offset + 8);
		font.writeUInt32BE(checksum(font.subarray(offset, offset + length)), record + 4);
		font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, offset + 8);
		return font;
	}
	throw new Error('Generated font lacks a head table');
}

export async function generateFontArtifacts(fontPath: string): Promise<FontArtifacts> {
	let opentype, convert;
	try {
		opentype = require('opentype.js');
		const converter = require('ttf2woff2');
		convert = converter.default || converter;
	} catch (cause) {
		throw new Error('Space font build requires opentype.js and ttf2woff2 (install build dependencies)', { cause });
	}
	const input = await readFile(fontPath);
	const source = opentype.parse(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
	// Fixed mulberry32 seed, borrowed from Nebula. No random or clock-based mapping.
	let seed = 0x9e3779b1;
	const shuffled = Array.from({ length: 95 }, (_, i) => 0xe000 + i);
	for (let i = shuffled.length - 1; i > 0; i--) {
		seed = (seed + 0x6d2b79f5) | 0;
		let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
		const j = Math.floor((((value ^ (value >>> 14)) >>> 0) / 4294967296) * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	const encode: Record<string, string> = {};
	const decode: Record<string, string> = {};
	const glyphs = [new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 500, path: new opentype.Path() })];
	for (let i = 0; i < 95; i++) {
		const plain = String.fromCharCode(32 + i);
		const codepoint = plain === ' ' ? 32 : shuffled[i];
		const encoded = String.fromCodePoint(codepoint);
		const glyph = source.charToGlyph(plain);
		if (!glyph || glyph.index === 0) throw new Error(`Source font lacks glyph ${JSON.stringify(plain)}`);
		encode[plain] = encoded;
		decode[encoded] = plain;
		glyphs.push(new opentype.Glyph({ name: `space_${i}`, unicode: codepoint, advanceWidth: glyph.advanceWidth, path: glyph.path }));
	}
	const generated = new opentype.Font({
		familyName: 'SpacePresentation', styleName: 'Regular',
		unitsPerEm: source.unitsPerEm, ascender: source.ascender, descender: source.descender,
		glyphs, createdTimestamp: 1,
		copyright: 'Copyright 2015 Google Inc. All Rights Reserved. Modified for Space 2026-09-30.',
		license: 'Licensed under the Apache License, Version 2.0',
		licenseURL: 'https://www.apache.org/licenses/LICENSE-2.0',
		designer: 'Christian Robertson', manufacturer: 'Google Inc.',
		trademark: 'Roboto is a trademark of Google.',
	});
	const woff2 = Buffer.from(convert(normalizeTimestamps(Buffer.from(generated.toArrayBuffer()))));
	const identity = createHash('sha256').update(woff2).update(JSON.stringify({ encode, decode })).digest('hex').slice(0, 16);
	const fontName = `fonts/space-${identity}.woff2`;
	const mappingName = `fonts/space-${identity}.json`;
	const mapping = JSON.stringify({ version: 1, font: fontName, encode, decode });
	return { fontName, mappingName, woff2, mapping };
}

export function fontObfuscationPlugin(): Plugin {
	let root = process.cwd();
	let artifacts: Promise<FontArtifacts> | undefined;
	const generate = () => artifacts ||= generateFontArtifacts(resolve(root, 'public/ttf/Roboto-Regular.ttf'));
	return {
		name: 'space-font-presentation',
		configResolved(config) { root = config.root; },
		configureServer(server) {
			server.middlewares.use(async (request, response, next) => {
				const pathname = request.url?.split('?')[0];
				if (pathname !== '/space-fonts.json' && !pathname?.startsWith('/fonts/space-')) return next();
				try {
					const assets = await generate();
					if (pathname !== '/space-fonts.json' && pathname !== `/${assets.mappingName}` && pathname !== `/${assets.fontName}`) return next();
					response.setHeader('Cache-Control', pathname === '/space-fonts.json' ? 'no-cache' : 'public, max-age=31536000, immutable');
					response.setHeader('Content-Type', pathname.endsWith('.woff2') ? 'font/woff2' : 'application/json');
					response.end(pathname.endsWith('.woff2') ? assets.woff2 : assets.mapping);
				} catch (error) { next(error); }
			});
		},
		async generateBundle() {
			const assets = await generate();
			this.emitFile({ type: 'asset', fileName: assets.fontName, source: assets.woff2 });
			this.emitFile({ type: 'asset', fileName: assets.mappingName, source: assets.mapping });
		},
		// The runtime import is tied to the content-addressed mapping, never a
		// stable JSON name under Space server's immutable cache policy.
		resolveId(id) { if (id === 'virtual:space-font-mapping') return '\0space-font-mapping'; },
		async load(id) {
			if (id !== '\0space-font-mapping') return;
			const assets = await generate();
			return `export default ${JSON.stringify(assets.mappingName)};`;
		},
	};
}
