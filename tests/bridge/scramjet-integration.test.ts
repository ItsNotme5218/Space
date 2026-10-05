import { afterEach, describe, expect, it } from 'vitest';
import { engineFixture, svg } from '../fixtures/scramjet.mjs';

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach(fn => fn()));
async function installer() {
	// Dynamic import lets RED report the missing interface as an assertion.
	const path = '../../src/bridge/scramjet-adapter.ts';
	const module = await import(/* @vite-ignore */ path).catch(() => ({}));
	expect(
		module.installScramjetProxyContext,
		'required host adapter interface'
	).toBeTypeOf('function');
	return module.installScramjetProxyContext;
}
describe('actual installed Scramjet response pipeline', () => {
	for (const cached of [false, true])
		it(`adapts an active SVG with real rewriteHtml (cache=${cached})`, async () => {
			const install = await installer();
			const fixture = engineFixture();
			cleanups.push(fixture.close);
			const { win, controller, engine } = fixture;
			Object.assign(globalThis, {
				$scramjet: engine,
				DOMParser: win.DOMParser
			});
			const dispose = install(controller, '/*document responder*/');
			cleanups.push(dispose);
			const frame = controller.createFrame();
			const result = await fixture.response(
				frame,
				svg,
				'image/svg+xml',
				'iframe',
				cached
			);
			expect(result.headers.get('content-type')).toBe(
				'text/html; charset=utf-8'
			);
			expect(result.headers.get('etag')).toBeNull();
			expect(result.headers.get('content-length')).toBeNull();
			expect(result.body).toContain('<foreignObject');
			expect(result.body).toContain('</iframe>');
			expect(result.body).toContain(
				encodeURIComponent(
					'https://space.example/index.html?view=games'
				)
			);
			expect(result.body.indexOf('data:text/javascript')).toBeLessThan(
				result.body.indexOf('/engine.js')
			);
		});
	it('preserves inert SVG, image destinations, and later installers on disposal', async () => {
		const install = await installer();
		const fixture = engineFixture();
		cleanups.push(fixture.close);
		Object.assign(globalThis, {
			$scramjet: fixture.engine,
			DOMParser: fixture.win.DOMParser
		});
		const before = fixture.controller.createFrame;
		const dispose = install(fixture.controller, '/*responder*/');
		const frame = fixture.controller.createFrame();
		const inert =
			'<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
		const result = await fixture.response(frame, inert);
		expect(result.headers.get('content-type')).toBe('image/svg+xml');
		expect(await new Response(result.body).text()).toBe(inert);
		const later = function () {
			return before.call(fixture.controller);
		};
		fixture.controller.createFrame = later;
		dispose();
		dispose();
		expect(fixture.controller.createFrame).toBe(later);
	});
	it('does not adapt an active SVG fetched as an image', async () => {
		const install = await installer();
		const fixture = engineFixture();
		cleanups.push(fixture.close);
		Object.assign(globalThis, {
			$scramjet: fixture.engine,
			DOMParser: fixture.win.DOMParser
		});
		cleanups.push(install(fixture.controller, '/*responder*/'));
		const result = await fixture.response(
			fixture.controller.createFrame(),
			svg,
			'image/svg+xml',
			'image'
		);
		expect(result.headers.get('content-type')).toBe('image/svg+xml');
		expect(await new Response(result.body).text()).toBe(svg);
	});
	it('fails visibly on malformed recognized wrappers and bounded document bodies', async () => {
		const install = await installer();
		const fixture = engineFixture();
		cleanups.push(fixture.close);
		Object.assign(globalThis, {
			$scramjet: fixture.engine,
			DOMParser: fixture.win.DOMParser
		});
		cleanups.push(install(fixture.controller, '/*responder*/'));
		for (const body of [
			svg.replace('</svg>', ''),
			'<!DOCTYPE svg>' + svg,
			svg.replace(
				'src="./index.html?view=games"',
				'src="javascript:alert(1)"'
			),
			svg + ' '.repeat(256 * 1024)
		]) {
			const result = await fixture.response(
				fixture.controller.createFrame(),
				body
			);
			expect(result.status).toBe(502);
			expect(result.headers.get('content-type')).toBe(
				'text/plain; charset=utf-8'
			);
			expect(result.body).toContain('Unable to load active SVG wrapper');
		}
	});
});
