import { expect, type Page, type Frame } from '@playwright/test';
export async function mountedApp(page: Page): Promise<Frame> {
	await expect
		.poll(
			async () => {
				for (const frame of page.frames())
					if (await frame.locator('#app-host h1').count())
						return true;
				return false;
			},
			{ timeout: 60000 }
		)
		.toBe(true);
	return (
		await Promise.all(
			page
				.frames()
				.map(async frame =>
					(await frame.locator('#app-host h1').count()) ? frame : null
				)
		)
	).find(Boolean)!;
}
export async function uiGame(page: Page, app: Frame, gameUrl: string) {
	// Populate the real saved-game store, then exercise the actual Games card/Play UI.
	await app.evaluate(async url => {
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open('space-settings');
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction('kv', 'readwrite');
			tx.objectStore('kv').put(
				{
					customGames: [
						{
							id: 'acceptance',
							name: 'Controlled acceptance game',
							url,
							tags: [],
							addedAt: Date.now()
						}
					],
					removedGameUrls: []
				},
				'savedGamesState'
			);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		db.close();
	}, gameUrl);
	// The old document still has the same search/cards. Never operate on it while
	// the requested reload is waiting on the controller/service worker.
	await Promise.all([
		app.waitForNavigation({ waitUntil: 'domcontentloaded' }),
		app.evaluate(() => location.reload())
	]);
	await app
		.locator('#app-host [title="Library ready"]')
		.waitFor({ timeout: 30000 });
	await app
		.locator('#app-host input[placeholder="Search games"]')
		.waitFor({ timeout: 30000 });
	await app
		.locator('#app-host input[placeholder="Search games"]')
		.fill('Controlled acceptance game');
	// Search uses React's deferred value; await its rendered result before a card
	// click, otherwise the deferred resetKey effect can close the expansion.
	await expect(
		app.locator('#app-host').getByText(/^[12] games? ready to play\.$/)
	).toBeVisible();
	await app
		.locator('#app-host')
		.getByText('Controlled acceptance game', { exact: true })
		.first()
		.locator('..')
		.click();
	await app
		.locator('#app-host')
		.getByRole('button', { name: 'Play', exact: true })
		.click();
	await expect
		.poll(
			async () => {
				for (const frame of app.childFrames())
					if (
						(await frame
							.locator('h1')
							.textContent({ timeout: 300 })
							.catch(() => null)) === 'Controlled acceptance game'
					)
						return true;
				return false;
			},
			{ timeout: 15000 }
		)
		.toBe(true);
	const game = (
		await Promise.all(
			app.childFrames().map(async f =>
				(await f
					.locator('h1')
					.textContent({ timeout: 300 })
					.catch(() => null)) === 'Controlled acceptance game'
					? f
					: null
			)
		)
	).find(Boolean)!;
	await expect(game.locator('#asset')).toHaveText(
		'controlled binary-independent asset'
	);
	// The old document has the same heading: observing it is not reload evidence.
	await Promise.all([
		game.waitForNavigation({ waitUntil: 'domcontentloaded' }),
		app.locator('#app-host button[title="Reload"]').click({ force: true })
	]);
	await expect(game.locator('h1')).toHaveText('Controlled acceptance game');
	await expect(game.locator('#asset')).toHaveText(
		'controlled binary-independent asset'
	);
	// A second address-bar UI navigation produces Space's real per-session history.
	const address = app.locator('#app-host input[placeholder*="enter URL"]');
	await address.click();
	await address.press('Control+A');
	await address.press('Backspace');
	await address.pressSequentially(gameUrl.replace('/index.html', '/second'));
	await address.press('Enter');
	await expect(game.locator('#level')).toHaveText('second');
	await app.locator('#app-host button[title="Back"]').click({ force: true });
	await expect(game.locator('#level')).toHaveText('first');
	await app
		.locator('#app-host button[title="Forward"]')
		.click({ force: true });
	await expect(game.locator('#level')).toHaveText('second');
	return game;
}
