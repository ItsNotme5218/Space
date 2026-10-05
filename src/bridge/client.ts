import {
	DISCOVERY_TIMEOUT_MS,
	READY_TIMEOUT_MS,
	PROTOCOL,
	VERSION,
	isMessage,
	platform
} from './protocol';

export interface ProxyContextSession {
	sessionId: string;
	capabilities: readonly string[];
	assertReady(): Promise<void>;
	dispose(): void;
}
export function discoverProxyContext(
	win: Window
): Promise<ProxyContextSession | null> {
	const support = platform(win);
	if (!support) return Promise.resolve(null);
	return new Promise(resolve => {
		let channel: MessageChannel | undefined;
		let requestId: string;
		try {
			channel = new support.Channel();
			requestId = support.id();
		} catch {
			channel?.port1.close();
			channel?.port2.close();
			resolve(null);
			return;
		}
		const port = channel.port1;
		const transferredPort = channel.port2;
		let selected: ProxyContextSession | null = null;
		let discovering = true;
		let disposed = false;
		const pending = new Map<
			string,
			{
				resolve: () => void;
				reject: (error: Error) => void;
				timer: number;
				deadline: number;
			}
		>();
		const error = () => new Error('Proxy context is unavailable');
		const dispose = () => {
			if (disposed) return;
			disposed = true;
			// Browsers have no peer-close event. Explicitly release the adapter's
			// endpoint and handlers before closing our end of the channel.
			if (selected) {
				try {
					port.postMessage({
						protocol: PROTOCOL,
						version: VERSION,
						type: 'unavailable',
						requestId,
						sessionId: selected.sessionId
					});
				} catch {
					/* Teardown must also succeed for an already lost port. */
				}
			}
			win.clearTimeout(discoveryTimer);
			win.removeEventListener('pagehide', dispose);
			win.removeEventListener('pageshow', onPageShow);
			port.onmessage = null;
			port.onmessageerror = null;
			port.close();
			transferredPort.close();
			for (const check of pending.values()) {
				win.clearTimeout(check.timer);
				check.reject(error());
			}
			pending.clear();
			if (discovering) {
				discovering = false;
				resolve(null);
			}
		};
		const onPageShow = (event: PageTransitionEvent) => {
			if (event.persisted) dispose();
		};
		const discoveryDeadline = win.performance.now() + DISCOVERY_TIMEOUT_MS;
		const discoveryTimer = win.setTimeout(dispose, DISCOVERY_TIMEOUT_MS);
		win.addEventListener('pagehide', dispose);
		win.addEventListener('pageshow', onPageShow);
		port.onmessageerror = dispose;
		port.onmessage = event => {
			if (disposed || !isMessage(event.data)) return;
			const message = event.data;
			if (discovering) {
				// Port tasks can run before an overdue timer task. Receipt time,
				// not task ordering, determines whether discovery is still valid.
				if (win.performance.now() >= discoveryDeadline) {
					dispose();
					return;
				}
				if (
					message.type !== 'capabilities' ||
					message.requestId !== requestId
				)
					return;
				// Confirm receipt even when the caller leaves this session idle.
				// This is a normal check using the discovery correlation, not a
				// new wire type; its ready reply has no pending readiness promise.
				try {
					port.postMessage({
						protocol: PROTOCOL,
						version: VERSION,
						type: 'check',
						requestId,
						sessionId: message.sessionId
					});
				} catch {
					dispose();
					return;
				}
				discovering = false;
				win.clearTimeout(discoveryTimer);
				selected = {
					sessionId: message.sessionId,
					capabilities: Object.freeze([...message.capabilities]),
					dispose,
					assertReady() {
						if (disposed) return Promise.reject(error());
						return new Promise<void>((resolveCheck, reject) => {
							let checkId: string;
							try {
								checkId = support.id();
							} catch {
								reject(error());
								return;
							}
							const deadline = win.performance.now() + READY_TIMEOUT_MS;
							const timer = win.setTimeout(() => {
								pending.delete(checkId);
								reject(error());
							}, READY_TIMEOUT_MS);
							pending.set(checkId, {
								resolve: resolveCheck,
								reject,
								timer,
								deadline
							});
							try {
								port.postMessage({
									protocol: PROTOCOL,
									version: VERSION,
									type: 'check',
									requestId: checkId,
									sessionId: message.sessionId
								});
							} catch {
								dispose();
							}
						});
					}
				};
				resolve(selected);
				return;
			}
			if (message.type !== 'ready' && message.type !== 'unavailable')
				return;
			if (message.sessionId !== selected?.sessionId) return;
			// The discovery correlation identifies adapter lifecycle termination.
			if (
				message.type === 'unavailable' &&
				message.requestId === requestId
			) {
				dispose();
				return;
			}
			const check = pending.get(message.requestId);
			if (!check) return;
			if (message.type === 'unavailable') {
				dispose();
				return;
			}
			pending.delete(message.requestId);
			win.clearTimeout(check.timer);
			// Each check owns its deadline; expiry matches the timer's rejection
			// policy without extending or cancelling another concurrent check.
			if (win.performance.now() >= check.deadline) check.reject(error());
			else check.resolve();
		};
		try {
			port.start();
			win.postMessage(
				{
					protocol: PROTOCOL,
					version: VERSION,
					type: 'discover',
					requestId
				},
				'*',
				[transferredPort]
			);
		} catch {
			dispose();
		}
	});
}
