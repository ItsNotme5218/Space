import { describe, expect, it, vi } from 'vitest';
import {
	applyAccentColor,
	hexToHsv,
	hsvToHex
} from '../../src/runtime/accent-color';

describe('main accent color', () => {
	it('updates only the primary and accent CSS variables', () => {
		const setProperty = vi.fn();

		applyAccentColor({ setProperty }, '#ec4899');

		expect(setProperty.mock.calls).toEqual([
			['--color-primary', '#ec4899'],
			['--color-accent', '#ec4899'],
			['--color-primary-light', 'color-mix(in srgb, #ec4899 55%, white)'],
			['--color-primary-dark', 'color-mix(in srgb, #ec4899 72%, black)']
		]);
	});

	it('round-trips the picker color through HSV', () => {
		expect(hsvToHex(hexToHsv('#ec4899'))).toBe('#ec4899');
	});
});
