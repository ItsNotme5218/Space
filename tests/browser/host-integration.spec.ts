import { test, expect } from '@playwright/test';
import { acceptanceFixture } from '../fixtures/serve.mjs';
import { mountedApp, uiGame } from './acceptance-utils';
import { traceProtocol } from './protocol-tracing';
test.beforeEach(async ({ page }) => {
	await page.routeWebSocket(/wss?:\/\/(?!127\.0\.0\.1)/, socket =>
		socket.close()
	);
});
for (const host of ['Nebula', 'Daydream'])
	for (const shoestring of [false, true])
		for (const entry of ['html', 'svg']) {
			test(`${host}: ${shoestring ? 'shoestring' : 'Space'} ${entry} real-controller launch/reload and fail-closed loss`, async ({
				page
			}, testInfo) => {
				test.setTimeout(150000);
				const saveProtocol = await traceProtocol(page, testInfo);
				const fixture = await acceptanceFixture({
					host,
					shoestring,
					entry
				});
				const errors: string[] = [],
					workers: string[] = [],
					navigations: string[] = [];
				page.on('pageerror', e => errors.push(e.message));
				page.on('worker', w => workers.push(w.url()));
				page.on('request', r => {
					if (r.isNavigationRequest()) navigations.push(r.url());
				});
				try {
					await page.goto(fixture.url);
					const app = await mountedApp(page);
					await expect
						.poll(() =>
							app.evaluate(() => (window as any).proxy?.mode)
						)
						.toBe('delegated');
					expect(
						await app.evaluate(() => !!(window as any).proxy.local)
					).toBe(false);
					await app
						.locator('#app-host [title="Library ready"]')
						.waitFor({ timeout: 30000 });
					expect(
						fixture.requests.some(
							r =>
								r.kind === 'host-transport' &&
								r.url.includes(
									'gn-math/assets@latest/zones.json'
								)
						)
					).toBe(true);
					expect(
						fixture.requests.some(
							r =>
								r.kind === 'host-transport' &&
								r.url.includes('truffled.lol')
						)
					).toBe(true);
					await app
						.locator('#app-host input[placeholder="Search games"]')
						.fill('Controlled acceptance game');
					await expect(
						app
							.locator('#app-host')
							.getByText('Controlled acceptance game', {
								exact: true
							})
					).toHaveCount(1);
					await uiGame(page, app, fixture.gameUrl);
					expect(
						await page.evaluate(
							urls =>
								urls.some(url => {
									const path = new URL(url).pathname;
									return (
										path.startsWith(
											(window as any).frame.prefix
										) &&
										(window as any).controller.config.codec
											.decode(
												path.slice(
													(window as any).frame.prefix
														.length
												)
											)
											.includes('/game/index.html')
									);
								}),
							navigations
						)
					).toBe(true);
					expect(
						fixture.requests.some(
							r =>
								r.kind === 'host-transport' &&
								/\/(?:s\/|c\/|u\/|l\/|ep\/|b\/|w\/|sw\.js|bootstrap-sw\.js)/.test(
									new URL(r.url).pathname
								)
						)
					).toBe(false);
					expect(workers).toEqual([]);
					expect(fixture.requests.some(r => r.kind === 'wisp')).toBe(
						false
					);
					await page.evaluate(() => (window as any).disposeAdapter());
					expect(
						await app.evaluate(async url => {
							try {
								await (window as any).proxy.navigate(
									document.createElement('iframe'),
									url
								);
								return false;
							} catch {
								return true;
							}
						}, fixture.gameUrl + '/lost')
					).toBe(true);
					expect(errors).toEqual([]);
					await page.evaluate(() => {
						(window as any).actualRestore = null;
						addEventListener('pageshow', e => {
							(window as any).actualRestore = e.persisted;
						});
					});
					await page.goto(fixture.hostOrigin + '/away');
					await page.goBack();
					await page.waitForFunction(
						() =>
							(window as any).hostReady ||
							(window as any).hostError
					);
					const bfcache = await page.evaluate(() => ({
						persisted: (window as any).actualRestore === true,
						reasons:
							(
								performance.getEntriesByType(
									'navigation'
								)[0] as any
							)?.notRestoredReasons?.toJSON() ?? null
					}));
					await testInfo.attach('genuine-bfcache-attempt', {
						body: JSON.stringify({
							status: bfcache.persisted
								? 'admitted (UI restoration not asserted)'
								: 'DENIED, not an acceptance pass',
							...bfcache
						}),
						contentType: 'application/json'
					});
				} finally {
					await saveProtocol();
					await testInfo.attach('controller-evidence', {
						body: JSON.stringify(
							{
								requests: fixture.requests,
								workers,
								errors,
								navigations,
								hooks: await page
									.evaluate(() => (window as any).hooks)
									.catch(() => null)
							},
							null,
							2
						),
						contentType: 'application/json'
					});
					await fixture.close();
				}
			});
		}
test('real Daydream adapter: dropped readiness reply times out at 1000 ms without fallback', async ({
	page
}, testInfo) => {
	const saveProtocol = await traceProtocol(page, testInfo);
	test.setTimeout(90000);
	const fixture = await acceptanceFixture({ host: 'Daydream' });
	try {
		await page.goto(fixture.url);
		const app = await mountedApp(page);
		await app
			.locator('#app-host [title="Library ready"]')
			.waitFor({ timeout: 30000 });
		expect(await app.evaluate(() => (window as any).proxy.mode)).toBe(
			'delegated'
		);
		const now = new Date('2026-09-30T12:00:00Z');
		await page.clock.install({ time: now });
		// Install takes real time in existing frames. Freeze in the future before
		// starting the check, rather than asking Chromium to rewind its clock.
		await page.clock.pauseAt(new Date(now.valueOf() + 60000));
		await app.evaluate(url => {
			const original = MessagePort.prototype.postMessage;
			MessagePort.prototype.postMessage = function (
				data: any,
				...args: any[]
			) {
				let logical = data;
				while (logical?.$scramjet$data)
					logical = logical.$scramjet$data;
				if (
					logical?.protocol === 'proxy-context-v1' &&
					logical.type === 'ready'
				)
					return;
				return (original as any).call(this, data, ...args);
			};
			const iframe = document.createElement('iframe');
			iframe.id = 'deadline-game';
			document.body.appendChild(iframe);
			(window as any).timeoutResult = 'pending';
			(window as any).proxy.navigate(iframe, url).then(
				() => ((window as any).timeoutResult = 'resolved'),
				() => ((window as any).timeoutResult = 'rejected')
			);
		}, fixture.gameUrl);
		await page.clock.runFor(999);
		expect(await app.evaluate(() => (window as any).timeoutResult)).toBe(
			'pending'
		);
		await page.clock.runFor(1);
		expect(await app.evaluate(() => (window as any).timeoutResult)).toBe(
			'rejected'
		);
		expect(await app.locator('#deadline-game').getAttribute('src')).toBe(
			null
		);
		expect(await app.evaluate(() => (window as any).proxy.mode)).toBe(
			'unavailable'
		);
	} finally {
		await saveProtocol();
		await fixture.close();
	}
});
