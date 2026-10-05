import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/browser',
	workers: 1,
	retries: 0,
	reporter: [
		['list'],
		[
			'json',
			{
				outputFile:
					process.env.SPACE_E2E_JSON ||
					'/tmp/opencode/task10-matrix-results.json'
			}
		]
	],
	// The certificate exception is only for ephemeral localhost WISP fixtures;
	// no public HTTPS traffic is allowed by controlled tests.
	// Snapshot tracing traverses the intercepted DOM during deadline-sensitive
	// startup. Opt in with --trace on for attribution; ordinary acceptance keeps
	// protocol/controller JSON evidence without that extra snapshot workload.
	use: {
		baseURL: 'http://127.0.0.1:4179',
		headless: true,
		screenshot: 'only-on-failure',
		trace: 'off',
		launchOptions: {
			args: ['--ignore-certificate-errors'],
			ignoreDefaultArgs: ['--disable-back-forward-cache']
		}
	},
	webServer: process.env.SPACE_E2E_FIXTURES_ONLY
		? undefined
		: {
				command: process.env.SPACE_E2E_PREVIEW
					? 'bunx vite preview --host 127.0.0.1 --port 4179 --strictPort'
					: 'bunx vite --host 127.0.0.1 --port 4179 --strictPort',
				url: 'http://127.0.0.1:4179',
				reuseExistingServer: false
			}
});
