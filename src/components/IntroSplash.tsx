import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpaceStars } from './SpaceStars';

interface IntroSplashProps {
	onComplete: () => void;
}

/**
 * Full-screen intro overlay.
 * Plays the starfield text animation (swirl → form "Space v2" → wait → explode),
 * then fades itself out and calls onComplete so the parent can unmount it.
 */
export const IntroSplash = ({ onComplete }: IntroSplashProps) => {
	const [fading, setFading] = useState(false);
	const [progress, setProgress] = useState(0);

	const handleIntroComplete = useCallback(() => {
		/* the explode just finished – start fading out */
		setFading(true);
	}, []);

	const handleProgress = useCallback((p: number) => {
		setProgress(p);
	}, []);

	return (
		<AnimatePresence onExitComplete={onComplete}>
			{!fading ? null : null /* AnimatePresence needs children to track */}
			<motion.div
				key="intro-splash"
				initial={{ opacity: 1 }}
				animate={{ opacity: fading ? 0 : 1 }}
				transition={{ duration: 1.2, ease: 'easeInOut' }}
				onAnimationComplete={() => {
					if (fading) onComplete();
				}}
				style={{
					position: 'fixed',
					inset: 0,
					zIndex: 9999,
					pointerEvents: fading ? 'none' : 'auto',
				}}
			>
				<SpaceStars
					mode="intro"
					onIntroComplete={handleIntroComplete}
					onProgress={handleProgress}
				/>

				{/* Progress bar at bottom */}
				<div
					style={{
						position: 'absolute',
						bottom: 0,
						left: 0,
						right: 0,
						height: 3,
						background: 'rgba(255,255,255,0.06)',
						overflow: 'hidden',
					}}
				>
					<motion.div
						initial={{ scaleX: 0 }}
						animate={{ scaleX: progress }}
						transition={{ duration: 0.15, ease: 'linear' }}
						style={{
							height: '100%',
							width: '100%',
							transformOrigin: 'left center',
							background: 'linear-gradient(90deg, rgba(139,92,246,0.6), rgba(167,139,250,0.8))',
							boxShadow: '0 0 12px rgba(139,92,246,0.4)',
						}}
					/>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};
