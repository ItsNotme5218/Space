import { expect, it } from 'vitest';
import { initialView } from '../../src/runtime/entry-view';

it.each(['?view=games', '?other=1&view=games'])(
	'selects games for %s',
	search => {
		expect(initialView(search)).toBe('/games');
	}
);
it.each([
	'',
	'?view=settings',
	'?view=Games',
	'?delegated=true',
	'?proxy-context-v1=true',
	'?view=games&view=settings'
])('does not infer capabilities or other routes from %s', search => {
	expect(initialView(search)).toBe('/');
});
