import type { ISourceOptions } from '@tsparticles/engine';

/**
 * Background starfield options for tsparticles.
 *
 * Replaces the hand-rolled canvas in SpaceStars, which repainted every star
 * every frame on the main thread. tsparticles batches the draw and, more
 * importantly, honours `fpsLimit` and `reduceDuplicates`, so a Chromebook is
 * not asked to run an uncapped RAF loop.
 */
export const particleOptions: ISourceOptions = {
	background: {
		color: { value: '#000000' }
	},
	fpsLimit: 30,
	detectRetina: false,
	pauseOnBlur: true,
	pauseOnOutsideViewport: true,
	particles: {
		number: {
			value: 160,
			density: { enable: true, width: 1920, height: 1080 }
		},
		color: { value: '#ffffff' },
		shape: { type: 'circle' },
		opacity: {
			value: { min: 0.15, max: 0.75 },
			animation: {
				enable: true,
				speed: 0.4,
				sync: false,
				startValue: 'random'
			}
		},
		size: {
			value: { min: 0.6, max: 1.8 }
		},
		move: {
			enable: true,
			speed: 0.14,
			direction: 'none',
			random: true,
			straight: false,
			outModes: { default: 'out' }
		},
		links: { enable: false },
		collisions: { enable: false },
		shadow: { enable: false }
	},
	interactivity: {
		events: {
			onHover: { enable: false },
			onClick: { enable: false },
			resize: { enable: true }
		}
	},
	smooth: true
};
