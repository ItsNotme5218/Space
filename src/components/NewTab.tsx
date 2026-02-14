import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SpaceStars } from '../components/SpaceStars';
import { Search } from 'lucide-react';

const SPRING = { type: 'spring' as const, stiffness: 380, damping: 32, mass: 0.85 };

const shortcuts = [
	{ name: 'YouTube', url: 'https://youtube.com', color: '#FF0000' },
	{ name: 'Discord', url: 'https://discord.com', color: '#5865F2' },
	{ name: 'Reddit', url: 'https://reddit.com', color: '#FF4500' },
	{ name: 'GitHub', url: 'https://github.com', color: '#8b5cf6' },
	{ name: 'Twitch', url: 'https://twitch.tv', color: '#9146FF' },
	{ name: 'Twitter', url: 'https://x.com', color: '#1DA1F2' },
	{ name: 'Netflix', url: 'https://netflix.com', color: '#E50914' },
	{ name: 'Spotify', url: 'https://spotify.com', color: '#1DB954' }
];

interface NewTabPageProps {
	onIntroComplete?: () => void;
}

export const NewTab = ({ onIntroComplete }: NewTabPageProps) => {
	const [revealed, setRevealed] = useState(false);

	const handleTextFormed = useCallback(() => {
		setRevealed(true);
		onIntroComplete?.();
	}, [onIntroComplete]);

	return (
		<div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
			<SpaceStars onTextFormed={handleTextFormed} />

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: revealed ? 1 : 0 }}
				transition={{ duration: 0.8, ease: 'easeOut' }}
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					pointerEvents: revealed ? 'auto' : 'none',
					zIndex: 10
				}}
			>
				<motion.div
					initial={{ opacity: 0, y: 30, scale: 0.95 }}
					animate={revealed ? { opacity: 1, y: 0, scale: 1 } : {}}
					transition={{ ...SPRING, delay: 0.2 }}
					style={{
						width: '100%',
						maxWidth: 560,
						padding: '0 24px',
						marginBottom: 48
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 12,
							padding: '14px 20px',
							borderRadius: 9999,
							background: 'rgba(20, 10, 30, 0.6)',
							border: '1px solid rgba(139, 92, 246, 0.25)',
							backdropFilter: 'blur(12px)',
							boxShadow: '0 0 20px rgba(139, 92, 246, 0.1), 0 4px 24px rgba(0, 0, 0, 0.4)'
						}}
					>
						<Search style={{ width: 18, height: 18, color: 'rgba(255, 255, 255, 0.4)', flexShrink: 0 }} />
						<input
							type="text"
							placeholder="Search or enter URL"
							style={{
								flex: 1,
								background: 'transparent',
								border: 'none',
								outline: 'none',
								color: '#fff',
								fontSize: 15,
								fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
								letterSpacing: '0.01em'
							}}
						/>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={revealed ? { opacity: 1, y: 0 } : {}}
					transition={{ ...SPRING, delay: 0.4 }}
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(4, 1fr)',
						gap: 20,
						padding: '0 24px'
					}}
				>
					{shortcuts.map((shortcut, i) => (
						<motion.a
							key={shortcut.name}
							href={shortcut.url}
							initial={{ opacity: 0, scale: 0.8, y: 16 }}
							animate={revealed ? { opacity: 1, scale: 1, y: 0 } : {}}
							transition={{ ...SPRING, delay: 0.5 + i * 0.05 }}
							whileHover={{ scale: 1.08, y: -4 }}
							whileTap={{ scale: 0.95 }}
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 8,
								textDecoration: 'none',
								cursor: 'pointer'
							}}
						>
							<div
								style={{
									width: 52,
									height: 52,
									borderRadius: 16,
									background: 'rgba(20, 10, 30, 0.7)',
									border: '1px solid rgba(139, 92, 246, 0.2)',
									backdropFilter: 'blur(8px)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									boxShadow: `0 0 12px ${shortcut.color}20, 0 2px 8px rgba(0, 0, 0, 0.3)`
								}}
							>
								<span
									style={{
										fontSize: 18,
										fontWeight: 700,
										color: shortcut.color,
										fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif"
									}}
								>
									{shortcut.name[0]}
								</span>
							</div>
							<span
								style={{
									fontSize: 11,
									color: 'rgba(255, 255, 255, 0.5)',
									fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
									letterSpacing: '0.02em'
								}}
							>
								{shortcut.name}
							</span>
						</motion.a>
					))}
				</motion.div>
			</motion.div>
		</div>
	);
};
