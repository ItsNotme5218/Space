import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('Vite development document routing', () => {
	let server: ViteDevServer | undefined;
	let cacheDir: string;
	let origin: string;

	beforeAll(async () => {
		cacheDir = await mkdtemp(join(tmpdir(), 'space-dev-routing-'));
		server = await createServer({
			root,
			configFile: resolve(root, 'vite.config.ts'),
			cacheDir,
			// Keep any plugin close hooks away from existing build artifacts.
			build: { outDir: resolve(cacheDir, 'dist') },
			logLevel: 'error',
			// Exercise the real config and middleware without booting browser code,
			// warming application modules, or contacting runtime metadata services.
			optimizeDeps: { noDiscovery: true, include: [], entries: [] },
			server: {
				host: '127.0.0.1',
				port: 0,
				hmr: false,
				watch: null,
				warmup: { clientFiles: [] },
				preTransformRequests: false
			}
		});
		await server.listen();
		const address = server.httpServer?.address();
		if (!address || typeof address === 'string')
			throw new Error('Vite did not bind a test port');
		origin = `http://127.0.0.1:${address.port}`;
	}, 30000);

	afterAll(async () => {
		await server?.close();
		if (cacheDir) await rm(cacheDir, { recursive: true, force: true });
	});

	it.each(['/', '/index.html', '/index.html?view=games', '/newtab.html'])(
		'serves existing HTML entry %s',
		async path => {
			const response = await fetch(origin + path, {
				headers: { Accept: 'text/html' }
			});
			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toContain('text/html');
			expect(await response.text()).toContain('<html');
		}
	);

	it('serves the SVG host independently of HTML fallback', async () => {
		const response = await fetch(origin + '/index.svg');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('image/svg+xml');
		expect(await response.text()).toContain('<svg');
	});

	it.each(['text/html', '*/*'])(
		'returns 404 for a missing HTML document with Accept: %s',
		async accept => {
			const response = await fetch(
				`${origin}/missing-${randomUUID()}.html`,
				{ headers: { Accept: accept } }
			);
			expect(response.status).toBe(404);
		}
	);

	it('returns 404 for an unknown browser pathname instead of the app shell', async () => {
		const response = await fetch(origin + '/missingroute', {
			headers: { Accept: 'text/html' }
		});
		expect(response.status).toBe(404);
	});
});
