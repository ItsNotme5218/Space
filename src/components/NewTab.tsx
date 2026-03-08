import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { readSetting, writeSetting, cache, subscribe } from '../hooks/useLocalStorage';

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 28 };
const SPRING_SOFT = { type: 'spring' as const, stiffness: 200, damping: 22 };

const FONT = "'DM Sans', 'Inter', system-ui, sans-serif";

const shortcuts = [
	{ name: 'YouTube', url: 'https://youtube.com', color: '#FF0000', letter: 'Y' },
	{ name: 'Discord', url: 'https://discord.com', color: '#5865F2', letter: 'D' },
	{ name: 'Reddit', url: 'https://reddit.com', color: '#FF4500', letter: 'R' },
	{ name: 'GitHub', url: 'https://github.com', color: '#8b5cf6', letter: 'G' },
	{ name: 'Twitch', url: 'https://twitch.tv', color: '#9146FF', letter: 'T' },
	{ name: 'Twitter', url: 'https://x.com', color: '#1DA1F2', letter: 'X' },
	{ name: 'Netflix', url: 'https://netflix.com', color: '#E50914', letter: 'N' },
	{ name: 'Spotify', url: 'https://spotify.com', color: '#1DB954', letter: 'S' }
];

const getGreeting = (): string => {
	const hour = new Date().getHours();
	if (hour < 5) return 'Good night';
	if (hour < 12) return 'Good morning';
	if (hour < 17) return 'Good afternoon';
	if (hour < 21) return 'Good evening';
	return 'Good night';
};

const readLS = (key: string, fallback: boolean): boolean => {
	if (cache.has(key)) return cache.get(key) as boolean;
	return fallback;
};

const writeLS = (key: string, value: boolean) => {
	writeSetting(key, value);
};

const formatTime = (hour12: boolean): { time: string; period: string } => {
	const now = new Date();
	if (!hour12) {
		return { time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), period: '' };
	}
	const h = now.getHours();
	const m = now.getMinutes();
	const period = h >= 12 ? 'PM' : 'AM';
	const h12 = h % 12 || 12;
	return { time: `${h12}:${m.toString().padStart(2, '0')}`, period };
};

interface NewTabProps {
	onNavigate?: (url: string) => void;
}

export const NewTab = ({ onNavigate }: NewTabProps) => {
	const [searchFocused, setSearchFocused] = useState(false);
	const [searchValue, setSearchValue] = useState('');
	const [hour12, setHour12] = useState(() => readLS('clock12h', false));
	const [lockFormat, setLockFormat] = useState(() => readLS('clockLock', false));
	const [timeParts, setTimeParts] = useState(() => formatTime(hour12));
	const [greeting] = useState(getGreeting);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			const [h12, lock] = await Promise.all([
				readSetting('clock12h', false),
				readSetting('clockLock', false)
			]); // yo, check chat for liveshare
			if (cancelled) return;
			setHour12(h12);
			setLockFormat(lock);
		};
		load();

		const unsub12 = subscribe('clock12h', () => {
			setHour12(readLS('clock12h', false));
		});
		const unsubLock = subscribe('clockLock', () => {
			setLockFormat(readLS('clockLock', false));
		});
		return () => {
			cancelled = true;
			unsub12();
			unsubLock();
		};
	}, []);

	useEffect(() => {
		setTimeParts(formatTime(hour12));
		const interval = setInterval(() => setTimeParts(formatTime(hour12)), 10_000);
		return () => clearInterval(interval);
	}, [hour12]);

	const handleClockClick = () => {
		if (lockFormat) return;
		const next = !hour12;
		setHour12(next);
		writeLS('clock12h', next);
		setTimeParts(formatTime(next));
	};

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const query = searchValue.trim();
		if (!query || !onNavigate) return;
		onNavigate(query);
	};

	const handleShortcutClick = (e: React.MouseEvent, url: string) => {
		e.preventDefault();
		onNavigate?.(url);
	};

	return (
		<div
			className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
			style={{ background: 'transparent' }}
		>
			<div
				className="absolute pointer-events-none"
				style={{
					width: 600,
					height: 600,
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -55%)',
					background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0.02) 40%, transparent 70%)',
					filter: 'blur(40px)'
				}}
			/>

			<motion.div
				initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
				animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
				transition={{ ...SPRING_SOFT, delay: 0 }}
				className="flex flex-col items-center mb-8 select-none"
			>
				<motion.div
					className="relative"
					onClick={handleClockClick}
					whileTap={lockFormat ? {} : { scale: 0.97 }}
					style={{ cursor: lockFormat ? 'default' : 'pointer' }}
				>
					<motion.span
						className="text-[56px] font-extralight tracking-tight leading-none"
						style={{
							fontFamily: FONT,
							color: 'rgba(255, 255, 255, 0.85)',
							textShadow: '0 0 40px rgba(139, 92, 246, 0.15)'
						}}
					>
						{timeParts.time}
					</motion.span>
					<AnimatePresence>
						{timeParts.period && (
							<motion.span
								key="period"
								initial={{ opacity: 0, filter: 'blur(4px)' }}
								animate={{ opacity: 1, filter: 'blur(0px)' }}
								exit={{ opacity: 0, filter: 'blur(4px)' }}
								transition={{ duration: 0.2 }}
								className="absolute text-[18px] font-light tracking-wide"
								style={{
									fontFamily: FONT,
									color: 'rgba(255, 255, 255, 0.25)',
									right: 0,
									bottom: 0,
									transform: 'translate(calc(100% + 6px), -4px)'
								}}
							>
								{timeParts.period}
							</motion.span>
						)}
					</AnimatePresence>
				</motion.div>
				<motion.span
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.15, duration: 0.4 }}
					className="text-sm font-medium tracking-wide mt-1.5"
					style={{
						fontFamily: FONT,
						color: 'rgba(255, 255, 255, 0.3)',
						letterSpacing: '0.08em'
					}}
				>
					{greeting}
				</motion.span>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 16, scale: 0.97 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ ...SPRING_SOFT, delay: 0.08 }}
				className="w-full px-6"
				style={{ maxWidth: 520 }}
			>
				<form onSubmit={handleSearchSubmit}>
					<motion.div
						animate={{
							boxShadow: searchFocused
								? '0 0 0 1px rgba(139, 92, 246, 0.3), 0 0 24px rgba(139, 92, 246, 0.12), 0 4px 24px rgba(0, 0, 0, 0.4)'
								: '0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset',
							borderColor: searchFocused
								? 'rgba(139, 92, 246, 0.3)'
								: 'rgba(27, 27, 27, 0.8)'
						}}
						transition={{ duration: 0.2 }}
						className="flex items-center gap-3 px-4 py-3 rounded-2xl"
						style={{
							background: 'rgba(14, 14, 16, 0.65)',
							backdropFilter: 'blur(4px)',
							WebkitBackdropFilter: 'blur(4px)',
							border: '1px solid rgba(27, 27, 27, 0.8)'
						}}
					>
						<Search
							className="shrink-0"
							style={{
								width: 16,
								height: 16,
								color: searchFocused
									? 'rgba(139, 92, 246, 0.6)'
									: 'rgba(255, 255, 255, 0.2)',
								transition: 'color 0.2s'
							}}
						/>
						<input
							type="text"
							placeholder="Search or enter URL"
							value={searchValue}
							onChange={e => setSearchValue(e.target.value)}
							onFocus={() => setSearchFocused(true)}
							onBlur={() => setSearchFocused(false)}
							className="flex-1 bg-transparent border-none outline-none"
							style={{
								fontSize: 14,
								fontFamily: FONT,
								letterSpacing: '0.01em',
								color: 'rgba(255, 255, 255, 0.75)',
								caretColor: '#8b5cf6'
							}}
						/>
						<AnimatePresence>
							{searchValue.trim() && (
								<motion.button
									type="submit"
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.8 }}
									transition={{ duration: 0.12 }}
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
									className="shrink-0 flex items-center justify-center cursor-pointer"
								>
									<Search
										style={{
											width: 15,
											height: 15,
											color: 'rgba(139, 92, 246, 0.7)'
										}}
									/>
								</motion.button>
							)}
						</AnimatePresence>
					</motion.div>
				</form>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ ...SPRING_SOFT, delay: 0.16 }}
				className="mt-8 px-6"
			>
				<div
					className="grid gap-2.5"
					style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
				>
					{shortcuts.map((shortcut, i) => (
						<motion.a
							key={shortcut.name}
							href={shortcut.url}
							onClick={e => handleShortcutClick(e, shortcut.url)}
							initial={{ opacity: 0, scale: 0.85, y: 8 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							transition={{ ...SPRING, delay: 0.22 + i * 0.035 }}
							whileHover={{ scale: 1.06, y: -2 }}
							whileTap={{ scale: 0.95 }}
							className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl cursor-pointer group"
							style={{ textDecoration: 'none' }}
						>
							<motion.div
								className="w-11 h-11 rounded-xl flex items-center justify-center relative overflow-hidden"
								style={{
									background: 'rgba(14, 14, 16, 0.65)',
									border: '1px solid rgba(27, 27, 27, 0.8)',
									boxShadow: '0 0 8px 1px rgba(255, 255, 255, 0.03), 0 0 10px 1px rgba(27, 27, 27, 0.5) inset'
								}}
								whileHover={{
									boxShadow: `0 0 12px ${shortcut.color}20, 0 0 8px 1px rgba(255, 255, 255, 0.03), 0 0 10px 1px rgba(27, 27, 27, 0.5) inset`
								}}
								transition={{ duration: 0.2 }}
							>
								<div
									className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
									style={{
										background: `radial-gradient(circle at center, ${shortcut.color}12 0%, transparent 70%)`
									}}
								/>
								<span
									className="text-sm font-bold relative z-10"
									style={{
										color: shortcut.color,
										fontFamily: FONT,
										opacity: 0.85
									}}
								>
									{shortcut.letter}
								</span>
							</motion.div>
							<span
								className="text-[11px] leading-none opacity-35 group-hover:opacity-50 transition-opacity duration-200"
								style={{
									fontFamily: FONT,
									color: 'white',
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
