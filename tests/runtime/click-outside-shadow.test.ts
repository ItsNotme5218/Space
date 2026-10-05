import { afterEach, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { useClickOutside } from '../../src/hooks/useClickOutside';

const hook = vi.hoisted(() => ({
	current: null as HTMLElement | null,
	cleanup: undefined as (() => void) | undefined
}));
vi.mock('react', () => ({
	useRef: () => hook,
	useEffect: (effect: () => () => void) => {
		hook.cleanup = effect();
	}
}));

afterEach(() => {
	hook.cleanup?.();
	vi.unstubAllGlobals();
});

it.each(['mousedown', 'touchstart'])(
	'does not dismiss hue controls inside a closed shadow root on %s',
	eventType => {
		const dom = new JSDOM(
			'<div id="host"></div><button id="outside"></button>'
		);
		const doc = dom.window.document;
		vi.stubGlobal('document', doc);
		const root = doc
			.getElementById('host')!
			.attachShadow({ mode: 'closed' });
		const picker = doc.createElement('div');
		const hue = doc.createElement('input');
		hue.type = 'range';
		picker.append(hue);
		root.append(picker);
		const sibling = doc.createElement('button');
		root.append(sibling);
		hook.current = picker;
		const dismiss = vi.fn();
		useClickOutside(dismiss);
		hue.dispatchEvent(
			new dom.window.MouseEvent(eventType, {
				bubbles: true,
				composed: true
			})
		);
		expect(dismiss).not.toHaveBeenCalled();
		sibling.dispatchEvent(
			new dom.window.MouseEvent(eventType, {
				bubbles: true,
				composed: true
			})
		);
		expect(dismiss).toHaveBeenCalledTimes(1);
		doc.getElementById('outside')!.dispatchEvent(
			new dom.window.MouseEvent(eventType, {
				bubbles: true,
				composed: true
			})
		);
		expect(dismiss).toHaveBeenCalledTimes(2);
		hook.cleanup?.();
		doc.getElementById('outside')!.dispatchEvent(
			new dom.window.MouseEvent(eventType, {
				bubbles: true,
				composed: true
			})
		);
		expect(dismiss).toHaveBeenCalledTimes(2);
		dom.window.close();
	}
);
