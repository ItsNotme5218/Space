// Separate optional third-party smoke; not part of controlled acceptance or a deployment.
import { chromium } from '@playwright/test';
import { acceptanceFixture } from '../fixtures/serve.mjs';
import { writeFile } from 'node:fs/promises';
const target = 'https://gabrielecirulli.github.io/2048/';
const fixture = await acceptanceFixture({ externalSmoke: true });
const browser = await chromium.launch({
	args: ['--ignore-certificate-errors']
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(
	config => {
		globalThis.__SPACE_RUNTIME_CONFIG__ = config;
	},
	{ ...fixture.spaceConfig, wispUrl: fixture.wispUrl, apiOrigin: null }
);
await page.route('**/*', route =>
	new URL(route.request().url()).hostname === '127.0.0.1'
		? route.continue()
		: route.abort()
);
await page.routeWebSocket(/wss?:\/\/(?!127\.0\.0\.1)/, socket =>
	socket.close()
);
let result;
try {
	await page.goto(fixture.url);
	await page.waitForFunction(
		() => window.proxy?.mode === 'standalone',
		{},
		{ timeout: 30000 }
	);
	await page.evaluate(async url => {
		const iframe = document.createElement('iframe');
		document.body.appendChild(iframe);
		await proxy.navigate(iframe, url);
	}, target);
	const until = Date.now() + 30000;
	let heading = null;
	while (Date.now() < until) {
		for (const frame of page.mainFrame().childFrames()) {
			heading = await frame
				.locator('h1')
				.textContent({ timeout: 300 })
				.catch(() => null);
			if (heading?.trim() === '2048') break;
		}
		if (heading?.trim() === '2048') break;
		await new Promise(r => setTimeout(r, 100));
	}
	if (heading?.trim() !== '2048')
		throw Error('External game did not render 2048 within 30000 ms');
	result = {
		status: 'PASS',
		target,
		heading,
		through: 'actual Space Scramjet + localhost Wisp',
		errors
	};
} catch (error) {
	result = {
		status: 'FAIL',
		target,
		error: String(error),
		errors,
		frames: page.frames().map(f => f.url())
	};
	process.exitCode = 1;
} finally {
	await browser.close();
	await fixture.close();
}
console.log(JSON.stringify(result, null, 2));
await writeFile(
	'/tmp/opencode/task10-external-result.json',
	JSON.stringify(result, null, 2)
);
