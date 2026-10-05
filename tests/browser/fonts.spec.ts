import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
	await page.routeWebSocket(/wss?:\/\/(?!127\.0\.0\.1)/, socket =>
		socket.close()
	);
});

test('initial font presentation batches cascade reads before writes (no per-label layout thrash)', async ({
	page
}) => {
	await page.addInitScript(() => {
		const trace: string[] = [];
		(window as any).fontLayoutTrace = trace;
		const read = window.getComputedStyle;
		window.getComputedStyle = function (...args) {
			if (!(window as any).disposeFonts) trace.push('read');
			return read.apply(window, args);
		};
		const write = CSSStyleDeclaration.prototype.setProperty;
		CSSStyleDeclaration.prototype.setProperty = function (
			name,
			value,
			priority
		) {
			if (
				name.startsWith('--space-font-') &&
				!(window as any).disposeFonts
			)
				trace.push('write');
			return write.call(this, name, value, priority);
		};
	});
	await page.goto('/tests/fixtures/fonts.html');
	await expect(page.locator('body')).toHaveAttribute(
		'data-font-settled',
		'true'
	);
	const trace = await page.evaluate(
		() => (window as any).fontLayoutTrace as string[]
	);
	expect(trace.filter(item => item === 'write').length).toBeGreaterThan(2);
	expect(trace.slice(trace.indexOf('write'))).not.toContain('read');
});

test('viewport-only resize refreshes responsive font size without React activity', async ({
	page
}) => {
	await page.setViewportSize({ width: 800, height: 700 });
	await page.goto('/tests/fixtures/fonts.html');
	const label = page.locator('#responsive-size');
	await expect(label).toHaveAttribute('data-space-font', /.+/);
	const size = () =>
		label.evaluate(e => getComputedStyle(e, '::after').fontSize);
	await expect.poll(size).toBe('16px');
	await page.setViewportSize({ width: 1000, height: 700 });
	expect(
		await page.evaluate(() => matchMedia('(min-width: 900px)').matches)
	).toBe(true);
	await expect.poll(size).toBe('32px');
	await page.setViewportSize({ width: 800, height: 700 });
	await expect.poll(size).toBe('16px');
	await expect(label).toHaveText('Responsive Size');
	await expect(page.getByRole('textbox', { name: 'URL input' })).toHaveValue(
		'https://example.org/game?q=hello'
	);
});

test('viewport-only resize respects responsive display none and restores visibility', async ({
	page
}) => {
	await page.setViewportSize({ width: 800, height: 700 });
	await page.goto('/tests/fixtures/fonts.html');
	const label = page.locator('#responsive-hidden');
	await expect(label).toHaveAttribute('data-space-font', /.+/);
	await expect(label).toBeVisible();
	await page.setViewportSize({ width: 1000, height: 700 });
	await expect(label).toBeHidden();
	expect(await label.evaluate(e => getComputedStyle(e).display)).toBe('none');
	await page.setViewportSize({ width: 800, height: 700 });
	await expect(label).toBeVisible();
	await expect(label).toHaveText('Responsive Visibility');
});

test('media-only refresh is coalesced, loop-safe and canceled on disposal', async ({
	page
}) => {
	// Track native listener ownership so a disposed no-op callback is not
	// mistaken for actual listener cleanup. This instrumentation is test-only.
	await page.addInitScript(() => {
		const active = new Map<
			EventTarget,
			Set<EventListenerOrEventListenerObject>
		>();
		const add = EventTarget.prototype.addEventListener;
		const remove = EventTarget.prototype.removeEventListener;
		const relevant = (target: EventTarget, type: string) =>
			(target === window && type === 'resize') ||
			(target instanceof MediaQueryList && type === 'change');
		EventTarget.prototype.addEventListener = function (
			type,
			callback,
			options
		) {
			if (callback && relevant(this, type)) {
				if (!active.has(this)) active.set(this, new Set());
				active.get(this)!.add(callback);
			}
			add.call(this, type, callback, options);
		};
		EventTarget.prototype.removeEventListener = function (
			type,
			callback,
			options
		) {
			if (callback && relevant(this, type))
				active.get(this)?.delete(callback);
			remove.call(this, type, callback, options);
		};
		Object.defineProperty(window, 'fontStyleListeners', {
			value: () => ({
				resize: active.get(window)?.size || 0,
				media: [...active]
					.filter(([target]) => target instanceof MediaQueryList)
					.reduce((sum, [, listeners]) => sum + listeners.size, 0)
			})
		});
	});
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.goto('/tests/fixtures/fonts.html');
	const label = page.locator('#media-size');
	await expect(label).toHaveAttribute('data-space-font', /.+/);
	const listeners = () =>
		page.evaluate(() =>
			(
				window as unknown as {
					fontStyleListeners: () => { resize: number; media: number };
				}
			).fontStyleListeners()
		);
	expect(await listeners()).toEqual({ resize: 1, media: 2 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await expect
		.poll(() =>
			label.evaluate(e => getComputedStyle(e, '::after').fontSize)
		)
		.toBe('28px');
	const mutations = await label.evaluate(async element => {
		let count = 0;
		const observer = new MutationObserver(records => {
			count += records.length;
		});
		observer.observe(element, {
			attributes: true,
			attributeFilter: ['data-space-font']
		});
		const frames = async () => {
			for (let i = 0; i < 4; i++)
				await new Promise(requestAnimationFrame);
		};
		for (let i = 0; i < 100; i++) window.dispatchEvent(new Event('resize'));
		await frames();
		const burst = count;
		await frames();
		const idle = count - burst;
		// Queue another resize refresh, then dispose BEFORE its animation frame.
		window.dispatchEvent(new Event('resize'));
		(window as unknown as { disposeFonts: () => void }).disposeFonts();
		await frames();
		count = 0;
		window.dispatchEvent(new Event('resize'));
		await frames();
		observer.disconnect();
		return { burst, idle, afterDispose: count };
	});
	expect(mutations).toEqual({ burst: 2, idle: 0, afterDispose: 0 });
	expect(await listeners()).toEqual({ resize: 0, media: 0 });
	await expect(label).not.toHaveAttribute('data-space-font');
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.setViewportSize({ width: 800, height: 700 });
	await expect(label).not.toHaveAttribute('data-space-font');
	await expect
		.poll(() => label.evaluate(e => getComputedStyle(e).fontSize))
		.toBe('16px');
	await expect(label).toHaveText('Media Preference');
});

test('shadow presentation survives repeated same-node React labels and navigation without encoding data', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('/tests/fixtures/fonts.html');
	const label = page.locator('#label');
	await expect(label).toHaveAttribute('data-space-font', /.+/);
	await label.evaluate(element => {
		(window as unknown as { originalLabel: Element }).originalLabel =
			element;
	});
	await expect(page.locator('style[data-space-font-style]')).toHaveCount(1);
	const mapping = await page.evaluate(async () =>
		(await fetch('/space-fonts.json')).json()
	);
	const encode = (value: string) =>
		[...value].map(c => mapping.encode[c] || c).join('');
	for (let i = 1; i <= 8; i++) {
		await page.getByRole('button', { name: 'Update' }).click();
		const text = i % 2 ? 'Play Again' : 'Play Game';
		await expect(label).toHaveText(text);
		expect(
			await label.evaluate(
				e =>
					e ===
					(window as unknown as { originalLabel: Element })
						.originalLabel
			)
		).toBe(true);
		await expect(label).toHaveAttribute('data-space-font', encode(text));
		const presentation = await label.evaluate(element => ({
			content: getComputedStyle(element, '::after').content,
			font: getComputedStyle(element, '::after').fontFamily,
			size: getComputedStyle(element, '::after').fontSize
		}));
		await expect(label).toBeVisible();
		expect(presentation.content).toContain(encode(text));
		expect(presentation.font).toContain('SpacePresentation');
		expect(presentation.size).not.toBe('0px');
		await page
			.getByRole('link', {
				name: i % 2 ? 'Settings' : 'Games',
				exact: true
			})
			.click();
		await expect(page.locator('h1')).toHaveAttribute(
			'data-space-font',
			encode(i % 2 ? 'Settings panel' : 'Games catalog')
		);
		await page.getByRole('button', { name: 'Resize' }).click();
		await expect
			.poll(() =>
				label.evaluate(e => getComputedStyle(e, '::after').fontSize)
			)
			.toBe(i % 2 ? '24px' : '16px');
	}
	await expect(page.getByRole('textbox', { name: 'URL input' })).toHaveValue(
		'https://example.org/game?q=hello'
	);
	await expect(
		page.getByRole('textbox', { name: 'URL input' })
	).toHaveAttribute('placeholder', 'Game URL');
	await expect(page.locator('textarea')).toHaveValue('User text');
	await page
		.getByRole('textbox', { name: 'URL input' })
		.fill('https://example.org/changed?q=Play Again');
	await expect(page.getByRole('textbox', { name: 'URL input' })).toHaveValue(
		'https://example.org/changed?q=Play Again'
	);
	await expect(
		page.getByRole('textbox', { name: 'URL input' })
	).not.toHaveAttribute('data-space-font');
	await expect(page.locator('pre')).not.toHaveAttribute('data-space-font');
	await expect(page.locator('[data-no-obfuscate]')).not.toHaveAttribute(
		'data-space-font'
	);
	await expect(page.locator('#uppercase')).not.toHaveAttribute(
		'data-space-font'
	);
	await expect(page.locator('#decorated')).not.toHaveAttribute(
		'data-space-font'
	);
	await expect(page.locator('#url')).toHaveAttribute(
		'href',
		'https://example.org/game?q=hello'
	);
	await expect(page.locator('#url')).not.toHaveAttribute('data-space-font');
	expect(
		await page.evaluate(() => localStorage.getItem('font-fixture'))
	).toBe('{"url":"https://example.org/game?q=hello","label":"Saved Game"}');
	expect(errors).toEqual([]);
	// Check actual browser-rasterized glyphs, not just an assigned font-family.
	const glyphsMatch = await page.evaluate(async mapping => {
		const font = new FontFace(
			'SourceRoboto',
			'url(/ttf/Roboto-Regular.ttf)'
		);
		await font.load();
		document.fonts.add(font);
		const raster = (text: string, family: string) => {
			const canvas = document.createElement('canvas');
			canvas.width = 64;
			canvas.height = 64;
			const context = canvas.getContext('2d')!;
			context.font = `32px ${family}`;
			context.fillText(text, 5, 40);
			return {
				pixels: [...context.getImageData(0, 0, 64, 64).data].filter(
					(_, i) => i % 4 === 3
				),
				width: context.measureText(text).width
			};
		};
		return ['A', 'a', 'G', '1', '?'].map(c => {
			const source = raster(c, 'SourceRoboto'),
				encoded = raster(mapping.encode[c], 'SpacePresentation');
			const overlap = source.pixels.reduce(
				(sum, alpha, i) => sum + Math.min(alpha, encoded.pixels[i]),
				0
			);
			const union = source.pixels.reduce(
				(sum, alpha, i) => sum + Math.max(alpha, encoded.pixels[i]),
				0
			);
			return {
				c,
				overlap: overlap / union,
				sourceWidth: source.width,
				encodedWidth: encoded.width
			};
		});
	}, mapping);
	// Original TTF is hinted; regenerated CFF outlines are not. Require the
	// same advance and >85% alpha-mask overlap instead of byte-identical pixels.
	for (const glyph of glyphsMatch) {
		expect(glyph.overlap).toBeGreaterThan(0.85);
		expect(glyph.encodedWidth).toBeCloseTo(glyph.sourceWidth, 2);
	}
	await page.evaluate(() =>
		(window as unknown as { disposeFonts: () => void }).disposeFonts()
	);
	await expect(label).not.toHaveAttribute('data-space-font');
	await expect(label).toHaveText('Play Game');
});

for (const delayed of ['mapping', 'font']) {
	test(`does not activate until ${delayed} is ready`, async ({ page }) => {
		let release!: () => void;
		const gate = new Promise<void>(resolve => {
			release = resolve;
		});
		let requested!: () => void;
		const request = new Promise<void>(resolve => {
			requested = resolve;
		});
		await page.route(
			delayed === 'mapping' ? '**/fonts/*.json' : '**/fonts/*.woff2',
			async route => {
				requested();
				await gate;
				await route.continue();
			}
		);
		await page.goto('/tests/fixtures/fonts.html');
		await request;
		await expect(page.locator('#label')).toHaveText('Play Game');
		await expect(page.locator('#label')).not.toHaveAttribute(
			'data-space-font'
		);
		release();
		await expect(page.locator('#label')).toHaveAttribute(
			'data-space-font',
			/.+/
		);
	});
}

for (const failFont of [false, true]) {
	test(`real Space shadow app keeps games/settings readable across navigation (font failure: ${failFont})`, async ({
		page
	}) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		// Controlled same-document bridge fixture avoids Wisp and local proxy boot.
		// This is a font test, not a claim of host-proxy integration coverage.
		await page.addInitScript(() => {
			window.addEventListener('message', event => {
				if (
					event.source !== window ||
					event.data?.protocol !== 'proxy-context-v1' ||
					event.data.type !== 'discover'
				)
					return;
				const port = event.ports[0];
				port.postMessage({
					...event.data,
					type: 'capabilities',
					sessionId: 'font-browser-fixture',
					capabilities: ['nested-iframe-navigation', 'document-fetch']
				});
				port.onmessage = ({ data }) =>
					port.postMessage({ ...data, type: 'ready' });
			});
		});
		await page.route('**/*', route =>
			new URL(route.request().url()).hostname === '127.0.0.1'
				? route.continue()
				: route.abort()
		);
		if (failFont)
			await page.route('**/fonts/*.woff2', route => route.abort());
		await page.goto('/?view=games');
		await expect(page.locator('#app-host')).toBeAttached();
		await expect(page.locator('#app-host h1')).toHaveText('Games');
		if (!failFont)
			await expect(page.locator('#app-host h1')).toHaveAttribute(
				'data-space-font',
				/.+/
			);
		for (let i = 0; i < 3; i++) {
			await page.mouse.move(2, 450);
			await page.locator('button:has(svg.lucide-settings)').click();
			await expect(page.locator('#app-host h1')).toHaveText('Settings');
			if (!failFont)
				await expect(page.locator('#app-host h1')).toHaveAttribute(
					'data-space-font',
					/.+/
				);
			else
				await expect(page.locator('#app-host h1')).not.toHaveAttribute(
					'data-space-font'
				);
			await expect(page.locator('#app-host h1')).toBeVisible();
			await page.mouse.move(2, 450);
			await page.locator('button:has(svg.lucide-gamepad-2)').click();
			await expect(page.locator('#app-host h1')).toHaveText('Games');
			if (!failFont)
				await expect(page.locator('#app-host h1')).toHaveAttribute(
					'data-space-font',
					/.+/
				);
			else
				await expect(page.locator('#app-host h1')).not.toHaveAttribute(
					'data-space-font'
				);
			await expect(page.locator('#app-host h1')).toBeVisible();
		}
		const bridgeReply = await page.evaluate(
			() =>
				new Promise(resolve => {
					const channel = new MessageChannel();
					channel.port1.onmessage = event => {
						resolve(event.data);
						channel.port1.close();
					};
					window.postMessage(
						{
							protocol: 'proxy-context-v1',
							version: 1,
							type: 'discover',
							requestId: 'font-wire-check'
						},
						'*',
						[channel.port2]
					);
				})
		);
		expect(bridgeReply).toEqual({
			protocol: 'proxy-context-v1',
			version: 1,
			type: 'capabilities',
			requestId: 'font-wire-check',
			sessionId: 'font-browser-fixture',
			capabilities: ['nested-iframe-navigation', 'document-fetch']
		});
		expect(errors).toEqual([]);
	});
}

test('invalid mapping and corrupt font remain readable', async ({ page }) => {
	await page.route('**/fonts/*.json', route =>
		route.fulfill({ json: { version: 1, encode: {}, decode: {} } })
	);
	await page.goto('/tests/fixtures/fonts.html');
	await expect(page.locator('body')).toHaveAttribute(
		'data-font-settled',
		'true'
	);
	await expect(page.locator('#label')).not.toHaveAttribute('data-space-font');
	await page.unroute('**/fonts/*.json');
	await page.route('**/fonts/*.woff2', route =>
		route.fulfill({ contentType: 'font/woff2', body: 'broken-font' })
	);
	await page.reload();
	await expect(page.locator('body')).toHaveAttribute(
		'data-font-settled',
		'true'
	);
	await expect(page.locator('#label')).not.toHaveAttribute('data-space-font');
	await expect(page.locator('#label')).toHaveText('Play Game');
});

for (const failed of ['mapping', 'font']) {
	test(`${failed} request failure leaves readable text and working React`, async ({
		page
	}) => {
		await page.route(
			failed === 'mapping' ? '**/fonts/*.json' : '**/fonts/*.woff2',
			route => route.abort()
		);
		await page.goto('/tests/fixtures/fonts.html');
		await expect(page.locator('body')).toHaveAttribute(
			'data-font-settled',
			'true'
		);
		await expect(page.locator('#label')).not.toHaveAttribute(
			'data-space-font'
		);
		await expect(page.locator('#label')).toHaveText('Play Game');
		expect(
			await page
				.locator('#label')
				.evaluate(e => getComputedStyle(e).fontSize)
		).not.toBe('0px');
		await page.getByRole('button', { name: 'Update' }).click();
		await expect(page.locator('#label')).toHaveText('Play Again');
		await page.getByRole('link', { name: 'Settings', exact: true }).click();
		await expect(page.locator('h1')).toHaveText('Settings panel');
	});
}
