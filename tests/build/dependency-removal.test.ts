import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';
import { copyRoutes, routePaths } from '../../srv/vite/copy';

const execFileAsync = promisify(execFile);

const removedPackages = [
	'@titaniumnetwork-dev/ultraviolet',
	'@mercuryworkshop/bare-mux',
	'@nightnetwork/bm-plusworker',
	'@nightnetwork/enigma',
	'@nightnetwork/reflux'
];

const preservedDirectDependencies = [
	'@nightnetwork/plus-client',
	'@mercuryworkshop/scramjet',
	'@mercuryworkshop/wisp-js',
	'@mercuryworkshop/epoxy-transport',
	'@mercuryworkshop/libcurl-transport'
];

async function directDependencies(): Promise<Record<string, string>> {
	const manifest = JSON.parse(
		await readFile(new URL('../../package.json', import.meta.url), 'utf8')
	);
	return manifest.dependencies ?? {};
}

async function bunResolvedPackages(): Promise<Set<string>> {
	const { stdout } = await execFileAsync('bun', ['list', '--all'], {
		cwd: new URL('../../', import.meta.url),
		maxBuffer: 1024 * 1024 * 8
	});

	const packages = new Set<string>();
	for (const line of stdout.split('\n')) {
		const match = line.match(/[├└]── ((?:@[^/\s]+\/)?[^@\s]+)@[^\s]+/);
		if (match) packages.add(match[1]!);
	}
	if (packages.size === 0)
		throw new Error('Unable to inspect Bun resolved dependency graph');
	return packages;
}

test('removed proxy packages are absent while preserved runtime packages remain direct', async () => {
	const deps = await directDependencies();
	for (const name of removedPackages) {
		expect(
			deps,
			`${name} must not be a direct dependency`
		).not.toHaveProperty(name);
	}
	for (const name of preservedDirectDependencies) {
		expect(deps, `${name} must remain a direct dependency`).toHaveProperty(
			name
		);
	}

	const resolved = await bunResolvedPackages();
	for (const name of removedPackages) {
		expect(
			resolved.has(name),
			`${name} must not be resolved in bun.lockb`
		).toBe(false);
	}
});

test('runtime copy routes keep plus-client and omit Enigma/Reflux routes', () => {
	expect(routePaths).toMatchObject({
		plusClient: 'p',
		epoxy: 'ep',
		libcurl: 'l',
		scramjet: 's'
	});
	expect(routePaths).not.toHaveProperty('enigma');
	expect(routePaths).not.toHaveProperty('reflux');

	const destinations = new Set(
		copyRoutes().targets.map(target => target.dest)
	);
	expect(destinations).toContain('p');
	expect(destinations).toContain('ep');
	expect(destinations).toContain('l');
	expect(destinations).not.toContain('en');
	expect(destinations).not.toContain('r');
});
