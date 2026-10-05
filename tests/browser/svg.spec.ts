import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
	await page.routeWebSocket(/wss?:\/\/(?!127\.0\.0\.1)/, socket =>
		socket.close()
	);
});

for (const entry of ['/index.html', '/index.svg']) {
	test(`standalone ${entry} mounts real games view once`, async ({
		page
	}) => {
		await page.route('**/*', route =>
			new URL(route.request().url()).hostname === '127.0.0.1'
				? route.continue()
				: route.abort()
		);
		await page.goto(`${entry}?view=games&ordinary=kept#route?x=1`);
		if (entry.endsWith('.svg')) {
			await expect(page.locator('#status')).toBeHidden({
				timeout: 20000
			});
			// Playwright's frameLocator HTML tag-name check rejects XML XHTML
			// iframe nodes; use the native frame tree, without child-global probing.
			const frame = page
				.frames()
				.find(frame => frame.parentFrame() === page.mainFrame())!;
			await expect(frame.locator('#app-host h1')).toHaveText('Games');
			await expect(frame.locator('#app-host')).toHaveCount(1);
			const box = await page.locator('#app-frame').boundingBox();
			expect(box?.width).toBe(page.viewportSize()?.width);
			expect(box?.height).toBe(page.viewportSize()?.height);
			expect(
				await page.locator('#app-frame').getAttribute('src')
			).toContain('ordinary=kept');
			const first = await page.locator('#app-frame').getAttribute('src');
			await page.reload();
			await expect(page.locator('#status')).toBeHidden({
				timeout: 20000
			});
			expect(
				await page.locator('#app-frame').getAttribute('src')
			).not.toBe(first);
		} else
			await expect(page.locator('#app-host h1')).toHaveText('Games', {
				timeout: 20000
			});
	});
}

test('loaded non-application HTML stays loading until exact deadline', async ({
	page
}) => {
	const now = new Date('2026-09-30T12:00:00Z');
	await page.clock.install({ time: now });
	await page.clock.pauseAt(now);
	await page.route('**/index.html?*', route =>
		route.fulfill({ contentType: 'text/html', body: '<h1>not Space</h1>' })
	);
	await page.goto('/index.svg?view=games');
	await expect(page.locator('#status')).toHaveText('Loading Space…');
	await page.clock.runFor(14999);
	await expect(page.locator('#status')).toHaveText('Loading Space…');
	await page.clock.runFor(1);
	await expect(page.locator('#status')).toHaveText(
		'Unable to load Space. Please reload this page.'
	);
});
