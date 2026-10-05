import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { scramjetPath } from '@mercuryworkshop/scramjet/path';

const require = createRequire(import.meta.url);

const dirOf = specifier => dirname(require.resolve(specifier));

const workspacePath = (...segments) => resolve(process.cwd(), ...segments);

const copyEntries = [
	{
		type: 'directory',
		source: dirOf('@mercuryworkshop/epoxy-transport'),
		destination: workspacePath('public', 'ep')
	},
	{
		type: 'directory',
		source: dirOf('@mercuryworkshop/libcurl-transport'),
		destination: workspacePath('public', 'l')
	},
	{
		type: 'directory',
		source: scramjetPath,
		destination: workspacePath('public', 's')
	},
	{
		type: 'directory',
		source: dirOf('@mercuryworkshop/scramjet-controller'),
		destination: workspacePath('public', 'c')
	},
	{
		type: 'directory',
		source: dirOf('@mercuryworkshop/scramjet-utils'),
		destination: workspacePath('public', 'ut')
	}
];

const ensureParentDirectory = async destination => {
	await mkdir(dirname(destination), { recursive: true });
};

const SKIP = /(\.map$|\.d\.ts$|[/\\](types|temp-types-build)$)/;

const copyEntry = async entry => {
	await ensureParentDirectory(entry.destination);
	await cp(entry.source, entry.destination, {
		force: true,
		recursive: entry.type === 'directory',
		filter: source => !SKIP.test(source)
	});
	console.log(`[runtime:sync] ${entry.destination}`);
};

Promise.all(copyEntries.map(copyEntry)).catch(error => {
	console.error('[runtime:sync] failed', error);
	process.exitCode = 1;
});
