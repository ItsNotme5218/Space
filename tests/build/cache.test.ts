import { expect, test, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import Fastify from 'fastify';

// Only optional backend routes are out of scope. Exercise the real static
// router/plugin and HTTP response headers, not a mocked cache function.
vi.mock('../../srv/api', () => ({ APIRouter: async () => {} }));
test('actual server revalidates worker/config/manifest and caches hashed assets', async () => {
	const root = await mkdtemp('/tmp/opencode/space-cache-');
	await mkdir(`${root}/dist/assets`, { recursive: true });
	for (const path of [
		'sw.js',
		'space-config.json',
		'space-proxy.js',
		'space-manifest.json',
		'assets/main-Ab12cd34.js'
	])
		await writeFile(`${root}/dist/${path}`, path);
	const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
	const server = Fastify();
	try {
		const { router } = await import('../../srv/router');
		await router(server);
		for (const path of [
			'sw.js',
			'space-config.json',
			'space-proxy.js',
			'space-manifest.json'
		]) {
			const response = await server.inject(`/${path}`);
			expect(response.statusCode).toBe(200);
			expect(response.headers['cache-control']).toBe('no-cache');
		}
		expect(
			(await server.inject('/assets/main-Ab12cd34.js')).headers[
				'cache-control'
			]
		).toContain('immutable');
	} finally {
		await server.close();
		cwd.mockRestore();
	}
});
