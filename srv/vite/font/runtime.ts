/// <reference path="./virtual.d.ts" />
/// <reference types="vite/client" />
// Readiness design adapted from Nebula build/font/runtime.js (AGPL-3.0).
// Space rewrite 2026-09-30: no prototype patches, inputs, attributes containing
// app data or React text mutations. See NOTICE.md and root LICENSE.
import mappingPath from 'virtual:space-font-mapping';
import { cssContent } from './css';

interface Mapping { version: number; font: string; encode: Record<string, string>; decode: Record<string, string> }
const excluded = 'input,textarea,select,option,script,style,pre,code,svg,iframe,[contenteditable]:not([contenteditable="false"]),[data-no-obfuscate],.no-obfuscate';

function validateMapping(value: unknown): Mapping {
	const mapping = value as Mapping;
	if (!mapping || mapping.version !== 1 || !/^fonts\/space-[a-f0-9]{16}\.woff2$/.test(mapping.font) ||
		!mapping.encode || !mapping.decode || Object.keys(mapping.encode).length !== 95) throw new Error('Invalid Space font mapping');
	for (let i = 32; i <= 126; i++) {
		const plain = String.fromCharCode(i);
		const encoded = mapping.encode[plain];
		if (typeof encoded !== 'string' || !(plain === ' ' ? encoded === ' ' : /^[\ue000-\uf8ff]$/.test(encoded)) || mapping.decode[encoded] !== plain) throw new Error('Invalid Space glyph mapping');
	}
	return mapping;
}

export async function installFontRuntime(root: ShadowRoot): Promise<{ dispose(): void }> {
	const document = root.ownerDocument;
	const style = document.createElement('style');
	style.dataset.spaceFontStyle = '';
	style.textContent = cssContent;
	root.append(style);
	const touched = new Set<HTMLElement>();
	let observer: MutationObserver | undefined;
	let face: FontFace | undefined;
	let disposed = false;
	let cancelStyleRefresh = () => {};
	const restore = (element: HTMLElement) => {
		element.removeAttribute('data-space-font');
		element.style.removeProperty('--space-font-size');
		element.style.removeProperty('--space-font-display');
		touched.delete(element);
	};
	const dispose = () => {
		if (disposed) return;
		disposed = true;
		cancelStyleRefresh();
		observer?.disconnect();
		for (const element of touched) restore(element);
		style.remove();
		if (face) document.fonts.delete(face);
	};
	try {
		const base = new URL(import.meta.env.BASE_URL, document.baseURI);
		// Bounded readiness: malformed/missing mapping or a hung font request
		// never prevents the app booting, and never hides normal source text.
		const abort = new AbortController();
		const timer = setTimeout(() => abort.abort(), 5000);
		let mapping: Mapping;
		try {
			const response = await fetch(new URL(mappingPath, base), { signal: abort.signal });
			if (!response.ok) throw new Error('Space font mapping unavailable');
			mapping = validateMapping(await response.json());
			const fontResponse = await fetch(new URL(mapping.font, base), { signal: abort.signal });
			if (!fontResponse.ok) throw new Error('Space font unavailable');
			face = new FontFace('SpacePresentation', await fontResponse.arrayBuffer());
			await face.load();
			document.fonts.add(face);
		} finally { clearTimeout(timer); }
		const view = document.defaultView;
		let refreshFrame: number | undefined;
		const mediaListeners = new Map<string, () => void>();
		let styleAttributeDependent = false;
		// Resize and matching-media events can arrive together or in bursts.
		// Re-read the unmodified cascade at most once per animation frame.
		const scheduleRefresh = () => {
			if (disposed || !view || refreshFrame !== undefined) return;
			refreshFrame = view.requestAnimationFrame(() => {
				refreshFrame = undefined;
				if (!disposed) scan();
			});
		};
		const syncMediaListeners = () => {
			if (!view) return;
			const queries = new Set<string>();
			styleAttributeDependent = false;
			const visited = new Set<CSSStyleSheet>();
			const visitSheet = (sheet: CSSStyleSheet) => {
				if (visited.has(sheet)) return;
				visited.add(sheet);
				try { visit(sheet.cssRules); } catch { styleAttributeDependent = true; }
			};
			const visit = (rules: CSSRuleList) => {
				for (const rule of rules) {
					if (rule.type === CSSRule.IMPORT_RULE) {
						const imported = (rule as CSSImportRule).styleSheet;
						if (imported) visitSheet(imported);
						else styleAttributeDependent = true;
					}
					if (/\[\s*style\b|attr\(\s*style\b/i.test(rule.cssText)) styleAttributeDependent = true;
					if (rule.type === CSSRule.MEDIA_RULE) queries.add((rule as CSSMediaRule).conditionText);
					if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules);
				}
			};
			// Includes root-local/adopted sheets and inherited document/host styles.
			for (const sheet of [...document.styleSheets, ...root.styleSheets, ...document.adoptedStyleSheets, ...root.adoptedStyleSheets]) {
				visitSheet(sheet); // Includes imports; opaque selectors require conservative refresh.
			}
			for (const [query, remove] of mediaListeners) {
				if (!queries.has(query)) { remove(); mediaListeners.delete(query); }
			}
			for (const query of queries) {
				if (mediaListeners.has(query)) continue;
				const media = view.matchMedia(query);
				media.addEventListener('change', scheduleRefresh);
				mediaListeners.set(query, () => media.removeEventListener('change', scheduleRefresh));
			}
		};
		view?.addEventListener('resize', scheduleRefresh);
		cancelStyleRefresh = () => {
			view?.removeEventListener('resize', scheduleRefresh);
			if (refreshFrame !== undefined) view?.cancelAnimationFrame(refreshFrame);
			refreshFrame = undefined;
			for (const remove of mediaListeners.values()) remove();
			mediaListeners.clear();
		};
		const scan = () => {
			if (disposed) return;
			observer?.disconnect();
			syncMediaListeners();
			// Read the current React/CSS styling without our presentation rule;
			// source font-size changes must not leave a stale pseudo-element size.
			for (const element of touched) restore(element);
			// Read the complete cascade before writing presentation styles. Alternating
			// reads/writes per label forces repeated layout, starving real MessagePort
			// readiness replies in delegated documents beyond their fixed deadline.
			const presentation: { element: HTMLElement; fontSize: string; display: string; text: string }[] = [];
			for (const element of root.querySelectorAll<HTMLElement>('*')) {
				const text = element.textContent || '';
				// Leaf HTML labels only. Mixed content, existing pseudo-elements,
				// URLs, editable/user-data areas remain normal, readable text.
				if (!(element instanceof HTMLElement) || element.children.length || element.closest(excluded) ||
					!text.trim() || /(?:https?:\/\/|wss?:\/\/|www\.)/i.test(text)) {
					if (touched.has(element)) restore(element);
					continue;
				}
				const computed = getComputedStyle(element);
				const hasPseudo = ['::before', '::after'].some((pseudo) => {
					const content = getComputedStyle(element, pseudo).content;
					return content !== 'none' && content !== 'normal';
				});
				// CSS case transforms cannot transform remapped codepoints. Leave
				// those labels and existing decorative pseudo-elements untouched.
				if (hasPseudo || computed.textTransform !== 'none') continue;
				presentation.push({ element, fontSize: computed.fontSize, display: computed.display === 'inline' ? 'inline-block' : computed.display, text });
			}
			for (const { element, fontSize, display, text } of presentation) {
				element.style.setProperty('--space-font-size', fontSize);
				element.style.setProperty('--space-font-display', display);
				touched.add(element);
				element.dataset.spaceFont = [...text].map((char) => mapping.encode[char] || char).join('');
			}
			observer?.observe(root, { childList: true, characterData: true, subtree: true, attributes: true, attributeOldValue: true });
		};
		// React/animation/controller style writes can arrive in separate microtasks
		// before one paint. A synchronous full scan for each record repeatedly
		// invalidates all label layouts and starves document-local port replies.
		// Share the existing cancellable frame refresh with resize/media changes.
		// Motion updates these properties each frame without changing label
		// cascade/layout. Do not remove every label's presentation for those writes.
		// Custom properties, font/layout changes and unknown attributes still scan;
		// style-attribute selectors (including opaque sheets) disable this shortcut.
		const paintOnly = new Set(['opacity', 'transform', 'translate', 'rotate', 'scale', 'background', 'background-color', 'box-shadow']);
		const previousStyle = document.createElement('div').style;
		observer = new MutationObserver(records => {
			const affectsPresentation = records.some(record => {
				if (styleAttributeDependent) return true;
				if (record.type !== 'attributes' || record.attributeName !== 'style' || !(record.target instanceof HTMLElement)) return true;
				previousStyle.cssText = record.oldValue || '';
				const current = record.target.style;
				const properties = new Set([...previousStyle, ...current]);
				return [...properties].some(property => !paintOnly.has(property) &&
					(previousStyle.getPropertyValue(property) !== current.getPropertyValue(property) ||
					 previousStyle.getPropertyPriority(property) !== current.getPropertyPriority(property)));
			});
			if (affectsPresentation) scheduleRefresh();
		});
		scan();
	} catch {
		// Fallback is the untouched original UI, not encoded fallback glyphs.
		dispose();
	}
	return { dispose };
}
