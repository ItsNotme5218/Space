import { describe, expect, it } from 'vitest';
import { isClickInside } from '../../src/hooks/useClickOutside';

describe('click outside detection', () => {
	it('recognizes picker clicks retargeted through a shadow root', () => {
		const picker = { contains: () => false } as unknown as HTMLElement;
		const shadowHost = {} as EventTarget;

		expect(isClickInside(picker, shadowHost, [shadowHost, picker])).toBe(
			true
		);
		expect(isClickInside(picker, shadowHost, [shadowHost])).toBe(false);
	});
});
