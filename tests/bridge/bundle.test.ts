import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { engineFixture } from '../fixtures/scramjet.mjs';
import { discoverProxyContext } from '../../src/bridge/client';
import { MessageChannel } from 'node:worker_threads';

describe('actual adapter bundle and Space client', () => {
	it('installs an early responder but advertises only after a document-specific real post hook', async () => {
		expect(existsSync('public/proxy-context-adapter.js')).toBe(true);
		const fixture = engineFixture();
		const { win, engine, controller } = fixture;
		Object.assign(globalThis, {
			$scramjet: engine,
			DOMParser: win.DOMParser
		});
		win.MessageChannel = MessageChannel;
		// jsdom omits the same-document source; explicitly preserve native source
		// binding in this port fixture. Real browser coverage uses native events.
		win.postMessage = (
			data: unknown,
			_origin: string,
			ports: Transferable[]
		) => {
			const cloned = structuredClone(
				{ data, ports },
				{ transfer: ports }
			);
			queueMicrotask(() =>
				win.dispatchEvent(
					new win.MessageEvent('message', {
						source: win,
						data: cloned.data,
						ports: cloned.ports
					})
				)
			);
		};
		win.eval(readFileSync('public/proxy-context-adapter.js', 'utf8'));
		const dispose = win.SpaceProxyContext.installScramjetProxyContext(
			controller,
			readFileSync('public/proxy-context-adapter.js', 'utf8')
		);
		try {
			const frame = controller.createFrame();
			const scripts =
				frame.fetchHandler.context.interface.getInjectScripts(
					{},
					{},
					{},
					(src: string) => src
				);
			win.eval(
				Buffer.from(scripts[0].split(',')[1], 'base64').toString()
			);
			const state = win[Symbol.for('proxy-context-v1.document')];
			expect(state.ready).toBe(false);
			expect(await discoverProxyContext(win)).toBeNull();
			const client = {
				global: win,
				context: {
					interface: {
						getInjectScripts: (
							_a: any,
							_b: any,
							_c: any,
							script: any
						) => [script('/existing.js')]
					}
				}
			};
			win[engine.SCRAMJETCLIENT] = client;
			await engine.Tap.dispatch(
				frame.hooks.init.post,
				{ window: win, client },
				{}
			);
			expect(state.ready).toBe(false);
			await engine.Tap.dispatch(
				frame.hooks.init.pre,
				{ window: win, client },
				{}
			);
			expect(
				client.context.interface.getInjectScripts(
					{},
					{},
					{},
					(s: string) => s
				)
			).toHaveLength(2);
			expect(state.ready).toBe(false);
			await engine.Tap.dispatch(
				frame.hooks.init.post,
				{ window: win, client: { ...client, global: {} } },
				{}
			);
			expect(state.ready).toBe(false);
			await engine.Tap.dispatch(
				frame.hooks.init.post,
				{ window: win, client },
				{}
			);
			const session = await discoverProxyContext(win);
			expect(session).not.toBeNull();
			await session!.assertReady();
			await engine.Tap.dispatch(
				frame.hooks.init.post,
				{ window: win, client },
				{}
			);
			await session!.assertReady(); // Duplicate post must not replace this generation's responder.
			win.dispatchEvent(
				new win.PageTransitionEvent('pagehide', { persisted: true })
			);
			await expect(session!.assertReady()).rejects.toThrow();
			session!.dispose();
			expect(state.ready).toBe(false);
			win.dispatchEvent(
				new win.PageTransitionEvent('pageshow', { persisted: true })
			);
			const restored = await discoverProxyContext(win);
			expect(restored).not.toBeNull();
			expect(restored!.sessionId).not.toBe(session!.sessionId);
			await restored!.assertReady();
			restored!.dispose();
			win.dispatchEvent(
				new win.PageTransitionEvent('pagehide', { persisted: true })
			);
			win[engine.SCRAMJETCLIENT] = {};
			win.dispatchEvent(
				new win.PageTransitionEvent('pageshow', { persisted: true })
			);
			expect(state.ready).toBe(false);
			expect(await discoverProxyContext(win)).toBeNull();
			win.dispatchEvent(
				new win.PageTransitionEvent('pagehide', { persisted: false })
			);
			expect(state.disposed).toBe(true);
			win[engine.SCRAMJETCLIENT] = client;
			win.dispatchEvent(
				new win.PageTransitionEvent('pageshow', { persisted: true })
			);
			expect(state.ready).toBe(false);
		} finally {
			dispose();
			fixture.close();
		}
	});
	it('coexists with existing injectors, attaches captured existing frames, and disposes idempotently', () => {
		const fixture = engineFixture();
		const { win, controller, engine } = fixture;
		win.eval(readFileSync('public/proxy-context-adapter.js', 'utf8'));
		const frame = controller.createFrame();
		const original = frame.fetchHandler.context.interface.getInjectScripts;
		frame.fetchHandler.context.interface.getInjectScripts = (
			...args: any[]
		) => ['/prior-injector.js', ...original(...args)];
		const prior = frame.fetchHandler.context.interface.getInjectScripts;
		const create = controller.createFrame;
		const dispose = win.SpaceProxyContext.installScramjetProxyContext(
			controller,
			readFileSync('public/proxy-context-adapter.js', 'utf8')
		);
		expect(
			win.SpaceProxyContext.installScramjetProxyContext(
				controller,
				'again'
			)
		).toBe(dispose);
		const output = frame.fetchHandler.context.interface.getInjectScripts(
			{},
			{},
			{},
			(s: string) => s
		);
		expect(output.slice(1)).toEqual([
			'/prior-injector.js',
			'/engine.js',
			'/bootstrap.js'
		]);
		dispose();
		dispose();
		expect(controller.createFrame).toBe(create);
		expect(frame.fetchHandler.context.interface.getInjectScripts).toBe(
			prior
		);
		fixture.close();
	});
});
