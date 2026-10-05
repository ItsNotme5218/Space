import { assetUrl } from '../../runtime/asset-url';

/** Local covers belong to the deployment; remote covers belong to the proxy. */
export function imageUrl(path: string): string {
	if (!path) return '';
	const pageUrl = window.location.href;
	const resolved = assetUrl(path, pageUrl);
	const image = new URL(resolved);
	if (
		!/^https?:$/.test(image.protocol) ||
		image.origin === new URL(pageUrl).origin
	) {
		return resolved;
	}
	const runtime = window.proxy;
	// The delegated host's DOM hooks rewrite external image requests themselves.
	if (runtime?.mode === 'delegated') return resolved;
	if (runtime?.mode !== 'standalone') return '';
	// Only the runtime knows the registered controller AND frame identity.
	return runtime.imageUrl?.(resolved) ?? '';
}
