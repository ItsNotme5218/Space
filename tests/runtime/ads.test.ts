import { expect, it } from 'vitest';

async function injector() {
	const modulePath = '../../src/runtime/ads.ts';
	const module = await import(/* @vite-ignore */ modulePath).catch(
		() => ({})
	);
	expect(module.injectSpaceAds, 'Space ad injector').toBeTypeOf('function');
	return module.injectSpaceAds as (doc: Document) => HTMLScriptElement | null;
}

function documentFixture(topLevel = true) {
	const scripts: any[] = [];
	const win: any = {};
	win.top = topLevel ? win : {};
	const doc = {
		defaultView: win,
		body: { appendChild: (script: any) => (scripts.push(script), script) },
		createElement: () => {
			const attributes: Record<string, string> = {};
			return {
				src: '',
				onerror: null as ((event: Event) => void) | null,
				setAttribute: (name: string, value: string) => {
					attributes[name] = value;
				},
				getAttribute: (name: string) => attributes[name] ?? null,
				matches: (name: string, value: string) =>
					attributes[name] === value
			};
		},
		querySelector: (selector: string) =>
			scripts.find(script =>
				selector.includes(
					'bauval.org/14/592dfab1692cc524d861443567c7b621'
				)
					? script.src ===
						'https://bauval.org/14/592dfab1692cc524d861443567c7b621'
					: selector.includes(
								'pl29046858.profitablecpmratenetwork.com'
						  )
						? script.src ===
							'https://pl29046858.profitablecpmratenetwork.com/59/2d/fa/592dfab1692cc524d861443567c7b621.js'
						: false
			) ?? null
	};
	return { doc: doc as unknown as Document, scripts };
}

it('loads the SocialBar directly into the outer document body and only once', async () => {
	const injectSpaceAds = await injector();
	const { doc, scripts } = documentFixture();
	const first = injectSpaceAds(doc);
	const second = injectSpaceAds(doc);
	expect(scripts).toHaveLength(1);
	expect(first).toBe(scripts[0]);
	expect(second).toBe(first);
	expect(first?.src).toBe(
		'https://bauval.org/14/592dfab1692cc524d861443567c7b621'
	);
	expect(first?.getAttribute('data-cfasync')).toBe('false');
	expect(first?.getAttribute('data-space-ad')).toBeNull();
});

it('loads the legacy ad script if the SocialBar script fails', async () => {
	const injectSpaceAds = await injector();
	const { doc, scripts } = documentFixture();
	const primary = injectSpaceAds(doc)!;
	primary.onerror?.(new Event('error'));
	expect(scripts).toHaveLength(2);
	expect(scripts[1].src).toBe(
		'https://pl29046858.profitablecpmratenetwork.com/59/2d/fa/592dfab1692cc524d861443567c7b621.js'
	);
	expect(scripts[1].getAttribute('data-space-ad')).toBeNull();
});

it('does not inject ads into a nested proxy or game frame', async () => {
	const injectSpaceAds = await injector();
	const { doc, scripts } = documentFixture(false);
	expect(injectSpaceAds(doc)).toBeNull();
	expect(scripts).toHaveLength(0);
});
