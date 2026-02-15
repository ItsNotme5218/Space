import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpaceStars } from './SpaceStars';

interface IntroSplashProps {
	onComplete: () => void;
}

export const IntroSplash = ({ onComplete }: IntroSplashProps) => {
	const [fading, setFading] = useState(false);
	const [progress, setProgress] = useState(0);

	const handleIntroComplete = useCallback(() => {
		setFading(true);
	}, []);

	const handleProgress = useCallback((p: number) => {
		setProgress(p);
	}, []);

	return (
		<AnimatePresence onExitComplete={onComplete}>
			{!fading && (
				<motion.div
					key="intro-splash"
					initial={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 1.2, ease: 'easeInOut' }}
					style={{
						position: 'fixed',
						inset: 0,
						zIndex: 9999,
					}}
				>
					<SpaceStars
						mode="intro"
						onIntroComplete={handleIntroComplete}
						onProgress={handleProgress}
					/>

					<div
						style={{
							position: 'absolute',
							right: 20,
							bottom: '25px',
							overflow: 'hidden',
							zIndex: 9999,
						}}
					>
						<motion.button
							initial={{ opacity: 0 }}
							animate={{ opacity: 0.5 }}
							whileHover={{ opacity: 1, scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							transition={{ duration: 0.3 }}
							onClick={() => setFading(true)}
							style={{
								background: 'rgba(255, 255, 255, 0.08)',
								border: '1px solid rgba(255, 255, 255, 0.12)',
								borderRadius: 8,
								padding: '6px 16px',
								color: 'rgba(255, 255, 255, 0.7)',
								fontSize: 13,
								fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
								cursor: 'pointer',
								backdropFilter: 'blur(8px)',
								letterSpacing: '0.02em',
							}}
						>
							not jackin ts ode
						</motion.button>
					</div>

					<div
						style={{
							position: 'absolute',
							bottom: 0,
							left: 0,
							right: 0,
							height: 5,
							background: 'rgba(255,255,255,0.06)',
							overflow: 'hidden',
							zIndex: 9999,
							filter: 'blur(2px)',
						}}
					>
						<motion.div
							initial={{ scaleX: 0 }}
							animate={{ scaleX: progress }}
							transition={{ duration: 0.15, ease: 'linear' }}
							className="z-9999"
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
			)}
		</AnimatePresence>
	);
};
