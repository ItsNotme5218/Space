const PROTOCOL = 'space-bootstrap-v1';
const hints = new WeakMap<
	Window,
	{ buildId: string; wispUrl: string; workerOwned: true }
>();
function validWisp(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	try {
		const url = new URL(value);
		return (
			['ws:', 'wss:'].includes(url.protocol) &&
			!url.username &&
			!url.password &&
			!url.hash
		);
	} catch {
		return false;
	}
}
export function installBootstrapContext(
	win: Window,
	config: { buildId: string; wispUrl: string; workerOwned: true }
): void {
	if (
		!config.buildId ||
		config.workerOwned !== true ||
		!validWisp(config.wispUrl)
	)
		throw new Error('Invalid Space bootstrap configuration');
	hints.set(win, { ...config }); // A hint is never proof of worker ownership.
}
export async function verifyBootstrapContext(
	win: Window,
	buildId: string,
	timeout = 1000
): Promise<{ worker: ServiceWorker; wispUrl: string | null } | null> {
	const Channel = (win as Window & { MessageChannel?: typeof MessageChannel })
		.MessageChannel;
	const container = win.navigator.serviceWorker;
	const worker = container?.controller;
	const expectedContext = () => hints.get(win)?.buildId === buildId;
	// null is genuine absence, not a failed/lost bootstrap deployment.
	if (!worker || typeof Channel !== 'function') {
		if (expectedContext())
			throw new Error('Bootstrap worker verification failed');
		return null;
	}
	const requestId = crypto.randomUUID();
	const channel = new Channel();
	return new Promise((resolve, reject) => {
		let settled = false;
		const controlLost = () => container.controller !== worker;
		const finish = (
			value: { worker: ServiceWorker; wispUrl: string | null } | null,
			error?: Error
		) => {
			if (settled) return;
			settled = true;
			win.clearTimeout(timer);
			container.removeEventListener?.(
				'controllerchange',
				onControlChange
			);
			channel.port1.onmessage = null;
			channel.port1.onmessageerror = null;
			channel.port1.close();
			channel.port2.close();
			if (error) reject(error);
			else resolve(value);
		};
		const onControlChange = () => {
			if (controlLost())
				finish(null, new Error('Bootstrap worker control was lost'));
		};
		const timer = win.setTimeout(() => {
			if (controlLost())
				finish(null, new Error('Bootstrap worker control was lost'));
			else if (expectedContext())
				finish(
					null,
					new Error('Bootstrap worker verification timed out')
				);
			else finish(null); // An unchanged worker may simply not implement bootstrap.
		}, timeout);
		channel.port1.onmessage = event => {
			if (controlLost()) {
				onControlChange();
				return;
			}
			const data = event.data;
			if (data?.protocol !== PROTOCOL || data.requestId !== requestId)
				return;
			// A correlated bootstrap failure/mismatch is not absence and must never
			// authorize Space to register a competing worker as a fallback.
			if (
				data.type !== 'owned' ||
				data.buildId !== buildId ||
				data.workerOwned !== true ||
				(data.wispUrl !== null && !validWisp(data.wispUrl))
			) {
				finish(null, new Error('Bootstrap worker verification failed'));
				return;
			}
			const hint = hints.get(win);
			finish({
				worker,
				wispUrl: hint?.buildId === buildId ? hint.wispUrl : data.wispUrl
			});
		};
		channel.port1.onmessageerror = () =>
			finish(null, new Error('Bootstrap worker verification failed'));
		container.addEventListener?.('controllerchange', onControlChange);
		onControlChange();
		if (settled) return;
		try {
			worker.postMessage(
				{ protocol: PROTOCOL, type: 'check', requestId, buildId },
				[channel.port2]
			);
		} catch (cause) {
			finish(
				null,
				new Error('Bootstrap worker verification failed', { cause })
			);
		}
	});
}
