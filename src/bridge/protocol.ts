export const PROTOCOL = 'proxy-context-v1';
export const VERSION = 1;
export const CAPABILITIES = Object.freeze([
	'nested-iframe-navigation',
	'document-fetch'
] as const);
export const DISCOVERY_TIMEOUT_MS = 1500;
export const READY_TIMEOUT_MS = 1000;

type Envelope = {
	protocol: typeof PROTOCOL;
	version: typeof VERSION;
	requestId: string;
};
export type ProtocolMessage = Envelope &
	(
		| { type: 'discover' }
		| {
				type: 'capabilities';
				sessionId: string;
				capabilities: readonly string[];
		  }
		| { type: 'check' | 'ready' | 'unavailable'; sessionId: string }
	);

export function isMessage(value: unknown): value is ProtocolMessage {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		return false;
	const message = value as Record<string, unknown>;
	if (
		message.protocol !== PROTOCOL ||
		message.version !== VERSION ||
		typeof message.requestId !== 'string' ||
		!message.requestId
	)
		return false;
	const keys = ['protocol', 'version', 'type', 'requestId'];
	if (message.type !== 'discover') {
		if (
			typeof message.type !== 'string' ||
			!['capabilities', 'check', 'ready', 'unavailable'].includes(
				message.type
			) ||
			typeof message.sessionId !== 'string' ||
			!message.sessionId
		)
			return false;
		keys.push('sessionId');
		if (message.type === 'capabilities') {
			keys.push('capabilities');
			const capabilities = message.capabilities;
			if (
				!Array.isArray(capabilities) ||
				!capabilities.every(
					item => typeof item === 'string' && item.length > 0
				) ||
				!CAPABILITIES.every(capability =>
					capabilities.includes(capability)
				)
			)
				return false;
		}
	}
	return (
		Object.keys(message).length === keys.length &&
		keys.every(key => Object.hasOwn(message, key))
	);
}

// Constructors are accessed on the supplied document, never an ancestor/global fallback.
export function platform(win: Window) {
	const Channel = (win as Window & { MessageChannel?: typeof MessageChannel })
		.MessageChannel;
	if (
		typeof Channel !== 'function' ||
		typeof win.crypto?.randomUUID !== 'function' ||
		typeof win.postMessage !== 'function' ||
		typeof win.addEventListener !== 'function' ||
		typeof win.setTimeout !== 'function' ||
		typeof win.clearTimeout !== 'function'
	)
		return null;
	return { Channel, id: () => win.crypto.randomUUID() };
}
