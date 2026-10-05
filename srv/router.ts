import type { FastifyInstance } from 'fastify';
import path from 'path';
import fastifyStatic from '@fastify/static';
import { APIRouter } from './api';
import { cacheControl } from './vite/assert-artifacts';

const __dirname = process.cwd();

const frontendPath = path.join(__dirname, 'dist');

async function router(fastify: FastifyInstance) {
	await fastify.register(fastifyStatic, {
		root: frontendPath,
		prefix: '/',
		index: ['index.html'],
		extensions: ['html'],
		cacheControl: false,
		setHeaders: (res, filePath) => {
			res.setHeader('Cache-Control', cacheControl(path.relative(frontendPath, filePath)));
		}
	});

	await APIRouter(fastify);
}

export { router };
export default router;
