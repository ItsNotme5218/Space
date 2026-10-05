// No deadline increases, automatic retries or capability synthesis. Each run is a fresh browser.
import { chromium } from '@playwright/test';
import { acceptanceFixture } from '../fixtures/serve.mjs';
import { writeFile } from 'node:fs/promises';
const outcomes = [];
for (const host of ['Nebula', 'Daydream'])
	for (let attempt = 0; attempt < 5; attempt++) {
		const fixture = await acceptanceFixture({
			host,
			entry: 'svg',
			fontsUnavailable: process.env.SPACE_DIAGNOSTIC_NO_FONTS === '1'
		});
		const browser = await chromium.launch();
		const page = await browser.newPage();
		const errors = [];
		page.on('pageerror', e => errors.push(e.message));
		await page.routeWebSocket(/wss?:\/\/(?!127\.0\.0\.1)/, socket =>
			socket.close()
		);
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Profiler.enable');
		await cdp.send('Profiler.start');
		await page.addInitScript(() => {
			const trace = [];
			Object.defineProperty(window, 'acceptanceTrace', { value: trace });
			try {
				new PerformanceObserver(list => {
					for (const e of list.getEntries())
						trace.push({
							time: e.startTime,
							event: 'longtask',
							duration: e.duration,
							attribution: e.attribution?.map(a => ({
								name: a.name,
								containerType: a.containerType,
								containerSrc: a.containerSrc
							}))
						});
				}).observe({ type: 'longtask', buffered: true });
			} catch {}
			for (const type of ['pagehide', 'pageshow'])
				addEventListener(type, e =>
					trace.push({
						time: performance.now(),
						event: type,
						persisted: e.persisted
					})
				);
			const post = MessagePort.prototype.postMessage;
			MessagePort.prototype.postMessage = function (data, ...args) {
				let logical = data;
				while (logical?.$scramjet$data)
					logical = logical.$scramjet$data;
				if (logical?.protocol === 'proxy-context-v1')
					trace.push({
						time: performance.now(),
						direction: 'send',
						...logical
					});
				return post.call(this, data, ...args);
			};
		});
		let app;
		try {
			await page.goto(fixture.url);
			await page.waitForFunction(
				() => window.hostReady || window.hostError
			);
			for (let n = 0; n < 150; n++) {
				app = page
					.frames()
					.find(
						f => f.parentFrame()?.parentFrame() === page.mainFrame()
					);
				if (app) break;
				await new Promise(r => setTimeout(r, 100));
			}
			await app.waitForFunction(() => window.proxy?.mode === 'delegated');
			await app.locator('#app-host h1').waitFor();
			const result = await app.evaluate(async url => {
				const iframe = document.createElement('iframe');
				document.body.appendChild(iframe);
				const start = performance.now();
				let error = null;
				try {
					await proxy.navigate(iframe, url);
				} catch (e) {
					error = String(e);
				}
				return {
					error,
					duration: performance.now() - start,
					mode: proxy.mode,
					src: iframe.getAttribute('src'),
					state: {
						ready: window[Symbol.for('proxy-context-v1.document')]
							?.ready,
						disposed:
							window[Symbol.for('proxy-context-v1.document')]
								?.disposed
					},
					trace: window.acceptanceTrace
				};
			}, fixture.gameUrl);
			outcomes.push({
				host,
				attempt,
				...result,
				hooks: await page.evaluate(() => window.hooks),
				errors
			});
		} catch (e) {
			outcomes.push({ host, attempt, error: String(e), errors });
		} finally {
			const { profile } = await cdp.send('Profiler.stop');
			if (outcomes.at(-1)?.error) {
				const path = `/tmp/opencode/task10-${host}-${attempt}-cpu.json`;
				await writeFile(path, JSON.stringify(profile));
				outcomes.at(-1).cpuProfile = path;
			}
			await browser.close();
			await fixture.close();
		}
	}
console.log(JSON.stringify(outcomes, null, 2));
if (outcomes.some(o => o.error)) process.exitCode = 1;
