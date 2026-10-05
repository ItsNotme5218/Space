import { expect, it, vi } from 'vitest';
import type { Frame, Page } from '@playwright/test';
import { uiGame } from '../browser/acceptance-utils';

it('acceptance waits for the reloaded document before touching the game UI', async () => {
	let release!: () => void;
	let fresh = false;
	const navigation = new Promise<void>(resolve => {
		release = () => {
			fresh = true;
			resolve();
		};
	});
	const reached = new Error('fresh document reached');
	const waitForNavigation = vi.fn(() => navigation);
	const waitFor = vi.fn(async () => {
		if (!fresh)
			throw new Error('old document used before reload completed');
		throw reached; // Stop before unrelated game assertions; test the real helper prefix.
	});
	const app = {
		evaluate: vi.fn(async () => {}),
		waitForNavigation,
		locator: vi.fn(() => ({ waitFor }))
	} as unknown as Frame;
	const outcome = uiGame(
		{} as Page,
		app,
		'https://game.test/index.html'
	).catch(error => error);
	for (let i = 0; i < 8; i++) await Promise.resolve();
	expect(waitForNavigation).toHaveBeenCalledWith({
		waitUntil: 'domcontentloaded'
	});
	expect(waitFor).not.toHaveBeenCalled();
	release();
	expect(await outcome).toBe(reached);
});
