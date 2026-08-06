import type { FastifyRequest, FastifyReply } from 'fastify';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

const buckets = new Map<string, { count: number; resetAt: number }>();

const clientKey = (request: FastifyRequest) => request.ip || 'unknown';

const sweep = (now: number) => {
	for (const [key, bucket] of buckets) {
		if (bucket.resetAt <= now) buckets.delete(key);
	}
};

const isRateLimited = (request: FastifyRequest) => {
	const now = Date.now();
	if (buckets.size > 5000) sweep(now);

	const key = clientKey(request);
	const bucket = buckets.get(key);

	if (!bucket || bucket.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return false;
	}

	bucket.count += 1;
	return bucket.count > MAX_REQUESTS;
};

const isForeignOrigin = (request: FastifyRequest) => {
	const origin = request.headers.origin;
	if (!origin) return false;

	const host = request.headers.host;
	if (!host) return true;

	try {
		return new URL(origin).host !== host;
	} catch {
		return true;
	}
};

const rejectUntrustedRequest = (
	request: FastifyRequest,
	reply: FastifyReply
): boolean => {
	if (isForeignOrigin(request)) {
		reply
			.code(403)
			.send({ error: 'Cross-origin requests are not allowed' });
		return true;
	}

	if (isRateLimited(request)) {
		reply
			.code(429)
			.header('retry-after', String(Math.ceil(WINDOW_MS / 1000)))
			.send({ error: 'Too many requests' });
		return true;
	}

	return false;
};

export { rejectUntrustedRequest };
