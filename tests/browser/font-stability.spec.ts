import { expect, test } from '@playwright/test';

test('an unchanged label keeps its presentation during unrelated animation styles', async ({
	page
}) => {
	await page.goto('/tests/fixtures/fonts.html');
	const label = page.locator('#label');
	await expect(label).toHaveAttribute('data-space-font', /.+/);
	const result = await label.evaluate(async element => {
		for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
		const before = element.getAttribute('data-space-font');
		const mutations: string[] = [];
		const observer = new MutationObserver(records => {
			mutations.push(...records.map(record => record.attributeName!));
		});
		observer.observe(element, {
			attributes: true,
			attributeFilter: ['style', 'data-space-font']
		});
		element.parentElement!.style.opacity = '0.9';
		for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
		observer.disconnect();
		return {
			mutations,
			before,
			after: element.getAttribute('data-space-font'),
			size: getComputedStyle(element, '::after').fontSize
		};
	});
	// Clearing/reapplying unchanged presentation invalidates every label's layout
	// on each animation tick, even with mutation delivery coalesced per frame.
	expect(result.mutations).toEqual([]);
	expect(result.after).toBe(result.before);
	expect(result.size).toBe('16px');
	await expect(label).toHaveText('Play Game');
	await label.evaluate(element => {
		(element as HTMLElement).style.fontSize = '24px';
	});
	await expect
		.poll(() =>
			label.evaluate(
				element => getComputedStyle(element, '::after').fontSize
			)
		)
		.toBe('24px');
});

test('a presented label restores source styling when it becomes excluded', async ({
	page
}) => {
	await page.goto('/tests/fixtures/fonts.html');
	const label = page.locator('#label');
	await expect(label).toHaveAttribute('data-space-font', /.+/);
	await label.evaluate(element => {
		(element as HTMLElement).style.textTransform = 'uppercase';
	});
	await expect(label).not.toHaveAttribute('data-space-font');
	expect(
		await label.evaluate(element => getComputedStyle(element).fontSize)
	).toBe('16px');
	await expect(label).toHaveText('Play Game');
});

for (const opaque of [false, true])
	test(`imported style-attribute rules refresh presentation (opaque: ${opaque})`, async ({
		page
	}) => {
		const url = opaque
			? 'http://127.0.0.1:4180/imported-font.css'
			: '/imported-font.css';
		await page.route('**/imported-font.css', route =>
			route.fulfill({
				contentType: 'text/css',
				body: '.import-parent[style*="opacity"] #label { text-transform: uppercase; }'
			})
		);
		await page.goto('/tests/fixtures/fonts.html');
		const label = page.locator('#label');
		await expect(label).toHaveAttribute('data-space-font', /.+/);
		await label.evaluate((element, url) => {
			element.parentElement!.classList.add('import-parent');
			const style = document.createElement('style');
			style.textContent = `@import url("${url}");`;
			element.getRootNode().appendChild(style);
			(window as any).importedFontStyle = style;
		}, url);
		await expect
			.poll(() =>
				page.evaluate(() => {
					const rule = (window as any).importedFontStyle.sheet
						?.cssRules[0] as CSSImportRule;
					if (!rule?.styleSheet) return 'pending';
					try {
						return rule.styleSheet.cssRules.length
							? 'readable'
							: 'pending';
					} catch {
						return 'opaque';
					}
				})
			)
			.toBe(opaque ? 'opaque' : 'readable');
		// Ensure the sheet insertion refresh has completed before the paint-only write.
		await label.evaluate(async () => {
			for (let i = 0; i < 3; i++)
				await new Promise(requestAnimationFrame);
		});
		await expect(label).toHaveAttribute('data-space-font', /.+/);
		await label.evaluate(element => {
			element.parentElement!.style.opacity = '0.9';
		});
		await expect(label).not.toHaveAttribute('data-space-font');
		expect(
			await label.evaluate(
				element => getComputedStyle(element).textTransform
			)
		).toBe('uppercase');
	});
