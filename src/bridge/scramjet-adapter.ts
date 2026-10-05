import { installProxyContextAdapter } from './adapter';

// This is document-local control, not a trust boundary or a vendor detector.
const STATE = Symbol.for('proxy-context-v1.document');
const MAX_SVG_BYTES = 256 * 1024;
const BODY_HEADERS = ['content-length', 'content-encoding', 'etag', 'last-modified', 'content-md5', 'digest', 'content-digest', 'repr-digest'];
type Any = Record<string | symbol, any>;
const installations = new WeakMap<object, () => void>();

export function installDocument(token: string, win: Window = window): void {
	const target = win as unknown as Any;
	if (target[STATE]?.document === win.document) return;
	const state = {
		token, document: win.document, ready: false, disposed: false,
		dispose: () => {},
		activate: () => {},
	};
	let disposeResponder = installProxyContextAdapter(win, () => state.ready && state.document === win.document);
	const onPageHide = (event: PageTransitionEvent) => {
		state.ready = false;
		if (!event.persisted) state.dispose();
	};
	state.dispose = () => {
		if (state.disposed) return;
		state.disposed = true;
		state.ready = false;
		disposeResponder();
		win.removeEventListener('pagehide', onPageHide);
	};
	// Scramjet wraps MessageEvent data at listener registration, not at the
	// native event getter. Rebind the already-installed early responder through
	// the now-hooked document APIs so discovery/port envelopes are unwrapped.
	state.activate = () => {
		if (state.disposed) return;
		disposeResponder();
		disposeResponder = installProxyContextAdapter(win, () => state.ready && state.document === win.document);
		state.ready = true;
	};
	target[STATE] = state;
	win.addEventListener('pagehide', onPageHide);
}

export function spaceGamesUrl(origin: string): string {
	if (!origin.trim()) throw new Error('Configure an HTTP(S) Space origin to open games.');
	let url: URL;
	try { url = new URL(origin); } catch { throw new Error('Space origin must be an HTTP(S) URL.'); }
	if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
		throw new Error('Space origin must be an HTTP(S) URL without credentials.');
	url.searchParams.set('view', 'games');
	return url.href;
}

/** Only the canonical active SVG host shape; never a general XML converter. */
export function activeSvgEnvelope(svg: string): string | null {
	if (!/<foreignObject\b/i.test(svg) || !/<iframe\b/i.test(svg)) return null;
	if (/<!DOCTYPE|<!ENTITY/i.test(svg)) throw new Error('Unsupported active SVG document declaration');
	const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
	const root = doc.documentElement;
	if (doc.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg')
		throw new Error('Malformed active SVG wrapper');
	const frames = Array.from(doc.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'iframe'));
	if (frames.length !== 1 || !frames[0].closest('foreignObject')) throw new Error('Unsupported active SVG frame shape');
	const allowed = new Set(['svg', 'foreignObject', 'div', 'iframe', 'script', 'style']);
	const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
	const serialize = (node: Node): string => {
		if (node.nodeType === 3 || node.nodeType === 4) return escape(node.nodeValue || '');
		if (node.nodeType === 8) return '';
		if (node.nodeType !== 1) throw new Error('Unsupported active SVG node');
		const el = node as Element;
		if (!allowed.has(el.localName) || !['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xhtml'].includes(el.namespaceURI || ''))
			throw new Error('Unsupported active SVG element');
		let attributes = '';
		for (const attr of Array.from(el.attributes)) {
			if (attr.prefix && attr.prefix !== 'xmlns') throw new Error('Unsupported active SVG attribute namespace');
			if (el.localName === 'iframe' && attr.name === 'src' && !['http:', 'https:'].includes(new URL(attr.value, 'https://wrapper.invalid/').protocol))
				throw new Error('Unsupported active SVG frame URL');
			attributes += ` ${attr.name}="${escape(attr.value)}"`;
		}
		let children: string;
		if (el.localName === 'script' || el.localName === 'style') {
			children = el.textContent || '';
			if (new RegExp(`</${el.localName}`, 'i').test(children)) throw new Error('Unsupported active SVG raw text');
		} else children = Array.from(el.childNodes).map(serialize).join('');
		return `<${el.localName}${attributes}>${children}</${el.localName}>`;
	};
	return `<!doctype html><html><head></head><body style="margin:0;width:100vw;height:100vh;overflow:hidden">${serialize(root)}</body></html>`;
}

async function boundedBody(body: BodyInit): Promise<Uint8Array<ArrayBuffer>> {
	const reader = new Response(body).body?.getReader();
	if (!reader) return new Uint8Array();
	const chunks: Uint8Array[] = []; let size = 0;
	let timeout: ReturnType<typeof setTimeout>;
	const expired = new Promise<never>((_resolve, reject) => {
		timeout = setTimeout(() => { reject(new Error('Active SVG document read timed out')); void reader.cancel(); }, 5000);
	});
	try {
		while (true) {
			const { done, value } = await Promise.race([reader.read(), expired]); if (done) break;
			size += value.byteLength;
			if (size > MAX_SVG_BYTES) throw new Error('Active SVG document exceeds size limit');
			chunks.push(value);
		}
	} catch (error) { void reader.cancel(); throw error; }
	finally { clearTimeout(timeout!); }
	const bytes = new Uint8Array(size); let offset = 0;
	for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
	return bytes;
}

export function installScramjetProxyContext(controller: unknown, adapterSource: string): () => void {
	const host = controller as Any;
	if (!host || typeof host.createFrame !== 'function' || !Array.isArray(host.frames))
		throw new Error('Proxy context requires Scramjet controller frame APIs');
	const existing = installations.get(host); if (existing) return existing;
	const engine = (globalThis as Any).$scramjet;
	if (!engine?.Tap?.tap || typeof engine.rewriteHtml !== 'function' || !engine.SCRAMJETCLIENT)
		throw new Error('Proxy context requires the active Scramjet hooks and HTML rewriter');
	if (!adapterSource.trim()) throw new Error('Proxy context adapter bundle is missing');
	const token = crypto.randomUUID();
	const bytes = new TextEncoder().encode(`${adapterSource}\n;globalThis.SpaceProxyContext.installDocument(${JSON.stringify(token)});`);
	let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
	const source = `data:text/javascript;charset=utf-8;base64,${btoa(binary)}`;
	let active = true;
	const attached = new WeakSet<object>();
	const restores: (() => void)[] = [];
	const documents = new Map<Window, Any>();
	const ownedStates = new Set<Any>();
	const wrapFactory = (context: Any) => {
		const iface = context?.interface;
		if (!iface || typeof iface.getInjectScripts !== 'function') throw new Error('Scramjet document injection factory is unavailable');
		const original = iface.getInjectScripts;
		if (original.__proxyContextToken === token) return;
		const wrapped = function (this: unknown, meta: Any, handler: unknown, html: unknown, script: (url: string) => unknown) {
			const base = original.call(this, meta, handler, html, script);
			return active ? [script(source), ...base] : base;
		};
		wrapped.__proxyContextToken = token;
		iface.getInjectScripts = wrapped;
		restores.push(() => { if (iface.getInjectScripts === wrapped) iface.getInjectScripts = original; });
	};
	const attach = (frame: Any) => {
		if (attached.has(frame)) return;
		if (!frame.fetchHandler?.context || !frame.hooks?.fetch?.response || !frame.hooks?.init?.pre || !frame.hooks?.init?.post)
			throw new Error('Scramjet frame response/init hooks are unavailable');
		attached.add(frame);
		wrapFactory(frame.fetchHandler.context);
		const prepared = new WeakSet<object>();
		engine.Tap.tap(frame.hooks.init.pre, ({ window: win, client }: Any) => {
			if (!active) return;
			wrapFactory(client.context);
			prepared.add(client);
			const state = win[STATE];
			if (state?.token === token && state.document === win.document) ownedStates.add(state);
		});
		engine.Tap.tap(frame.hooks.init.post, ({ window: win, client }: Any) => {
			if (!active || !prepared.has(client) || client?.global?.window !== win || win[engine.SCRAMJETCLIENT] !== client) return;
			const state = win[STATE];
			if (!state || state.token !== token || state.document !== win.document) return;
			const previous = documents.get(win);
			if (previous && previous.state === state && previous.client === client) return;
			previous?.removeListeners();
			if (previous && previous.state !== state) { previous.state.dispose(); ownedStates.delete(previous.state); }
			ownedStates.add(state);
			const record = { state, client, frame, removeListeners: () => {} };
			documents.set(win, record); state.activate();
			// The WindowProxy survives navigation, but listeners belong to the
			// current inner Window. Register and bind them to this generation.
			const show = (event: PageTransitionEvent) => {
				if (event.persisted && active && documents.get(win) === record && !state.disposed && win[STATE] === state && state.document === win.document && win[engine.SCRAMJETCLIENT] === client)
					state.ready = true;
			};
			const hide = (event: PageTransitionEvent) => {
				if (!event.persisted) record.removeListeners();
			};
			let listening = true;
			record.removeListeners = () => {
				if (!listening) return; listening = false;
				win.removeEventListener('pageshow', show);
				win.removeEventListener('pagehide', hide);
			};
			win.addEventListener('pageshow', show);
			win.addEventListener('pagehide', hide);
		});
		engine.Tap.tap(frame.hooks.fetch.response, async ({ parsed }: Any, props: Any) => {
			const response = props.response;
			if (!active || !['document', 'iframe'].includes(parsed.destination) || response.status < 200 || response.status >= 300 || !response.body || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'image/svg+xml') return;
			try {
				const bytes = await boundedBody(response.body);
				if (!active) { response.body = bytes.buffer; return; }
				const envelope = activeSvgEnvelope(new TextDecoder().decode(bytes));
				if (envelope === null) { response.body = bytes.buffer; return; }
				response.headers.set('content-type', 'text/html; charset=utf-8');
				for (const header of BODY_HEADERS) response.headers.delete(header);
				response.body = engine.rewriteHtml(envelope, frame.fetchHandler.context, parsed.meta, {
					loadScripts: true, inline: true, source: parsed.url.href,
					headers: response.headers.toRawHeaders(), history: parsed.trackedClient?.history ?? []
				});
			} catch (error) {
				response.status = 502; response.statusText = 'Proxy context wrapper error';
				response.body = `Unable to load active SVG wrapper: ${error instanceof Error ? error.message : 'invalid document'}`;
				response.headers.set('content-type', 'text/plain; charset=utf-8');
			}
			for (const header of BODY_HEADERS) response.headers.delete(header);
		});
	};
	const originalCreate = host.createFrame;
	const createFrame = function (this: Any, ...args: unknown[]) {
		const frame = originalCreate.apply(this, args); if (active) attach(frame); return frame;
	};
	host.createFrame = createFrame;
	const dispose = () => {
		if (!active) return; active = false;
		for (const record of documents.values()) record.removeListeners();
		for (const state of ownedStates) state.dispose();
		ownedStates.clear();
		documents.clear();
		for (const restore of restores.reverse()) restore();
		if (host.createFrame === createFrame) host.createFrame = originalCreate;
		installations.delete(host);
	};
	try { for (const frame of host.frames) attach(frame); } catch (error) { dispose(); throw error; }
	installations.set(host, dispose);
	return dispose;
}
