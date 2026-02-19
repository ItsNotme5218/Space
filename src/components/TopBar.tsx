import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
	ArrowLeft,
	RotateCw,
	ArrowRight,
	Home,
	Maximize2,
	Minimize2,
	MoreVertical,
	Search
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Session } from '../App';

const ENGINE_ORDER = [
	'DuckDuckGo',
	'Google',
	'Bing',
	'Brave',
	'Yahoo!'
] as const;

const SEARCH_ENGINES: Record<
	string,
	{ label: string; short: string; color: string; letterColors?: string[] }
> = {
	DuckDuckGo: { label: 'DuckDuckGo', short: 'ddg', color: '#DE5833' },
	Google: {
		label: 'Google',
		short: 'ggl',
		color: '#4285F4',
		letterColors: ['#EA4335', '#34A853', '#FBBC05']
	},
	Bing: { label: 'Bing', short: 'bng', color: '#00809D' },
	Brave: { label: 'Brave', short: 'brv', color: '#FB542B' },
	'Yahoo!': { label: 'Yahoo!', short: 'yho', color: '#A24EDE' }
};

const pillStyle = {
	background: 'rgba(14, 14, 16, 0.65)',
	border: '1px solid rgba(45, 45, 58, 0.5)',
	boxShadow:
		'0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset',
	backdropFilter: 'blur(4px)',
	WebkitBackdropFilter: 'blur(4px)',
	pointerEvents: 'auto' as const
};

interface TopBarProps {
	sessions: Session[];
	activeSession: number;
	carouselRef: React.RefObject<HTMLDivElement | null>;
	onSetSessionUrl: (id: number, url: string) => void;
}

export const TopBar = ({
	sessions,
	activeSession,
	carouselRef,
	onSetSessionUrl
}: TopBarProps) => {
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [inputFocused, setInputFocused] = useState(false);
	const [inputValue, setInputValue] = useState('');
	const [inputHovered, setInputHovered] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const [searchEngine, setSearchEngine] = useLocalStorage(
		'searchEngine',
		'DuckDuckGo'
	);
	const reloadControls = useAnimation();

	const engine = SEARCH_ENGINES[searchEngine] || SEARCH_ENGINES.DuckDuckGo;

	const hexToGlowRgb = (hex: string) => {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `${r}, ${g}, ${b}`;
	};
	const glowRgb = hexToGlowRgb(engine.color);

	const activeSessionData = sessions.find(s => s.id === activeSession);
	const isOnNewTab = !activeSessionData?.url;

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(Boolean(document.fullscreenElement));
		};

		handleFullscreenChange();
		document.addEventListener('fullscreenchange', handleFullscreenChange);

		return () => {
			document.removeEventListener(
				'fullscreenchange',
				handleFullscreenChange
			);
		};
	}, []);

	const handleHome = () => {
		onSetSessionUrl(activeSession, '');
		setInputValue('');
	};

	const cycleEngine = () => {
		const idx = ENGINE_ORDER.indexOf(
			searchEngine as (typeof ENGINE_ORDER)[number]
		);
		const next = ENGINE_ORDER[(idx + 1) % ENGINE_ORDER.length];
		setSearchEngine(next);
	};

	const toggleFullscreen = async () => {
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
				return;
			}

			const activeIndex = sessions.findIndex(s => s.id === activeSession);
			const root = carouselRef.current;
			const containers = root
				? root.querySelectorAll('.iframeContainer')
				: document.querySelectorAll('.iframeContainer');
			const target =
				(containers[activeIndex] as HTMLElement) ??
				document.documentElement;

			await target.requestFullscreen();
		} catch (error) {
			console.error('Failed to toggle fullscreen:', error);
		}
	};

	const handleReloadClick = async () => {
		await reloadControls.start({
			rotate: 360,
			transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
		});
		reloadControls.set({ rotate: 0 });
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const query = inputValue.trim();
		if (!query) return;

		const url = `https://example.com#${encodeURIComponent(searchEngine)}`;
		onSetSessionUrl(activeSession, url);
		inputRef.current?.blur();
	};

	const iconButtonClass =
		'p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer';

	return (
		<header className="fixed top-0 left-2 right-2 h-10 flex items-center z-40 mt-2 gap-2 pointer-events-none">
			<motion.div
				whileHover={{ scale: 1.01, y: -1 }}
				transition={{ type: 'spring', stiffness: 340, damping: 24 }}
				className="flex items-center gap-0.5 h-10 rounded-full p-2!"
				style={pillStyle}
			>
				<motion.button
					whileHover={{ scale: 1.08 }}
					whileTap={{ scale: 0.94 }}
					className={iconButtonClass}
				>
					<ArrowLeft className="w-4 h-4" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.08, rotate: 30 }}
					whileTap={{ scale: 0.94 }}
					onClick={handleReloadClick}
					className={iconButtonClass}
				>
					<motion.div animate={reloadControls}>
						<RotateCw className="w-4 h-4" />
					</motion.div>
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.08 }}
					whileTap={{ scale: 0.94 }}
					className={iconButtonClass}
				>
					<ArrowRight className="w-4 h-4" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.08 }}
					whileTap={{ scale: 0.94 }}
					onClick={handleHome}
					className={iconButtonClass}
				>
					<Home className="w-4 h-4" />
				</motion.button>
			</motion.div>

			<motion.div
				className="flex-1 h-10 rounded-full cursor-text"
				onClick={() => inputRef.current?.focus()}
				onMouseEnter={() => setInputHovered(true)}
				onMouseLeave={() => setInputHovered(false)}
				animate={{
					borderColor: inputFocused
						? `rgba(${glowRgb}, 0.4)`
						: inputHovered
							? `rgba(${glowRgb}, 0.2)`
							: 'rgba(45, 45, 58, 0.5)',
					boxShadow: inputFocused
						? `0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset, 0 0 20px rgba(${glowRgb}, 0.15), inset 0 0 20px rgba(${glowRgb}, 0.08)`
						: inputHovered
							? `0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset, 0 0 12px rgba(${glowRgb}, 0.08)`
							: '0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset'
				}}
				transition={{ duration: 0.2 }}
				style={{
					background: 'rgba(14, 14, 16, 0.65)',
					border: '1px solid rgba(45, 45, 58, 0.5)',
					backdropFilter: 'blur(4px)',
					WebkitBackdropFilter: 'blur(4px)',
					pointerEvents: 'auto'
				}}
			>
				<form
					onSubmit={handleSubmit}
					className="h-full rounded-full px-4 flex items-center gap-3"
				>
					<motion.button
						type="button"
						onMouseDown={e => {
							e.preventDefault();
							e.stopPropagation();
							cycleEngine();
						}}
						className="flex items-center gap-1.5 shrink-0 select-none cursor-pointer rounded-md px-1.5 py-0.5"
						whileHover={{ scale: 1.06 }}
						whileTap={{ scale: 0.94 }}
						animate={{
							opacity: inputFocused ? 1 : 0.55
						}}
						transition={{ duration: 0.15 }}
						style={{
							background: 'transparent',
							border: 'none',
							outline: 'none'
						}}
						title={`Search with ${engine.label} — click to switch`}
					>
						<Search
							className="shrink-0"
							style={{
								width: 13,
								height: 13,
								color: inputFocused
									? engine.color
									: 'rgba(255, 255, 255, 0.3)',
								transition: 'color 0.2s'
							}}
						/>
						<AnimatePresence mode="wait">
							<motion.span
								key={engine.short}
								initial={{
									opacity: 0,
									y: 4,
									filter: 'blur(4px)'
								}}
								animate={{
									opacity: 1,
									y: 0,
									filter: 'blur(0px)'
								}}
								exit={{
									opacity: 0,
									y: -4,
									filter: 'blur(4px)'
								}}
								transition={{ duration: 0.15 }}
								className="text-[10px] font-semibold tracking-wider uppercase"
								style={{
									color: inputFocused
										? engine.color
										: 'rgba(255, 255, 255, 0.25)',
									transition: 'color 0.2s',
									fontFamily:
										"'DM Sans', 'Inter', system-ui, sans-serif"
								}}
							>
								{engine.letterColors
									? engine.short.split('').map((ch, i) => (
											<span
												key={i}
												style={{
													color: inputFocused
														? engine.letterColors![
																i %
																	engine
																		.letterColors!
																		.length
															]
														: 'rgba(255, 255, 255, 0.25)',
													transition: 'color 0.2s',
													fontWeight: 800
												}}
											>
												{ch}
											</span>
										))
									: engine.short}
							</motion.span>
						</AnimatePresence>
					</motion.button>

					<div
						className="w-px h-4 shrink-0"
						style={{
							background: inputFocused
								? `rgba(${glowRgb}, 0.25)`
								: 'rgba(255, 255, 255, 0.06)',
							transition: 'background 0.2s'
						}}
					/>

					<input
						ref={inputRef}
						type="text"
						value={inputValue}
						onChange={e => setInputValue(e.target.value)}
						onFocus={() => setInputFocused(true)}
						onBlur={() => setInputFocused(false)}
						placeholder={
							inputFocused
								? `Search with ${engine.label} or enter URL`
								: 'Search or enter URL'
						}
						spellCheck={false}
						className="flex-1 bg-transparent border-none outline-none min-w-0"
						style={{
							fontSize: 13,
							fontFamily:
								"'DM Sans', 'Inter', system-ui, sans-serif",
							letterSpacing: '0.01em',
							color: 'rgba(255, 255, 255, 0.75)',
							caretColor: engine.color
						}}
					/>

					<span
						className="text-[11px] font-mono shrink-0 select-none"
						style={{
							color: inputFocused
								? 'rgba(255, 255, 255, 0.35)'
								: 'rgba(255, 255, 255, 0.2)',
							transition: 'color 0.2s',
							letterSpacing: '0.02em'
						}}
					>
						{isOnNewTab ? 'spc://' : 'https://'}
					</span>
				</form>
			</motion.div>

			<motion.div
				whileHover={{ scale: 1.01, y: -1 }}
				transition={{ type: 'spring', stiffness: 340, damping: 24 }}
				className="flex items-center gap-0.5 h-10 rounded-full p-2!"
				style={pillStyle}
			>
				<motion.button
					whileHover={{ scale: 1.08 }}
					whileTap={{ scale: 0.94 }}
					onClick={toggleFullscreen}
					className={iconButtonClass}
					title={
						isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
					}
				>
					{isFullscreen ? (
						<Minimize2 className="w-4 h-4" />
					) : (
						<Maximize2 className="w-4 h-4" />
					)}
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.08 }}
					whileTap={{ scale: 0.94 }}
					className={iconButtonClass}
				>
					<MoreVertical className="w-4 h-4" />
				</motion.button>
			</motion.div>
		</header>
	);
};
