import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { epoxyPath } from '@mercuryworkshop/epoxy-transport';
import { libcurlPath } from '@mercuryworkshop/libcurl-transport';
import { scramjetPath } from '@mercuryworkshop/scramjet/path';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { baremuxPath as baremuxWorkerPath } from '@nightnetwork/bm-plusworker/path';

const workspacePath = (...segments) => resolve(process.cwd(), ...segments);

const copyEntries = [
	{
		type: 'directory',
		source: epoxyPath,
		destination: workspacePath('public', 'ep')
	},
	{
		type: 'directory',
		source: libcurlPath,
		destination: workspacePath('public', 'l')
	},
	{
		type: 'file',
		source: resolve(uvPath, 'uv.bundle.js'),
		destination: workspacePath('public', 'u', 'bundle.js')
	},
	{
		type: 'file',
		source: resolve(uvPath, 'uv.client.js'),
		destination: workspacePath('public', 'u', 'client.js')
	},
	{
		type: 'file',
		source: resolve(uvPath, 'uv.handler.js'),
		destination: workspacePath('public', 'u', 'handler.js')
	},
	{
		type: 'file',
		source: resolve(uvPath, 'uv.sw.js'),
		destination: workspacePath('public', 'u', 'worker.js')
	},
	{
		type: 'file',
		source: resolve(scramjetPath, 'scramjet.all.js'),
		destination: workspacePath('public', 's', 'all.js')
	},
	{
		type: 'file',
		source: resolve(scramjetPath, 'scramjet.sync.js'),
		destination: workspacePath('public', 's', 'sync.js')
	},
	{
		type: 'file',
		source: resolve(scramjetPath, 'scramjet.wasm.wasm'),
		destination: workspacePath('public', 's', 'wasm.wasm')
	},
	{
		type: 'file',
		source: resolve(baremuxWorkerPath, 'worker.js'),
		destination: workspacePath('public', 'b', 'worker.js')
	}
];

const ensureParentDirectory = async destination => {
	await mkdir(dirname(destination), { recursive: true });
};

const copyEntry = async entry => {
	await ensureParentDirectory(entry.destination);
	await cp(entry.source, entry.destination, {
		force: true,
		recursive: entry.type === 'directory'
	});
	console.log(`[runtime:sync] ${entry.destination}`);
};

Promise.all(copyEntries.map(copyEntry)).catch(error => {
	console.error('[runtime:sync] failed', error);
	process.exitCode = 1;
});
