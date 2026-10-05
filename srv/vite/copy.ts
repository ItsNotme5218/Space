import { createRequire } from 'node:module';
import { scramjetPath } from '@mercuryworkshop/scramjet/path';
import path, { dirname } from 'path';

const require = createRequire(import.meta.url);

const dirOf = (specifier: string) => dirname(require.resolve(specifier));

export const routePaths = {
	epoxy: 'ep',
	scramjet: 's',
	controller: 'c',
	scramjetUtils: 'ut',
	libcurl: 'l',
	auth: '',
	plusClient: 'p'
};

const authPath = path.resolve(
	'node_modules/@nightnetwork/night-auth/dist/login'
);
const plusClientPath = path.resolve(
	'node_modules/@nightnetwork/plus-client/dist'
);

const copyMap = {
	epoxy: {
		path: dirOf('@mercuryworkshop/epoxy-transport'),
		files: ['*'],
		dest: routePaths.epoxy
	},
	scramjet: {
		path: scramjetPath,
		files: ['*'],
		dest: routePaths.scramjet
	},
	controller: {
		path: dirOf('@mercuryworkshop/scramjet-controller'),
		files: ['*'],
		dest: routePaths.controller
	},
	scramjetUtils: {
		path: dirOf('@mercuryworkshop/scramjet-utils'),
		files: ['*'],
		dest: routePaths.scramjetUtils
	},
	libcurl: {
		path: dirOf('@mercuryworkshop/libcurl-transport'),
		files: ['*'],
		dest: routePaths.libcurl
	},
	auth: {
		path: authPath,
		files: [
			'*.png',
			'*.jpeg',
			'*.svg',
			'*.css',
			'*.js',
			{ name: 'index.html', rename: 'night-login.html' }
		],
		dest: routePaths.auth
	},
	plusClient: {
		path: plusClientPath,
		files: ['*'],
		dest: routePaths.plusClient
	}
};

function normalizePath(p: string) {
	return p.replace(/\\/g, '/');
}

function generateStaticCopyTargets(map: typeof copyMap) {
	const targets: any[] = [];

	for (const key in map) {
		const entry = map[key as keyof typeof copyMap];
		const basePath = normalizePath(entry.path);
		const files = entry.files;

		for (const file of files) {
			if (typeof file === 'string') {
				targets.push({
					src: `${basePath}/${file}`,
					dest: entry.dest
				});
			} else {
				targets.push({
					src: `${basePath}/${file.name}`,
					dest: entry.dest,
					rename: file.rename
				});
			}
		}
	}

	return targets;
}

export function copyRoutes() {
	return {
		targets: generateStaticCopyTargets(copyMap)
	};
}
