import { spawnSync } from 'node:child_process';

const mode = process.argv[2] ?? 'server';
if (!['server', 'static'].includes(mode))
	throw new Error('Build mode must be server or static');
const env = { ...process.env, SPACE_BUILD_MODE: mode };
// Ordered and Space-owned. SVG emission follows font wiring inside Vite;
// final artifact stages run only after all Vite/copy output is complete.
for (const [command, args] of [
	[process.execPath, ['scripts/build-bridge.mjs']],
	[process.execPath, ['scripts/sync-runtime-assets.mjs']],
	['bun', ['run', '--bun', 'vp', 'build']],
	[process.execPath, ['scripts/finalize-build.mjs']]
]) {
	const result = spawnSync(command, args, { env, stdio: 'inherit' });
	if (result.error) throw result.error;
	if (result.status !== 0) process.exit(result.status ?? 1);
}
