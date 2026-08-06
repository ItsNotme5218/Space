import type { FastifyRequest, FastifyReply } from 'fastify';
import { rejectUntrustedRequest } from './guard';

const UPSTREAM = 'https://demoplussrv.night-x.com';

const authHandler = async (request: FastifyRequest, reply: FastifyReply) => {
	if (rejectUntrustedRequest(request, reply)) return;

	const target = new URL(request.url || '/', UPSTREAM);
	if (target.origin !== UPSTREAM) {
		reply.code(400).send({ error: 'Invalid request path' });
		return;
	}
	const targetUrl = target.toString();

	const headers: Record<string, string> = {
		'User-Agent': request.headers['user-agent'] || 'DDXProxy/2.0'
	};

	const headersToForward = ['authorization', 'content-type', 'accept'];
	headersToForward.forEach(header => {
		if (request.headers[header]) {
			headers[header] = request.headers[header] as string;
		}
	});

	try {
		const response = await fetch(targetUrl, {
			method: request.method,
			headers,
			body:
				request.method !== 'GET' && request.method !== 'HEAD'
					? JSON.stringify(request.body)
					: undefined
		});

		const data = await response.text();

		reply
			.code(response.status)
			.header(
				'content-type',
				response.headers.get('content-type') || 'application/json'
			)
			.send(data);
	} catch (error) {
		console.error('Auth proxy error:', error);
		reply.code(500).send({ error: 'Proxy request failed' });
	}
};

export { authHandler };
export default authHandler;
