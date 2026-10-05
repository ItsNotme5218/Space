import { useEffect, useRef, type RefObject } from 'react';

export const isClickInside = (
	element: HTMLElement,
	target: EventTarget | null,
	composedPath: EventTarget[]
): boolean =>
	Boolean(target && element.contains(target as Node)) ||
	composedPath.includes(element as EventTarget);

export const useClickOutside = <T extends HTMLElement>(
	handler: () => void
): RefObject<T | null> => {
	const ref = useRef<T>(null);

	useEffect(() => {
		const root = ref.current?.getRootNode();
		const handled = new WeakSet<Event>();
		const listener = (event: Event) => {
			const el = ref.current;
			if (!el || isClickInside(el, event.target, event.composedPath())) {
				return;
			}
			handler();
		};
		const rootListener = (event: Event) => {
			handled.add(event);
			listener(event);
		};
		const documentListener = (event: Event) => {
			if (!handled.has(event)) listener(event);
		};

		if (root && root !== document) {
			root.addEventListener('mousedown', rootListener);
			root.addEventListener('touchstart', rootListener);
		}
		document.addEventListener('mousedown', documentListener);
		document.addEventListener('touchstart', documentListener);

		return () => {
			if (root && root !== document) {
				root.removeEventListener('mousedown', rootListener);
				root.removeEventListener('touchstart', rootListener);
			}
			document.removeEventListener('mousedown', documentListener);
			document.removeEventListener('touchstart', documentListener);
		};
	}, [handler]);

	return ref;
};
