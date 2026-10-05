import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('removes the Fern importer and registration remnants', () => {
	expect(
		existsSync(
			new URL('../../src/utils/games/import/fern.ts', import.meta.url)
		)
	).toBe(false);
	const registry = readFileSync(
		new URL('../../src/utils/games/import/index.ts', import.meta.url),
		'utf8'
	);
	expect(registry).not.toMatch(/FernGames|["']\.\/fern["']/);
});
