import {
	CAPABILITIES,
	DISCOVERY_TIMEOUT_MS,
	PROTOCOL,
	VERSION,
	isMessage,
	platform
} from './protocol';

// Window broadcasts one endpoint to all document listeners. Only its first
// accepting adapter owns it; duplicate installs must not replace or close it.
const claimedPorts = new WeakSet<MessagePort>();

export function installProxyContextAdapter(
	win: Window,
	isReady: () => boolean
): () => void {
	const support = platform(win);
	if (!support) return () => {};
	let installed = true;
	let active = true;
	const sessions = new Set<() => void>();
	const ready = () => {
		try {
			return isReady() === true;
		} catch {
			return false;
		}
	};
	const onMessage = (event: MessageEvent) => {
		if (
			!installed ||
			!active ||
			event.source !== win ||
			!isMessage(event.data) ||
			event.data.type !== 'discover' ||
			event.ports.length !== 1
		)
			return;
		const port = event.ports[0];
		if (
			!port ||
			typeof port.postMessage !== 'function' ||
			typeof port.start !== 'function' ||
			typeof port.close !== 'function' ||
			claimedPorts.has(port)
		)
			return;
		claimedPorts.add(port);
		if (!ready()) {
			port.close();
			return;
		}
		const requestId = event.data.requestId;
		let sessionId: string;
		try {
			sessionId = support.id();
		} catch {
			port.close();
			return;
		}
		let closed = false;
		const close = () => {
			if (closed) return;
			closed = true;
			win.clearTimeout(acceptanceTimer);
			try {
				port.postMessage({
					protocol: PROTOCOL,
					version: VERSION,
					type: 'unavailable',
					requestId,
					sessionId
				});
			} catch {
				/* A disconnected client already cannot use this session. */
			}
			port.onmessage = null;
			port.onmessageerror = null;
			port.close();
			sessions.delete(close);
		};
		// A closed peer is not observable in browsers. Bound advertisements
		// until the client proves receipt with an existing session check.
		const acceptanceTimer = win.setTimeout(close, DISCOVERY_TIMEOUT_MS);
		sessions.add(close);
		port.onmessageerror = close;
		port.onmessage = event => {
			if (
				closed ||
				!isMessage(event.data) ||
				event.data.type === 'discover' ||
				event.data.sessionId !== sessionId
			)
				return;
			if (
				event.data.type === 'unavailable' &&
				event.data.requestId === requestId
			) {
				close();
				return;
			}
			if (event.data.type !== 'check') return;
			win.clearTimeout(acceptanceTimer);
			const available = ready();
			try {
				port.postMessage({
					protocol: PROTOCOL,
					version: VERSION,
					type: available ? 'ready' : 'unavailable',
					requestId: event.data.requestId,
					sessionId
				});
			} catch {
				close();
				return;
			}
			if (!available) close();
		};
		try {
			port.start();
			port.postMessage({
				protocol: PROTOCOL,
				version: VERSION,
				type: 'capabilities',
				requestId,
				sessionId,
				capabilities: CAPABILITIES
			});
		} catch {
			close();
		}
	};
	const closeSessions = () => {
		for (const close of sessions) close();
	};
	const onPageHide = () => {
		active = false;
		closeSessions();
	};
	const onPageShow = (event: PageTransitionEvent) => {
		if (event.persisted) {
			closeSessions();
			active = true;
		}
	};
	win.addEventListener('message', onMessage);
	win.addEventListener('pagehide', onPageHide);
	win.addEventListener('pageshow', onPageShow);
	return () => {
		if (!installed) return;
		installed = false;
		closeSessions();
		win.removeEventListener('message', onMessage);
		win.removeEventListener('pagehide', onPageHide);
		win.removeEventListener('pageshow', onPageShow);
	};
}
