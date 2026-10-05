export interface SpaceConfig {
	mode: 'server' | 'static';
	wispUrl: string | null;
	apiOrigin: string | null;
	buildId: string;
}
declare const __SPACE_CONFIG__: SpaceConfig | undefined;
declare const __SPACE_WISP_DOMAINS__: readonly string[] | undefined;

export function validateWispUrl(value: string, secure = false): string {
	const url = new URL(value);
	if (
		!(secure
			? url.protocol === 'wss:'
			: ['ws:', 'wss:'].includes(url.protocol)) ||
		url.username ||
		url.password ||
		url.hash
	) {
		throw new Error(
			'Wisp endpoint must be a credential-free WebSocket URL (wss: for static builds)'
		);
	}
	return value;
}

export function validateConfig(config: SpaceConfig): SpaceConfig {
	if (!['server', 'static'].includes(config.mode))
		throw new Error('Invalid SPACE_BUILD_MODE');
	if (!config.buildId?.trim() || /[\r\n\x00]/.test(config.buildId))
		throw new Error('Invalid SPACE_BUILD_ID');
	if (config.wispUrl !== null)
		validateWispUrl(config.wispUrl, config.mode === 'static');
	let apiOrigin = config.apiOrigin;
	if (apiOrigin !== null) {
		const url = new URL(apiOrigin);
		if (
			!['http:', 'https:'].includes(url.protocol) ||
			url.username ||
			url.password ||
			url.pathname !== '/' ||
			url.search ||
			url.hash
		) {
			throw new Error(
				'API origin must be a credential-free HTTP(S) origin without a path, query or fragment'
			);
		}
		apiOrigin = url.origin;
	}
	// Deliberate allowlist: never spread environment or unknown configuration fields.
	return {
		mode: config.mode,
		wispUrl: config.wispUrl,
		apiOrigin,
		buildId: config.buildId
	};
}

export function configFromEnv(
	env: Record<string, string | undefined>
): SpaceConfig {
	return validateConfig({
		mode: (env.SPACE_BUILD_MODE ?? 'server') as SpaceConfig['mode'],
		wispUrl: env.SPACE_WISP_URL || null,
		apiOrigin: env.SPACE_API_ORIGIN || null,
		buildId: env.SPACE_BUILD_ID ?? 'development'
	});
}

export function getSpaceConfig(): SpaceConfig {
	// A mirror may install this nonsecret configuration before bootstrap. This
	// changes only Space's selected endpoint, never arbitrary game WebSockets.
	const override = (
		globalThis as typeof globalThis & {
			__SPACE_RUNTIME_CONFIG__?: SpaceConfig;
		}
	).__SPACE_RUNTIME_CONFIG__;
	if (override !== undefined) return validateConfig(override);
	return validateConfig(
		typeof __SPACE_CONFIG__ === 'undefined'
			? configFromEnv({})
			: __SPACE_CONFIG__!
	);
}

export function validateWispDomains(
	domains: readonly string[]
): readonly string[] {
	if (
		domains.some(
			domain =>
				!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(
					domain
				)
		)
	) {
		throw new Error('Invalid generated Wisp domain configuration');
	}
	return domains;
}

export function getWispDomains(): readonly string[] {
	return typeof __SPACE_WISP_DOMAINS__ === 'undefined'
		? ['nightwisp.me']
		: __SPACE_WISP_DOMAINS__!;
}
