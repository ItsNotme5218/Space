import { writeFile } from 'node:fs/promises';
import type { Page, TestInfo } from '@playwright/test';

export async function traceCpu(page: Page, testInfo: TestInfo) {
	if (process.env.SPACE_E2E_CPU !== '1') return async () => {};
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Profiler.enable');
	await cdp.send('Profiler.start');
	return async () => {
		const { profile } = await cdp.send('Profiler.stop');
		const path = testInfo.outputPath('cpu-profile.json');
		await writeFile(path, JSON.stringify(profile));
		await testInfo.attach('cpu-profile', {
			path,
			contentType: 'application/json'
		});
		await cdp.detach();
	};
}
