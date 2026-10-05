import { expect, test, vi } from 'vitest';
import {
	installBootstrapContext,
	verifyBootstrapContext
} from '../../src/runtime/bootstrap';
function fixture(reply: (data: any, port: MessagePort) => void) {
	const controller = {
		scriptURL: 'http://localhost/bootstrap-sw.js',
		postMessage(data: any, ports: MessagePort[]) {
			reply(data, ports[0]);
		}
	};
	return {
		navigator: { serviceWorker: { controller } },
		MessageChannel,
		location: { origin: 'http://localhost' },
		setTimeout,
		clearTimeout
	} as unknown as Window;
}
test('bare flag cannot assert ownership', async () => {
	const win = fixture((_data, port) =>
		port.postMessage({ workerOwned: true })
	);
	installBootstrapContext(win, {
		buildId: 'build',
		wispUrl: 'ws://localhost/w/',
		workerOwned: true
	});
	await expect(verifyBootstrapContext(win, 'build', 20)).rejects.toThrow(
		'verification timed out'
	);
});
test('bootstrap configuration never patches game WebSockets', async () => {
	const win = fixture((data, port) =>
		port.postMessage({
			...data,
			type: 'owned',
			workerOwned: true,
			wispUrl: 'ws://localhost/w/'
		})
	);
	const Socket = function () {};
	Object.assign(win, { WebSocket: Socket });
	installBootstrapContext(win, {
		buildId: 'build',
		wispUrl: 'ws://localhost/w/',
		workerOwned: true
	});
	expect((await verifyBootstrapContext(win, 'build'))?.wispUrl).toBe(
		'ws://localhost/w/'
	);
	expect((win as Window & { WebSocket: unknown }).WebSocket).toBe(Socket);
});
test('explicit deployment hook supplies transport override only after worker ownership validation', async () => {
	const win = fixture((data, port) =>
		port.postMessage({
			...data,
			type: 'owned',
			workerOwned: true,
			wispUrl: null
		})
	);
	installBootstrapContext(win, {
		buildId: 'build',
		wispUrl: 'ws://localhost/explicit/',
		workerOwned: true
	});
	expect((await verifyBootstrapContext(win, 'build'))?.wispUrl).toBe(
		'ws://localhost/explicit/'
	);
});
test.each(['requestId', 'buildId', 'workerOwned', 'wispUrl'])(
	'rejects an invalid %s in an otherwise correlated reply',
	async field => {
		const win = fixture((data, port) =>
			port.postMessage({
				...data,
				type: 'owned',
				workerOwned: true,
				wispUrl: 'ws://localhost/w/',
				[field]: field === 'workerOwned' ? false : 'invalid'
			})
		);
		if (field === 'requestId')
			expect(await verifyBootstrapContext(win, 'build', 20)).toBeNull();
		else
			await expect(
				verifyBootstrapContext(win, 'build', 20)
			).rejects.toThrow('verification failed');
	}
);
test('correlated worker reply authorizes only the matching build and worker', async () => {
	const win = fixture((data, port) =>
		port.postMessage({
			...data,
			type: 'owned',
			workerOwned: true,
			wispUrl: 'ws://localhost/w/'
		})
	);
	const result = await verifyBootstrapContext(win, 'build');
	expect(result?.worker).toBe(win.navigator.serviceWorker.controller);
	expect(result?.wispUrl).toBe('ws://localhost/w/');
	const wrong = fixture((data, port) =>
		port.postMessage({
			...data,
			type: 'owned',
			workerOwned: true,
			buildId: 'other'
		})
	);
	await expect(verifyBootstrapContext(wrong, 'build', 20)).rejects.toThrow(
		'verification failed'
	);
});
test.each(['valid-reply', 'no-reply'])(
	'pending controller replacement rejects instead of reporting absence (%s)',
	async kind => {
		let reply: () => void = () => {};
		const win = fixture((data, port) => {
			reply = () =>
				port.postMessage({
					...data,
					type: 'owned',
					workerOwned: true,
					wispUrl: null
				});
		});
		const pending = verifyBootstrapContext(win, 'build', 20);
		(win.navigator.serviceWorker as any).controller = {};
		if (kind === 'valid-reply') reply();
		await expect(pending).rejects.toThrow('control was lost');
	}
);
test('controllerchange rejects promptly and removes listeners/closes both ports', async () => {
	const win = fixture(() => {});
	const container = Object.assign(new EventTarget(), {
		controller: win.navigator.serviceWorker.controller
	});
	const remove = vi.spyOn(container, 'removeEventListener');
	Object.assign(win.navigator, { serviceWorker: container });
	const closed: ReturnType<typeof vi.fn>[] = [];
	class TrackedChannel extends MessageChannel {
		constructor() {
			super();
			for (const port of [this.port1, this.port2]) {
				const close = vi.fn(port.close.bind(port));
				port.close = close;
				closed.push(close);
			}
		}
	}
	Object.assign(win, { MessageChannel: TrackedChannel });
	const pending = verifyBootstrapContext(win, 'build', 20);
	container.controller = {} as ServiceWorker;
	container.dispatchEvent(new Event('controllerchange'));
	await expect(pending).rejects.toThrow('control was lost');
	expect(remove).toHaveBeenCalledWith(
		'controllerchange',
		expect.any(Function)
	);
	closed.forEach(close => expect(close).toHaveBeenCalledTimes(1));
});
test('no controller and stable non-bootstrap discovery timeout still mean no bootstrap context', async () => {
	const empty = fixture(() => {
		throw Error('Must not post without a controller');
	});
	(empty.navigator.serviceWorker as any).controller = null;
	expect(await verifyBootstrapContext(empty, 'build', 20)).toBeNull();
	const ordinary = fixture(() => {});
	expect(await verifyBootstrapContext(ordinary, 'build', 20)).toBeNull();
});
test('worker messaging failure rejects verification, not normal standalone absence', async () => {
	const win = fixture(() => {
		throw Error('Messaging failed');
	});
	await expect(verifyBootstrapContext(win, 'build', 20)).rejects.toThrow(
		'verification failed'
	);
});
test('correlated unavailable reply rejects verification without waiting for absence timeout', async () => {
	const win = fixture((data, port) =>
		port.postMessage({
			protocol: data.protocol,
			requestId: data.requestId,
			type: 'unavailable'
		})
	);
	await expect(verifyBootstrapContext(win, 'build', 20)).rejects.toThrow(
		'verification failed'
	);
});
