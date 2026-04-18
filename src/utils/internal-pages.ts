/** spc:// protocol:
 *
 * to add a new internal page
 *   1. Create a Vite MPA entry (e.g. mypage.html + src/mypage.tsx)
 *   2. Add it to internalPages below
 *   3. Add the entry to vite.config.ts rollupOptions.input
 *
 * then at some point the iframe and url bar will show "spc://{name}"
 * 		- Crllect <3
 */

export const spcProtocol = 'spc://';

export interface InternalPage {
	name: string;
	path: string;
	title: string;
}

const internalPages: InternalPage[] = [
	{ name: 'newtab', path: '/newtab.html', title: 'New Tab' }
];

const pagesByName = new Map<string, InternalPage>(
	internalPages.map(p => [p.name, p])
);

const pagesByPath = new Map<string, InternalPage>(
	internalPages.map(p => [p.path, p])
);

export const resolveInternalUrl = (spcUrl: string): string | null => {
	if (!spcUrl.startsWith(spcProtocol)) return null;
	const name = spcUrl.slice(spcProtocol.length).toLowerCase().trim();
	return pagesByName.get(name)?.path ?? null;
};

export const isInternalPage = (path: string): boolean => pagesByPath.has(path);

export const toSpcUrl = (path: string): string | null => {
	const page = pagesByPath.get(path);
	return page ? `${spcProtocol}${page.name}` : null;
};

export const getDefaultPagePath = (): string => pagesByName.get('newtab')!.path;

export const getInternalPages = (): readonly InternalPage[] => internalPages;
