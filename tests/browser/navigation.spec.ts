import { test, expect } from '@playwright/test';
import { acceptanceFixture } from '../fixtures/serve.mjs';
import { mountedApp, uiGame } from './acceptance-utils';
test.beforeEach(async ({ page }) => {
	await page.routeWebSocket(/wss?:\/\/(?!127\.0\.0\.1)/, socket =>
		socket.close()
	);
});
for (const entry of ['html', 'svg'])
	test(`standalone ${entry}: localhost Wisp, UI launch and reload`, async ({
		page
	}) => {
		test.setTimeout(90000);
		const fixture = await acceptanceFixture({ entry });
		await page.addInitScript(
			config => {
				(window as any).__SPACE_RUNTIME_CONFIG__ = config;
			},
			{
				...fixture.spaceConfig,
				wispUrl: fixture.wispUrl,
				apiOrigin: null
			}
		);
		await page.route('**/*', r =>
			new URL(r.request().url()).hostname === '127.0.0.1'
				? r.continue()
				: r.abort()
		);
		try {
			await page.goto(fixture.url);
			const app = await mountedApp(page);
			await expect
				.poll(() => app.evaluate(() => (window as any).proxy.mode))
				.toBe('standalone');
			const game = await uiGame(page, app, fixture.gameUrl);
			expect(game.url()).toMatch(/\/(?:s|u)\/res\//);
			expect(fixture.requests.some(r => r.kind === 'wisp')).toBe(true);
			expect(
				fixture.requests.some(r => r.path === '/game/asset.txt')
			).toBe(true);
		} finally {
			await fixture.close();
		}
	});
test('standalone real app remains readable and navigable with unavailable fonts', async ({
	page
}) => {
	test.setTimeout(90000);
	const fixture = await acceptanceFixture({ fontsUnavailable: true });
	await page.addInitScript(
		config => {
			(window as any).__SPACE_RUNTIME_CONFIG__ = config;
		},
		{ ...fixture.spaceConfig, wispUrl: fixture.wispUrl, apiOrigin: null }
	);
	await page.route('**/*', r =>
		new URL(r.request().url()).hostname === '127.0.0.1'
			? r.continue()
			: r.abort()
	);
	try {
		await page.goto(fixture.url);
		const app = await mountedApp(page);
		await expect(app.locator('#app-host h1')).toHaveText('Games');
		await uiGame(page, app, fixture.gameUrl);
		expect(
			fixture.requests.some(r => /\.(?:woff2?|ttf)$/.test(r.path))
		).toBe(true);
	} finally {
		await fixture.close();
	}
});
