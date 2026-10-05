import { MessageChannel } from 'node:worker_threads';
import { setImmediate } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { discoverProxyContext } from '../../src/bridge/client';
import { installProxyContextAdapter } from '../../src/bridge/adapter';

// Node has real transferable ports but no Window. Keep source identity explicit,
// and clone/transfer the message exactly as Window.postMessage does.
function documentWindow() {
	const target = new EventTarget();
	const win = Object.assign(target, {
		MessageChannel,
		crypto: globalThis.crypto,
		performance: globalThis.performance,
		setTimeout: globalThis.setTimeout,
		clearTimeout: globalThis.clearTimeout,
		postMessage(data: unknown, _origin: string, ports: Transferable[]) {
			const cloned = structuredClone(
				{ data, ports },
				{ transfer: ports }
			);
			queueMicrotask(() =>
				emit(win as unknown as Window, cloned.data, cloned.ports)
			);
		}
	});
	return win as unknown as Window;
}
function emit(
	win: Window,
	data: unknown,
	ports: unknown[] = [],
	source: unknown = win
) {
	const event = new Event('message');
	Object.assign(event, { data, ports, source });
	win.dispatchEvent(event);
}
async function flush() {
	for (let i = 0; i < 8; i++) await setImmediate();
}
function responder(
	win: Window,
	respond: (data: any, port: MessagePort) => void
) {
	const listener = (event: MessageEvent) => {
		if (event.data.type === 'discover') respond(event.data, event.ports[0]);
	};
	win.addEventListener('message', listener);
	return () => win.removeEventListener('message', listener);
}
function capabilities(requestId: string, sessionId = 'session') {
	return {
		protocol: 'proxy-context-v1',
		version: 1,
		type: 'capabilities',
		requestId,
		sessionId,
		capabilities: ['nested-iframe-navigation', 'document-fetch']
	};
}
const cleanup: (() => void)[] = [];
beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => {
	cleanup.splice(0).forEach(fn => fn());
	vi.useRealTimers();
});

describe('document negotiation', () => {
	it.each([1500, 1501])(
		'rejects discovery received at elapsed %sms before the overdue timer runs',
		async elapsed => {
			const win = documentWindow();
			let now = 0;
			Object.defineProperty(win, 'performance', {
				value: { now: () => now }
			});
			let remote!: MessagePort;
			let requestId!: string;
			cleanup.push(
				responder(win, (data, port) => {
					remote = port;
					requestId = data.requestId;
					cleanup.push(() => port.close());
				})
			);
			const result = discoverProxyContext(win);
			await flush();
			expect(vi.getTimerCount()).toBe(1);
			now = elapsed; // Advance monotonic receipt time, NOT timer tasks.
			remote.postMessage(capabilities(requestId));
			await flush();
			expect(await result).toBeNull();
			expect(vi.getTimerCount()).toBe(0);
		}
	);
	it.each([1000, 1001])(
		'uses independent readiness deadlines with port-first overdue receipt at %sms',
		async elapsed => {
			const win = documentWindow();
			let now = 0;
			Object.defineProperty(win, 'performance', {
				value: { now: () => now }
			});
			let remote!: MessagePort;
			const checks: any[] = [];
			cleanup.push(
				responder(win, (data, port) => {
					remote = port;
					cleanup.push(() => port.close());
					port.onmessage = event => {
						if (event.data.requestId !== data.requestId)
							checks.push(event.data);
					};
					port.start();
					port.postMessage(capabilities(data.requestId));
				})
			);
			const discovery = discoverProxyContext(win);
			await flush();
			const session = (await discovery)!;
			cleanup.push(() => session.dispose());
			const first = session.assertReady();
			// Handle rejection immediately, including the pre-fix resolved outcome.
			const outcome = first.then(
				() => 'resolved',
				() => 'rejected'
			);
			now = 500;
			const second = session.assertReady();
			await flush();
			expect(vi.getTimerCount()).toBe(2);
			now = elapsed;
			remote.postMessage({ ...checks[0], type: 'ready' });
			remote.postMessage({ ...checks[1], type: 'ready' });
			await flush();
			expect(await outcome).toBe('rejected');
			await second; // Fresh concurrent check must not share the first deadline.
			expect(vi.getTimerCount()).toBe(0);
		}
	);
	it('releases both endpoints if ID generation fails after channel creation', async () => {
		const win = documentWindow();
		const closes: ReturnType<typeof vi.spyOn>[] = [];
		Object.defineProperty(win, 'MessageChannel', {
			value: class extends MessageChannel {
				constructor() {
					super();
					closes.push(
						vi.spyOn(this.port1, 'close'),
						vi.spyOn(this.port2, 'close')
					);
				}
			}
		});
		Object.defineProperty(win, 'crypto', {
			value: {
				randomUUID() {
					throw new Error('unavailable');
				}
			}
		});
		expect(await discoverProxyContext(win)).toBeNull();
		expect(closes).toHaveLength(2);
		closes.forEach(close => expect(close).toHaveBeenCalledOnce());
	});
	it('resolves null at exactly 1500ms without a responder', async () => {
		const result = discoverProxyContext(documentWindow());
		const settled = vi.fn();
		result.then(settled);
		await vi.advanceTimersByTimeAsync(1499);
		expect(settled).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(await result).toBeNull();
	});
	it('negotiates both capabilities and independent fresh sessions with a ready adapter', async () => {
		const win = documentWindow();
		cleanup.push(installProxyContextAdapter(win, () => true));
		const a = discoverProxyContext(win),
			b = discoverProxyContext(win);
		await flush();
		const first = (await a)!;
		const second = (await b)!;
		expect(first).not.toBeNull();
		expect(second.sessionId).not.toBe(first.sessionId);
		expect(first.capabilities).toEqual([
			'nested-iframe-navigation',
			'document-fetch'
		]);
		cleanup.push(
			() => first.dispose(),
			() => second.dispose()
		);
		const ready = first.assertReady();
		await flush();
		await ready;
	});
	it('does not advertise when hooks are not ready', async () => {
		const win = documentWindow();
		cleanup.push(installProxyContextAdapter(win, () => false));
		const result = discoverProxyContext(win);
		await flush();
		await vi.advanceTimersByTimeAsync(1500);
		expect(await result).toBeNull();
	});
	it.each(['MessageChannel', 'crypto', 'postMessage'])(
		'missing %s resolves null',
		async key => {
			const win = documentWindow();
			Object.defineProperty(win, key, { value: undefined });
			expect(await discoverProxyContext(win)).toBeNull();
			expect(() =>
				cleanup.push(installProxyContextAdapter(win, () => true))
			).not.toThrow();
		}
	);
	it('ignores wrong source and requires exactly one transferred port', async () => {
		const win = documentWindow();
		cleanup.push(installProxyContextAdapter(win, () => true));
		const channel = new MessageChannel();
		const replies = vi.fn();
		channel.port1.on('message', replies);
		cleanup.push(
			() => channel.port1.close(),
			() => channel.port2.close()
		);
		const data = {
			protocol: 'proxy-context-v1',
			version: 1,
			type: 'discover',
			requestId: 'r'
		};
		emit(win, data, [channel.port2], documentWindow());
		emit(win, data, []);
		emit(win, data, [channel.port2, channel.port2]);
		await flush();
		expect(replies).not.toHaveBeenCalled();
	});
	it('ignores malformed, unrelated and duplicate capabilities replies', async () => {
		const win = documentWindow();
		let remote: MessagePort;
		cleanup.push(
			responder(win, (data, port) => {
				remote = port;
				cleanup.push(() => port.close());
				port.postMessage({
					...capabilities(data.requestId),
					version: 2
				});
				port.postMessage(capabilities('wrong'));
				port.postMessage({
					...capabilities(data.requestId),
					capabilities: []
				});
				port.postMessage(capabilities(data.requestId, 'first'));
				port.postMessage(capabilities(data.requestId, 'duplicate'));
			})
		);
		const result = discoverProxyContext(win);
		await flush();
		const session = (await result)!;
		expect(session.sessionId).toBe('first');
		cleanup.push(() => session.dispose());
		expect(remote!).toBeDefined();
	});
	it('isolates concurrent readiness requests and times out at exactly 1000ms', async () => {
		const win = documentWindow();
		let remote: MessagePort;
		const checks: any[] = [];
		cleanup.push(
			responder(win, (data, port) => {
				remote = port;
				cleanup.push(() => port.close());
				port.onmessage = event => {
					// Automatic acceptance check is separate from caller checks.
					if (event.data.requestId !== data.requestId)
						checks.push(event.data);
				};
				port.start();
				port.postMessage(capabilities(data.requestId));
			})
		);
		const result = discoverProxyContext(win);
		await flush();
		const session = (await result)!;
		cleanup.push(() => session.dispose());
		const first = session.assertReady(),
			second = session.assertReady();
		const rejected = expect(second).rejects.toThrow();
		const settled = vi.fn();
		second.catch(settled);
		await flush();
		expect(checks).toHaveLength(2);
		expect(checks[0].requestId).not.toBe(checks[1].requestId);
		remote!.postMessage({
			...checks[1],
			type: 'ready',
			sessionId: 'wrong'
		});
		remote!.postMessage({
			...checks[1],
			type: 'ready',
			requestId: 'wrong'
		});
		remote!.postMessage({ ...checks[1], type: 'ready', version: 2 });
		remote!.postMessage({ ...checks[1], type: 'ready', extra: true });
		remote!.postMessage({ ...checks[0], type: 'ready' });
		await flush();
		await first;
		await vi.advanceTimersByTimeAsync(999);
		expect(settled).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		await rejected;
		remote!.postMessage({ ...checks[1], type: 'ready' });
		await flush();
	});
	it.each(['dispose', 'pagehide', 'pageshow', 'adapter teardown'])(
		'invalidates pending and future checks on %s',
		async action => {
			const win = documentWindow();
			let ready = true;
			const uninstall = installProxyContextAdapter(win, () => ready);
			cleanup.push(uninstall);
			const result = discoverProxyContext(win);
			await flush();
			const session = (await result)!;
			cleanup.push(() => session.dispose());
			const pending = session.assertReady();
			const rejected = expect(pending).rejects.toThrow();
			if (action === 'dispose') session.dispose();
			else if (action === 'adapter teardown') uninstall();
			else {
				const event = new Event(action);
				Object.assign(event, { persisted: true });
				win.dispatchEvent(event);
			}
			await flush();
			await vi.advanceTimersByTimeAsync(1000);
			await rejected;
			await expect(session.assertReady()).rejects.toThrow();
			if (action === 'pageshow') {
				ready = true;
				const next = discoverProxyContext(win);
				await flush();
				const fresh = (await next)!;
				expect(fresh.sessionId).not.toBe(session.sessionId);
				cleanup.push(() => fresh.dispose());
			}
		}
	);
	it('blocks readiness when the adapter loses hooks', async () => {
		const win = documentWindow();
		let ready = true;
		cleanup.push(installProxyContextAdapter(win, () => ready));
		const result = discoverProxyContext(win);
		await flush();
		const session = (await result)!;
		cleanup.push(() => session.dispose());
		ready = false;
		const check = session.assertReady();
		const rejected = expect(check).rejects.toThrow();
		await flush();
		await rejected;
		ready = true;
		await expect(session.assertReady()).rejects.toThrow();
	});
	it('ignores late discovery replies and closes its local port on timeout', async () => {
		const win = documentWindow();
		let remote: MessagePort;
		let requestId: string;
		const closes: ReturnType<typeof vi.spyOn>[] = [];
		Object.defineProperty(win, 'MessageChannel', {
			value: class extends MessageChannel {
				constructor() {
					super();
					closes.push(vi.spyOn(this.port1, 'close'));
				}
			}
		});
		cleanup.push(
			responder(win, (data, port) => {
				remote = port;
				requestId = data.requestId;
				cleanup.push(() => port.close());
			})
		);
		const result = discoverProxyContext(win);
		const settled = vi.fn();
		result.then(settled);
		await flush();
		await vi.advanceTimersByTimeAsync(1500);
		expect(await result).toBeNull();
		expect(closes[0]).toHaveBeenCalledOnce();
		remote!.postMessage(capabilities(requestId!));
		await flush();
		expect(settled).toHaveBeenCalledOnce();
	});
	it.each(['discovery', 'capabilities'])(
		'releases the actual adapter endpoint when %s loses the client deadline race',
		async delayed => {
			const win = documentWindow();
			let deliver: () => void = () => {};
			let remote: MessagePort;
			let close: ReturnType<typeof vi.spyOn>;
			cleanup.push(
				responder(win, (_data, port) => {
					remote = port;
					close = vi.spyOn(port, 'close');
					if (delayed === 'capabilities') {
						const post = port.postMessage.bind(port);
						vi.spyOn(port, 'postMessage').mockImplementation(
							data => {
								if (data.type === 'capabilities')
									deliver = () => post(data);
								else post(data);
							}
						);
					}
				})
			);
			cleanup.push(installProxyContextAdapter(win, () => true));
			if (delayed === 'discovery') {
				win.postMessage = (
					data: unknown,
					_origin?: unknown,
					ports: Transferable[] = []
				) => {
					const cloned = structuredClone(
						{ data, ports },
						{ transfer: ports }
					);
					deliver = () => emit(win, cloned.data, cloned.ports);
				};
			}
			const result = discoverProxyContext(win);
			await flush();
			await vi.advanceTimersByTimeAsync(1500);
			expect(await result).toBeNull();
			deliver();
			await flush();
			if (delayed === 'discovery') {
				expect(remote!.onmessage).not.toBeNull();
				await vi.advanceTimersByTimeAsync(1499);
				expect(close!).not.toHaveBeenCalled();
				await vi.advanceTimersByTimeAsync(1);
			}
			expect(remote!.onmessage).toBeNull();
			expect(remote!.onmessageerror).toBeNull();
			expect(close!).toHaveBeenCalledOnce();
			expect(vi.getTimerCount()).toBe(0);
		}
	);
	it('automatically checks acceptance with the existing schema and preserves idle sessions', async () => {
		const win = documentWindow();
		let requestId: string;
		let remote: MessagePort;
		const received: unknown[] = [];
		cleanup.push(
			responder(win, (data, port) => {
				requestId = data.requestId;
				remote = port;
				port.addEventListener('message', event =>
					received.push(event.data)
				);
			})
		);
		cleanup.push(installProxyContextAdapter(win, () => true));
		const result = discoverProxyContext(win);
		await flush();
		const session = (await result)!;
		cleanup.push(() => session.dispose());
		expect(received).toEqual([
			{
				protocol: 'proxy-context-v1',
				version: 1,
				type: 'check',
				requestId: requestId!,
				sessionId: session.sessionId
			}
		]);
		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(15000);
		expect(remote!.onmessage).not.toBeNull();
		const check = session.assertReady();
		await flush();
		await check;
	});
	it('does not accept malformed or wrong-session checks and clears the acceptance timer on teardown', async () => {
		const win = documentWindow();
		const uninstall = installProxyContextAdapter(win, () => true);
		cleanup.push(uninstall);
		const endpoints: MessagePort[] = [];
		cleanup.push(responder(win, (_data, port) => endpoints.push(port)));
		const channel = new MessageChannel();
		const replies: any[] = [];
		channel.port1.on('message', data => replies.push(data));
		cleanup.push(() => channel.port1.close());
		win.postMessage(
			{
				protocol: 'proxy-context-v1',
				version: 1,
				type: 'discover',
				requestId: 'r'
			},
			'*',
			[channel.port2 as unknown as Transferable]
		);
		await flush();
		const check = {
			protocol: 'proxy-context-v1',
			version: 1,
			type: 'check',
			requestId: 'r',
			sessionId: replies[0].sessionId
		};
		channel.port1.postMessage({ ...check, sessionId: 'wrong' });
		channel.port1.postMessage({ ...check, extra: true });
		channel.port1.postMessage({ ...check, type: 'ready' });
		await flush();
		await vi.advanceTimersByTimeAsync(1499);
		expect(endpoints[0].onmessage).not.toBeNull();
		await vi.advanceTimersByTimeAsync(1);
		expect(endpoints[0].onmessage).toBeNull();
		expect(endpoints[0].onmessageerror).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
		const next = new MessageChannel();
		cleanup.push(() => next.port1.close());
		win.postMessage(
			{
				protocol: 'proxy-context-v1',
				version: 1,
				type: 'discover',
				requestId: 'next'
			},
			'*',
			[next.port2 as unknown as Transferable]
		);
		await flush();
		expect(vi.getTimerCount()).toBe(1);
		uninstall();
		expect(endpoints[1].onmessage).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});
	it('client disposal releases the adapter port and is idempotent', async () => {
		const win = documentWindow();
		const closed = vi.fn();
		let remote: MessagePort;
		// Observe the actual received endpoint, not the detached sending endpoint.
		cleanup.push(
			responder(win, (_data, port) => {
				remote = port;
				(
					port as unknown as import('node:worker_threads').MessagePort
				).on('close', closed);
			})
		);
		cleanup.push(installProxyContextAdapter(win, () => true));
		const result = discoverProxyContext(win);
		await flush();
		const session = (await result)!;
		session.dispose();
		session.dispose();
		await flush();
		expect(closed).toHaveBeenCalledOnce();
		expect(remote!.onmessage).toBeNull();
		expect(remote!.onmessageerror).toBeNull();
	});
	it('duplicate adapters cannot replace or invalidate the selected session', async () => {
		const win = documentWindow();
		const first = installProxyContextAdapter(win, () => true);
		const second = installProxyContextAdapter(win, () => true);
		cleanup.push(first, second);
		const result = discoverProxyContext(win);
		await flush();
		const session = (await result)!;
		cleanup.push(() => session.dispose());
		second();
		await flush();
		const check = session.assertReady();
		await flush();
		await check;
	});
	it('adapter rejects wrong-session and malformed readiness requests', async () => {
		const win = documentWindow();
		cleanup.push(installProxyContextAdapter(win, () => true));
		const channel = new MessageChannel();
		const replies: any[] = [];
		channel.port1.on('message', data => replies.push(data));
		cleanup.push(
			() => channel.port1.close(),
			() => channel.port2.close()
		);
		win.postMessage(
			{
				protocol: 'proxy-context-v1',
				version: 1,
				type: 'discover',
				requestId: 'r'
			},
			'*',
			[channel.port2 as unknown as Transferable]
		);
		await flush();
		expect(replies).toHaveLength(1);
		const sessionId = replies[0].sessionId;
		const check = {
			protocol: 'proxy-context-v1',
			version: 1,
			type: 'check',
			requestId: 'check',
			sessionId
		};
		channel.port1.postMessage({ ...check, sessionId: 'wrong' });
		channel.port1.postMessage({ ...check, version: 2 });
		channel.port1.postMessage({ ...check, extra: true });
		await flush();
		expect(replies).toHaveLength(1);
		channel.port1.postMessage(check);
		await flush();
		expect(replies[1]).toEqual({ ...check, type: 'ready' });
	});
	it('aborts pending discovery on teardown and removes lifecycle listeners', async () => {
		const win = documentWindow();
		const remove = vi.spyOn(win, 'removeEventListener');
		const result = discoverProxyContext(win);
		win.dispatchEvent(new Event('pagehide'));
		expect(await result).toBeNull();
		expect(remove).toHaveBeenCalledWith('pagehide', expect.any(Function));
		expect(remove).toHaveBeenCalledWith('pageshow', expect.any(Function));
		expect(vi.getTimerCount()).toBe(0);
	});
	it('resolves null if channel construction or transfer fails', async () => {
		const win = documentWindow();
		Object.defineProperty(win, 'MessageChannel', {
			value: class {
				constructor() {
					throw new Error('unavailable');
				}
			}
		});
		expect(await discoverProxyContext(win)).toBeNull();
		const broken = documentWindow();
		broken.postMessage = () => {
			throw new Error('transfer failed');
		};
		expect(await discoverProxyContext(broken)).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});
});
