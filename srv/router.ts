import type { FastifyInstance } from 'fastify';
import path from 'path';
import fastifyStatic from '@fastify/static';
import { APIRouter } from './api';

const __dirname = process.cwd();

const frontendPath = path.join(__dirname, 'dist');

async function router(fastify: FastifyInstance) {
	// i think this shoulf work, but idfk
	await fastify.register(fastifyStatic, {
		root: frontendPath,
		prefix: '/',
		index: ['index.html'],
		extensions: ['html'],
		setHeaders: (res, path) => {
			if (path.includes('/res/g/')) {
				res.setHeader(
					'Cache-Control',
					'public, max-age=31536000, immutable'
				);
			}
		}
	});

	await APIRouter(fastify);
	// removed atm because gotta learn react router
	/*fastify.setNotFoundHandler(
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply
        .status(404)
        .sendFile("error/index.html", path.join(__dirname, "dist/internal"));
    },
  );*/
}

export { router };
export default router;
