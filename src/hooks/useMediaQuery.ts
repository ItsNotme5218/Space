import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string): boolean => {
	const [matches, setMatches] = useState(() => {
		if (typeof window !== 'undefined') {
			return window.matchMedia(query).matches;
		}
		return false;
	});

	useEffect(() => {
		const media = window.matchMedia(query);
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMatches(media.matches);

		const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
		media.addEventListener('change', listener);

		return () => media.removeEventListener('change', listener);
	}, [query]);

	return matches;
};

export const useIsMobile = (): boolean => {
	return useMediaQuery('(max-width: 640px)');
};

export const useIsTablet = (): boolean => {
	return useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
};

export const useIsDesktop = (): boolean => {
	return useMediaQuery('(min-width: 1025px)');
};
