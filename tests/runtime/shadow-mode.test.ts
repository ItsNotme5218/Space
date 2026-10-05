import { expect, it } from 'vitest';
import { shadowMode } from '../../src/runtime/shadow-mode';

it('keeps the shell inspectable in development and closed in production', () => {
	expect(shadowMode(true)).toBe('open');
	expect(shadowMode(false)).toBe('closed');
});
