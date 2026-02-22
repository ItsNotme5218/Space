import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const soft = { type: 'spring' as const, stiffness: 200, damping: 22 };
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 28 };

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

export const NewTab = () => {
	const [searchFocused, setSearchFocused] = useState(false);

	return (
		<div
			className="w-full h-full flex flex-col items-center justify-center rounded-xl"
			style={{
				background: 'rgba(24, 20, 28, 0.4)',
				backdropFilter: 'blur(4px)',
				WebkitBackdropFilter: 'blur(4px)',
				border: '1px solid rgba(255, 255, 255, 0.06)'
			}}
		>
			<motion.div
				initial={{ opacity: 0, y: 24, scale: 0.96 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ ...soft, delay: 0.05 }}
				className="w-full px-6"
				style={{ maxWidth: 520 }}
			>
				<motion.div
					animate={{
						boxShadow: searchFocused
							? '0 0 32px rgba(139, 92, 246, 0.2), 0 4px 32px rgba(0, 0, 0, 0.5)'
							: '0 0 20px rgba(139, 92, 246, 0.08), 0 4px 24px rgba(0, 0, 0, 0.4)',
						borderColor: searchFocused
							? 'rgba(139, 92, 246, 0.35)'
							: 'rgba(255, 255, 255, 0.08)'
					}}
					transition={{ duration: 0.2 }}
					className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
					style={{
						background: 'rgba(255, 255, 255, 0.07)',
						backdropFilter: 'blur(12px)',
						WebkitBackdropFilter: 'blur(12px)',
						border: '1px solid rgba(255, 255, 255, 0.08)'
					}}
				>
					<Search
						className="shrink-0"
						style={{
							width: 18,
							height: 18,
							color: searchFocused
								? 'rgba(167, 139, 250, 0.7)'
								: 'rgba(255, 255, 255, 0.3)',
							transition: 'color 0.2s'
						}}
					/>
					<input
						type="text"
						placeholder="Search or enter URL"
						onFocus={() => setSearchFocused(true)}
						onBlur={() => setSearchFocused(false)}
						className="flex-1 bg-transparent border-none outline-none text-white/80 placeholder-white/25"
						style={{
							fontSize: 15,
							fontFamily:
								"'DM Sans', 'Inter', system-ui, sans-serif",
							letterSpacing: '0.01em'
						}}
					/>
				</motion.div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ ...soft, delay: 0.15 }}
				className="mt-10 px-6"
			>
				<div
					className="grid gap-3"
					style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
				>
					{shortcuts.map((shortcut, i) => (
						<motion.a
							key={shortcut.name}
							href={shortcut.url}
							initial={{ opacity: 0, scale: 0.85, y: 10 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							transition={{ ...SPRING, delay: 0.2 + i * 0.04 }}
							whileHover={{ scale: 1.06, y: -3 }}
							whileTap={{ scale: 0.95 }}
							className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl cursor-pointer transition-colors duration-150 hover:bg-white/4"
							style={{ textDecoration: 'none' }}
						>
							<div
								className="w-11 h-11 rounded-xl flex items-center justify-center"
								style={{
									background: 'rgba(255, 255, 255, 0.06)',
									border: '1px solid rgba(255, 255, 255, 0.07)',
									boxShadow: `0 0 10px ${shortcut.color}15, 0 2px 6px rgba(0, 0, 0, 0.25)`
								}}
							>
								<span
									className="text-base font-bold"
									style={{
										color: shortcut.color,
										fontFamily:
											"'DM Sans', 'Inter', system-ui, sans-serif"
									}}
								>
									{shortcut.name[0]}
								</span>
							</div>
							<span
								className="text-[11px] text-white/40 leading-none"
								style={{
									fontFamily:
										"'DM Sans', 'Inter', system-ui, sans-serif",
									letterSpacing: '0.02em'
								}}
							>
								{shortcut.name}
							</span>
						</motion.a>
					))}
				</div>
			</motion.div>
		</div>
	);
};
