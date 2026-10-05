// SPDX-License-Identifier: AGPL-3.0-only
// Generator adapted from Nebula src/utils/values.ts (Nebula contributors).
// Modified for Space on 2026-09-30; see LICENSE. No warranty of endpoint availability.
import {
	validateConfig,
	validateWispDomains,
	validateWispUrl,
	type SpaceConfig
} from './config';

export const WISP_PROBE_TIMEOUT = 5000;

async function boundedProbe(
	url: string,
	ping: (url: string) => Promise<boolean>
): Promise<boolean> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			Promise.resolve()
				.then(() => ping(url))
				.catch(() => false),
			new Promise<boolean>(resolve => {
				timer = setTimeout(() => resolve(false), WISP_PROBE_TIMEOUT);
			})
		]);
	} finally {
		clearTimeout(timer);
	}
}

/** Called only by standalone Proxy startup, never by delegated selection. */
export async function resolveWisp(
	config: SpaceConfig,
	saved: string | null,
	deps: { ping(url: string): Promise<boolean>; generate(): string }
): Promise<string> {
	validateConfig(config);
	if (saved) return validateWispUrl(saved);
	if (config.mode === 'server') {
		return (
			config.wispUrl ??
			`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/w/`
		);
	}
	if (config.wispUrl) {
		if (await boundedProbe(config.wispUrl, deps.ping))
			return config.wispUrl;
		throw new Error(
			'The configured Wisp endpoint is unreachable; check deployment configuration'
		);
	}
	for (let attempt = 0; attempt < 5; attempt++) {
		const candidate = validateWispUrl(deps.generate(), true);
		if (await boundedProbe(candidate, deps.ping)) return candidate;
	}
	throw new Error(
		'No generated Wisp endpoint was reachable after five attempts; configure SPACE_WISP_URL'
	);
}

// Generation is a convenience, not an availability guarantee.
export function generateWisp(domains: readonly string[]): string {
	validateWispDomains(domains);
	if (!domains.length)
		throw new Error(
			'No generated Wisp domains configured; configure SPACE_WISP_URL'
		);
	const random = Array.from(
		crypto.getRandomValues(new Uint8Array(16)),
		byte => byte.toString(36)
	)
		.join('')
		.slice(0, 32);
	const domain = domains[Math.floor(Math.random() * domains.length)];
	return `wss://${random}.${domain}.cdn.cloudflare.net/wisp/`;
}

/** Reachability only: socket open does NOT establish end-to-end Wisp compatibility. */
export function probeWisp(url: string): Promise<boolean> {
	return new Promise(resolve => {
		let socket: WebSocket | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let done = false;
		const finish = (ok: boolean) => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			socket?.removeEventListener('open', opened);
			socket?.removeEventListener('error', failed);
			socket?.removeEventListener('close', failed);
			try {
				socket?.close();
			} catch {
				/* already closed */
			}
			resolve(ok);
		};
		const opened = () => finish(true);
		const failed = () => finish(false);
		try {
			socket = new WebSocket(validateWispUrl(url));
			socket.addEventListener('open', opened);
			socket.addEventListener('error', failed);
			socket.addEventListener('close', failed);
			timer = setTimeout(failed, WISP_PROBE_TIMEOUT);
		} catch {
			finish(false);
		}
	});
}
