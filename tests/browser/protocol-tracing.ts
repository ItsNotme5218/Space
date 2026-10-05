import type { Page, TestInfo } from '@playwright/test';
import { traceRendering } from './render-tracing';
import { traceCpu } from './cpu-tracing';
import { traceReadinessTimers } from './timer-tracing';

// Diagnostic copies only: never change wire data, dispatch, deadlines or readiness.
export async function traceProtocol(page: Page, testInfo: TestInfo) {
	const saveCpu = await traceCpu(page, testInfo);
	const events: unknown[] = [];
	page.on('console', message => {
		if (message.text().startsWith('SPACE_PROTOCOL_TRACE ')) {
			events.push(
				JSON.parse(message.text().slice('SPACE_PROTOCOL_TRACE '.length))
			);
		}
	});
	await page.addInitScript(() => {
		const ports = new WeakMap<MessagePort, number>();
		let nextPort = 0;
		const record = (event: string, details: object = {}) => {
			const state = (window as any)[
				Symbol.for('proxy-context-v1.document')
			];
			console.debug(
				'SPACE_PROTOCOL_TRACE ' +
					JSON.stringify({
						event,
						time: performance.now(),
						origin: performance.timeOrigin,
						document: location.href,
						state: state
							? {
									ready: state.ready,
									disposed: state.disposed,
									currentDocument: state.document === document
								}
							: null,
						mode: (window as any).proxy?.mode,
						...details
					})
			);
		};
		const logical = (data: any) => {
			while (data?.$scramjet$data) data = data.$scramjet$data;
			return data?.protocol === 'proxy-context-v1' ? data : null;
		};
		const observe = (port: MessagePort) => {
			if (!ports.has(port)) {
				ports.set(port, ++nextPort);
				port.addEventListener('message', event => {
					const message = logical(event.data);
					if (message)
						record('receive', { port: ports.get(port), message });
				});
			}
			return ports.get(port);
		};
		const post = MessagePort.prototype.postMessage;
		MessagePort.prototype.postMessage = function (
			data: any,
			...args: any[]
		) {
			const port = observe(this),
				message = logical(data);
			if (message)
				record('send', { port, message, stack: new Error().stack });
			return (post as any).call(this, data, ...args);
		};
		const start = MessagePort.prototype.start;
		MessagePort.prototype.start = function () {
			observe(this);
			return start.call(this);
		};
		addEventListener('message', event => {
			const message = logical(event.data);
			if (message) {
				for (const port of event.ports) observe(port);
				record('window-receive', { message });
			}
		});
		for (const type of ['pagehide', 'pageshow']) {
			addEventListener(type, event =>
				record(type, {
					persisted: (event as PageTransitionEvent).persisted
				})
			);
		}
		new PerformanceObserver(list => {
			for (const task of list.getEntries())
				record('longtask', {
					start: task.startTime,
					duration: task.duration
				});
		}).observe({ type: 'longtask', buffered: true });
	});
	await traceReadinessTimers(page);
	if (process.env.SPACE_E2E_CPU === '1') await traceRendering(page);
	return async () => {
		await testInfo.attach('protocol-boundaries', {
			body: JSON.stringify(events, null, 2),
			contentType: 'application/json'
		});
		await saveCpu();
	};
}
