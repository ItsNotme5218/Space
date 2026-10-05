import { expect, test } from '@playwright/test';

test('font mutation bursts yield to the browser instead of rescanning the cascade per microtask', async ({
	page
}) => {
	await page.goto('/tests/fixtures/fonts.html');
	const label = page.locator('#label');
	await expect(label).toHaveAttribute('data-space-font', /.+/);
	const result = await label.evaluate(async element => {
		// Let initialization settle, then observe real style reads without replacing
		// their results. This catches synchronous full rescans in MutationObserver.
		for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
		const computed = window.getComputedStyle;
		let reads = 0;
		window.getComputedStyle = function (...args) {
			if (args[0] === element) reads++;
			return computed.apply(this, args);
		};
		try {
			for (let i = 0; i < 20; i++) {
				element.textContent = `Updated label ${i}`;
				(element as HTMLElement).style.fontSize =
					i === 19 ? '24px' : '18px';
				await Promise.resolve();
			}
			for (let i = 0; i < 2; i++)
				await new Promise(requestAnimationFrame);
			return {
				reads,
				size: computed(element, '::after').fontSize,
				presentation: element.getAttribute('data-space-font')
			};
		} finally {
			window.getComputedStyle = computed;
		}
	});
	expect(result.reads).toBeLessThanOrEqual(3);
	expect(result.size).toBe('24px');
	expect(result.presentation).toBeTruthy();
	await expect(label).toHaveText('Updated label 19');
});
