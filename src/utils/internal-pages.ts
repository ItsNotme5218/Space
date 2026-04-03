/** spc:// protocol:
 *
 * to add a new internal page
 *   1. Create a Vite MPA entry (e.g. mypage.html + src/mypage.tsx)
 *   2. Add it to INTERNAL_PAGES below
 *   3. Add the entry to vite.config.ts rollupOptions.input
 *
 * then at some point the iframe and url bar will show "spc://{name}"
 * 		- Crllect <3
 */

export const SPC_PROTOCOL = "spc://";

export interface InternalPage {
  name: string;
  path: string;
  title: string;
}

const INTERNAL_PAGES: InternalPage[] = [{ name: "newtab", path: "/newtab.html", title: "New Tab" }];

const pagesByName = new Map<string, InternalPage>(INTERNAL_PAGES.map((p) => [p.name, p]));

const pagesByPath = new Map<string, InternalPage>(INTERNAL_PAGES.map((p) => [p.path, p]));

export function resolveInternalUrl(spcUrl: string): string | null {
  if (!spcUrl.startsWith(SPC_PROTOCOL)) return null;
  const name = spcUrl.slice(SPC_PROTOCOL.length).toLowerCase().trim();
  return pagesByName.get(name)?.path ?? null;
}

export function isInternalPage(path: string): boolean {
  return pagesByPath.has(path);
}

export function toSpcUrl(path: string): string | null {
  const page = pagesByPath.get(path);
  return page ? `${SPC_PROTOCOL}${page.name}` : null;
}

export function getDefaultPagePath(): string {
  return pagesByName.get("newtab")!.path;
}

export function getInternalPages(): readonly InternalPage[] {
  return INTERNAL_PAGES;
}
