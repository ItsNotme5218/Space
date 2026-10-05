const SOCIAL_BAR_URL = 'https://bauval.org/14/592dfab1692cc524d861443567c7b621';
const LEGACY_AD_URL =
	'https://pl29046858.profitablecpmratenetwork.com/59/2d/fa/592dfab1692cc524d861443567c7b621.js';

export function injectSpaceAds(
	doc: Document = document
): HTMLScriptElement | null {
	if (
		!doc.body ||
		(doc.defaultView && doc.defaultView !== doc.defaultView.top)
	)
		return null;
	const existing = doc.querySelector<HTMLScriptElement>(
		`script[src="${SOCIAL_BAR_URL}"]`
	);
	if (existing) return existing;

	const script = doc.createElement('script');
	script.src = SOCIAL_BAR_URL;
	script.setAttribute('data-cfasync', 'false');
	script.onerror = () => {
		if (doc.querySelector(`script[src="${LEGACY_AD_URL}"]`)) return;
		const fallback = doc.createElement('script');
		fallback.src = LEGACY_AD_URL;
		doc.body?.appendChild(fallback);
	};
	doc.body.appendChild(script);
	return script;
}
