import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
	ArrowLeft,
	RotateCw,
	ArrowRight,
	Home,
	Maximize2,
	Minimize2,
	MoreVertical
} from 'lucide-react';

export const TopBar = () => {
	const [isFullscreen, setIsFullscreen] = useState(false);

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(Boolean(document.fullscreenElement));
		};

		handleFullscreenChange();
		document.addEventListener('fullscreenchange', handleFullscreenChange);

		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	}, []);

	const toggleFullscreen = async () => {
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
				return;
			}

			const appHost = document.getElementById('app-host');
			const target = (appHost ?? document.documentElement) as HTMLElement;
			await target.requestFullscreen();
		} catch (error) {
			console.error('Failed to toggle fullscreen:', error);
		}
	};

	const iconButtonClass =
		'p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer';

	return (
		<header className="fixed top-0 left-2 right-2 h-10 flex items-center z-40 mt-2 gap-2 pointer-events-none">
			<motion.div
				whileHover={{ scale: 1.01, y: -1 }}
				transition={{ type: 'spring', stiffness: 340, damping: 24 }}
				className="flex items-center gap-0.5 h-10 rounded-full p-2!"
				style={{
					background: 'rgba(14, 14, 16, 0.65)',
					border: '1px solid rgba(45, 45, 58, 0.5)',
					boxShadow:
						'0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset',
					backdropFilter: 'blur(4px)',
					WebkitBackdropFilter: 'blur(4px)',
					pointerEvents: 'auto'
				}}
			>
				<motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className={iconButtonClass}>
					<ArrowLeft className="w-4 h-4" />
				</motion.button>
				<motion.button whileHover={{ scale: 1.08, rotate: 20 }} whileTap={{ scale: 0.94 }} className={iconButtonClass}>
					<RotateCw className="w-4 h-4" />
				</motion.button>
				<motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className={iconButtonClass}>
					<ArrowRight className="w-4 h-4" />
				</motion.button>
				<motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className={iconButtonClass}>
					<Home className="w-4 h-4" />
				</motion.button>
			</motion.div>
			<motion.div
				whileHover={{ y: -1 }}
				className="flex-1 h-10 rounded-full"
				style={{
					background: 'rgba(14, 14, 16, 0.65)',
					border: '1px solid rgba(45, 45, 58, 0.5)',
					boxShadow:
						'0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset',
					backdropFilter: 'blur(4px)',
					WebkitBackdropFilter: 'blur(4px)',
					pointerEvents: 'auto'
				}}
			>
				<motion.div
					className="h-full rounded-full px-5 flex items-center justify-between"
					animate={{
						boxShadow: [
							'inset 0 0 0px rgba(139,92,246,0)',
							'inset 0 0 18px rgba(139,92,246,0.12)',
							'inset 0 0 0px rgba(139,92,246,0)'
						]
					}}
					transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
				>
					<span className="text-xs tracking-wide text-zinc-500">Secure Session</span>
					<motion.span
						className="text-xs text-zinc-400"
						whileHover={{ color: '#ffffff', scale: 1.02 }}
					>
						https://
					</motion.span>
				</motion.div>
			</motion.div>
			<motion.div
				whileHover={{ scale: 1.01, y: -1 }}
				transition={{ type: 'spring', stiffness: 340, damping: 24 }}
				className="flex items-center gap-0.5 h-10 rounded-full p-2!"
				style={{
					background: 'rgba(14, 14, 16, 0.65)',
					border: '1px solid rgba(45, 45, 58, 0.5)',
					boxShadow:
						'0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset',
					backdropFilter: 'blur(4px)',
					WebkitBackdropFilter: 'blur(4px)',
					pointerEvents: 'auto'
				}}
			>
				<motion.button
					whileHover={{ scale: 1.08 }}
					whileTap={{ scale: 0.94 }}
					onClick={toggleFullscreen}
					className={iconButtonClass}
					title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
				>
					{isFullscreen ? (
						<Minimize2 className="w-4 h-4" />
					) : (
						<Maximize2 className="w-4 h-4" />
					)}
				</motion.button>
				<motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className={iconButtonClass}>
					<MoreVertical className="w-4 h-4" />
				</motion.button>
			</motion.div>
		</header>
	);
};
