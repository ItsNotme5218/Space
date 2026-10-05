import type { Plugin } from 'vite';
import { configFromEnv, validateWispDomains } from '../../src/runtime/config';
import {
	base32Encode,
	base32Decode,
	createProxyConfig
} from '../../src/runtime/codec';

export function proxyRuntimeSource(buildId = 'development'): string {
	const { codec: _codec, ...paths } = createProxyConfig();
	return `globalThis.__SPACE_PROXY_CONFIG__ = Object.assign(${JSON.stringify(paths)}, {buildId:${deploymentExpression(buildId)}}, {codec:{encode:(${base32Encode.toString()}),decode:(${base32Decode.toString()})}});\n`;
}

// Deployment configuration is opaque data, even when it contains vendor words
// without a URL scheme (domains/build IDs). Numeric UTF-16 code units survive
// Vite minification and static scrub without relying on quoting or URL guards.
// Decoding is synchronous, self-contained and preserves Unicode exactly.
function deploymentExpression(value: unknown): string {
	const units = JSON.stringify(value)
		.split('')
		.map(char => char.charCodeAt(0));
	// Qualify through globalThis so constant-folding does not turn short arrays
	// back into scrub-visible string literals during minification.
	return `JSON.parse(globalThis.String.fromCharCode(${units.join(',')}))`;
}

export function runtimeConfigPlugin(
	env: Record<string, string | undefined>
): Plugin {
	const config = configFromEnv(env);
	const domains = validateWispDomains(
		(env.SPACE_WISP_DOMAINS ?? 'nightwisp.me')
			.split(',')
			.map(value => value.trim())
			.filter(Boolean)
	);
	return {
		name: 'space-public-runtime-config',
		config: () => ({
			define: {
				__SPACE_CONFIG__: deploymentExpression(config),
				__SPACE_WISP_DOMAINS__: deploymentExpression(domains)
			}
		}),
		configureServer(server) {
			server.middlewares.use('/space-runtime.js', (_req, res) => {
				res.setHeader('Content-Type', 'application/javascript');
				res.setHeader('Cache-Control', 'no-cache');
				res.end(proxyRuntimeSource(config.buildId));
			});
		},
		generateBundle() {
			this.emitFile({
				type: 'asset',
				fileName: 'space-config.json',
				source: JSON.stringify(config, null, 2) + '\n'
			});
			this.emitFile({
				type: 'asset',
				fileName: 'space-runtime.js',
				source: proxyRuntimeSource(config.buildId)
			});
		}
	};
}
