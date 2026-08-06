import { useEffect } from 'react';
import { tsParticles, type Container } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import { particleOptions } from '@utils/particles';

let enginePromise: Promise<void> | null = null;

const ensureEngine = () => {
	enginePromise ??= loadSlim(tsParticles);
	return enginePromise;
};

export const SpaceStars = () => {
	useEffect(() => {
		let container: Container | undefined;
		let cancelled = false;

		const host = document.createElement('div');
		host.id = 'space-stars';
		Object.assign(host.style, {
			position: 'fixed',
			inset: '0',
			zIndex: '-1',
			pointerEvents: 'none'
		});
		document.body.appendChild(host);

		void (async () => {
			try {
				await ensureEngine();
				if (cancelled) return;

				container = await tsParticles.load({
					element: host,
					options: particleOptions
				});
			} catch (error) {
				console.warn('[particles] failed to start', error);
			}
		})();

		return () => {
			cancelled = true;
			container?.destroy();
			host.remove();
		};
	}, []);

	return null;
};

export default SpaceStars;
