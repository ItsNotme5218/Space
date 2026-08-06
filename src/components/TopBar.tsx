import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
	ArrowLeft,
	RotateCw,
	ArrowRight,
	Home,
	Maximize2,
	Minimize2,
	MoreVertical,
	Search,
	Pin,
	PinOff,
	Bookmark,
	BookmarkMinus
} from 'lucide-react';
import { useLocalStorage, writeSetting } from '../hooks/useLocalStorage';
import { useClickOutside } from '../hooks/useClickOutside';
import { spcProtocol } from '../utils/internal-pages';
import type { Session } from '../App';

const engineOrder = [
	'Brave',
	'DuckDuckGo',
	'Google',
	'Bing',
	'Yahoo!'
] as const;

const searchEngines: Record<
	string,
	{ label: string; short: string; color: string; letterColors?: string[] }
> = {
	Brave: { label: 'Brave', short: 'brv', color: '#FB542B' },
	DuckDuckGo: { label: 'DuckDuckGo', short: 'ddg', color: '#DE5833' },
	Google: {
		label: 'Google',
		short: 'ggl',
		color: '#4285F4',
		letterColors: ['#EA4335', '#FBBC05', '#34A853']
	},
	Bing: { label: 'Bing', short: 'bng', color: '#00809D' },
	'Yahoo!': { label: 'Yahoo!', short: 'yho', color: '#A24EDE' }
};

const pillStyle = {
	background: 'var(--color-surface)',
	border: '1px solid var(--color-border)',
	pointerEvents: 'auto' as const
};

interface TopBarProps {
	sessions: Session[];
	activeSession: number;
	carouselRef: React.RefObject<HTMLDivElement | null>;
	proxyReady: boolean;
	onNavigate: (url: string) => void;
	onBack: () => void;
	onForward: () => void;
	onReload: () => void;
	onHome: () => void;
	canGoBack: boolean;
	canGoForward: boolean;
	onLocationChange: (sessionId: number, url: string, title: string) => void;
	onToggleSavedGame: () => void;
	canToggleSavedGame: boolean;
	isSavedGame: boolean;
	onTogglePin: () => void;
	canTogglePin: boolean;
	isPinned: boolean;
}

export const TopBar = ({
	sessions,
	activeSession,
	carouselRef,
	proxyReady,
	onNavigate,
	onBack,
	onForward,
	onReload,
	onHome,
	canGoBack,
	canGoForward,
	onLocationChange,
	onToggleSavedGame,
	canToggleSavedGame,
	isSavedGame,
	onTogglePin,
	canTogglePin,
	isPinned
}: TopBarProps) => {
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [inputFocused, setInputFocused] = useState(false);
	const [inputValue, setInputValue] = useState('');
	const [inputHovered, setInputHovered] = useState(false);
	const [displayUrl, setDisplayUrl] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const [searchEngine, setSearchEngine] = useLocalStorage(
		'searchEngine',
		'Brave'
	);
	const reloadControls = useAnimation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useClickOutside<HTMLDivElement>(() => setIsMenuOpen(false));

	useEffect(() => {
		switch (isMenuOpen) {
			case false:
				return;
			default:
				break;
		}

		const closeMenu = () => {
			setIsMenuOpen(false);
		};
		const handleWindowBlur = () => {
			window.setTimeout(() => {
				switch (document.activeElement instanceof HTMLIFrameElement) {
					case true:
						closeMenu();
						break;
					default:
						break;
				}
			}, 0);
		};
		const root = carouselRef.current;
		const iframes = Array.from(
			root?.querySelectorAll<HTMLIFrameElement>('iframe') ??
				document.querySelectorAll<HTMLIFrameElement>(
					'.iframeContainer iframe'
				)
		);

		for (const iframe of iframes) {
			iframe.addEventListener('pointerdown', closeMenu);
			iframe.addEventListener('mousedown', closeMenu);
			iframe.addEventListener('focus', closeMenu);
		}

		window.addEventListener('blur', handleWindowBlur);

		return () => {
			window.removeEventListener('blur', handleWindowBlur);

			for (const iframe of iframes) {
				iframe.removeEventListener('pointerdown', closeMenu);
				iframe.removeEventListener('mousedown', closeMenu);
				iframe.removeEventListener('focus', closeMenu);
			}
		};
	}, [carouselRef, isMenuOpen]);

	const engine = searchEngines[searchEngine] || searchEngines.DuckDuckGo;

	const activeSessionData = sessions.find(s => s.id === activeSession);
	const isOnNewTab = !activeSessionData?.url;

	const decodeProxyUrl = useCallback((proxyUrl: string): string => {
		switch (Boolean(proxyUrl)) {
			case false:
				return '';
			default:
				break;
		}

		const decodeCandidate = (
			value: string,
			prefix: string,
			decoder?: (input: string) => string
		) => {
			switch (true) {
				case !value.startsWith(prefix):
				case typeof decoder !== 'function':
					return null;
				default:
					try {
						return decoder(value.slice(prefix.length));
					} catch {
						return null;
					}
			}
		};

		const decodeScramjet = (
			value: string,
			prefix: string,
			decoder?: (input: string) => string
		) => {
			if (!value.startsWith(prefix) || typeof decoder !== 'function') {
				return null;
			}
			const rest = value.slice(prefix.length);
			const token = rest.slice(rest.lastIndexOf('/') + 1);
			try {
				return decoder(token);
			} catch {
				return null;
			}
		};

		let path = proxyUrl;

		try {
			const targetUrl = new URL(proxyUrl, window.location.origin);
			path = targetUrl.pathname + targetUrl.search + targetUrl.hash;
		} catch {
			path = proxyUrl;
		}

		const uvPrefix = window.__uv$config?.prefix || '/u/res/';
		const scramjetPrefix = window.proxy?.scramConfig?.prefix || '/s/res/';
		const uvDecode = window.__uv$config?.decodeUrl as
			((input: string) => string) | undefined;
		const scramjetDecode = window.proxy?.scramConfig?.codec?.decode as
			((input: string) => string) | undefined;
		const candidates = [
			path,
			path.replace(window.location.origin, ''),
			proxyUrl.replace(window.location.origin, '')
		];

		for (const candidate of candidates) {
			const decodedUrl =
				decodeScramjet(candidate, scramjetPrefix, scramjetDecode) ||
				decodeCandidate(candidate, uvPrefix, uvDecode);

			switch (Boolean(decodedUrl)) {
				case true:
					return decodedUrl!;
				default:
					break;
			}
		}

		return proxyUrl;
	}, []);

	useEffect(() => {
		let timer: number | undefined;

		if (isOnNewTab) {
			timer = window.setTimeout(() => {
				setDisplayUrl('');
				if (!inputFocused) setInputValue('');
			}, 0);

			return () => {
				if (timer !== undefined) clearTimeout(timer);
			};
		}

		const url = activeSessionData?.url || '';
		const decoded = decodeProxyUrl(url);

		timer = window.setTimeout(() => {
			setDisplayUrl(decoded);
			if (!inputFocused) setInputValue(stripProtocol(decoded));
			onLocationChange(activeSession, decoded, '');
		}, 0);

		return () => {
			if (timer !== undefined) clearTimeout(timer);
		};
	}, [
		activeSession,
		activeSessionData?.url,
		isOnNewTab,
		inputFocused,
		decodeProxyUrl,
		onLocationChange
	]);

	useEffect(() => {
		let interval: ReturnType<typeof setInterval> | null = null;

		const startPolling = () => {
			if (interval) return;
			if (isOnNewTab) return;

			interval = setInterval(() => {
				const activeIndex = sessions.findIndex(
					s => s.id === activeSession
				);
				const root = carouselRef.current;
				if (!root) return;
				const containers = root.querySelectorAll('.iframeContainer');
				const container = containers[activeIndex];
				if (!container) return;
				const iframe = container.querySelector(
					'iframe'
				) as HTMLIFrameElement | null;
				if (!iframe) return;

				try {
					const iframeSrc = iframe.contentWindow?.location.href;
					if (iframeSrc && iframeSrc !== 'about:blank') {
						const decoded = decodeProxyUrl(iframeSrc);
						const title =
							iframe.contentDocument?.title ||
							iframe.contentWindow?.document?.title ||
							'';
						if (decoded !== displayUrl) {
							setDisplayUrl(decoded);
							if (!inputFocused)
								setInputValue(stripProtocol(decoded));
						}
						onLocationChange(activeSession, decoded, title);
					}
				} catch {
					const src = iframe.getAttribute('src') || '';
					const decoded = decodeProxyUrl(src);
					if (decoded !== displayUrl) {
						setDisplayUrl(decoded);
						if (!inputFocused)
							setInputValue(stripProtocol(decoded));
					}
					onLocationChange(activeSession, decoded, '');
				}
			}, 1000);
		};

		const stopPolling = () => {
			if (interval) {
				clearInterval(interval);
				interval = null;
			}
		};

		const handleVisibility = () => {
			if (document.hidden) {
				stopPolling();
			} else {
				startPolling();
			}
		};

		startPolling();
		document.addEventListener('visibilitychange', handleVisibility);

		return () => {
			stopPolling();
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	}, [
		sessions,
		activeSession,
		isOnNewTab,
		carouselRef,
		displayUrl,
		inputFocused,
		decodeProxyUrl,
		onLocationChange
	]);

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
		onHome();
		setInputValue('');
		setDisplayUrl('');
	};

	const searchEngineUrls: Record<string, string> = {
		Brave: 'https://search.brave.com/search?q=%s',
		DuckDuckGo: 'https://www.duckduckgo.com/?q=%s',
		Google: 'https://www.google.com/search?q=%s',
		Bing: 'https://www.bing.com/search?q=%s',
		'Yahoo!': 'https://search.yahoo.com/search?p=%s'
	};

	const cycleEngine = () => {
		const idx = engineOrder.indexOf(
			searchEngine as (typeof engineOrder)[number]
		);
		const next = engineOrder[(idx + 1) % engineOrder.length];
		setSearchEngine(next);
		const url = searchEngineUrls[next];
		if (url) {
			writeSetting('search', url);
			if (window.proxy) window.proxy.searchVar = url;
		}
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
				document.getElementById('app-root') ??
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
		onReload();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const query = inputValue.trim();
		if (!query) return;

		onNavigate(query);
		inputRef.current?.blur();
	};

	const getProtocolDisplay = (): string => {
		if (isOnNewTab) return spcProtocol;
		if (displayUrl.startsWith('https://')) return 'https://';
		if (displayUrl.startsWith('http://')) return 'http://';
		return 'https://';
	};

	const stripProtocol = (url: string): string => {
		if (url.startsWith('https://')) return url.slice(8);
		if (url.startsWith('http://')) return url.slice(7);
		return url;
	};

	const iconButtonClass =
		'p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer';

	return (
		<header
			className={`fixed top-0 left-2 right-2 h-10 flex items-center z-[80] mt-2 gap-2 ${
				isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
			}`}
			style={{ position: 'fixed' }}
		>
			<div
				className="flex items-center gap-0.5 h-10 rounded-full p-2!"
				style={pillStyle}
			>
				<motion.button
					whileHover={canGoBack ? { scale: 1.05 } : {}}
					whileTap={canGoBack ? { scale: 0.94 } : {}}
					onClick={onBack}
					disabled={!canGoBack}
					className={`${iconButtonClass} ${
						canGoBack
							? ''
							: 'cursor-default text-zinc-600 hover:text-zinc-600'
					}`}
					title="Back"
				>
					<ArrowLeft className="w-4 h-4" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.94 }}
					onClick={handleReloadClick}
					className={iconButtonClass}
					title="Reload"
				>
					<motion.div animate={reloadControls}>
						<RotateCw className="w-4 h-4" />
					</motion.div>
				</motion.button>
				<motion.button
					whileHover={canGoForward ? { scale: 1.05 } : {}}
					whileTap={canGoForward ? { scale: 0.94 } : {}}
					onClick={onForward}
					disabled={!canGoForward}
					className={`${iconButtonClass} ${
						canGoForward
							? ''
							: 'cursor-default text-zinc-600 hover:text-zinc-600'
					}`}
					title="Forward"
				>
					<ArrowRight className="w-4 h-4" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.94 }}
					onClick={handleHome}
					className={iconButtonClass}
					title="Home"
				>
					<Home className="w-4 h-4" />
				</motion.button>
			</div>

			<motion.div
				className="flex-1 h-10 rounded-full cursor-text"
				onClick={() => inputRef.current?.focus()}
				onMouseEnter={() => setInputHovered(true)}
				onMouseLeave={() => setInputHovered(false)}
				animate={{
					borderColor: inputFocused
						? engine.color
						: inputHovered
							? 'var(--color-border-strong)'
							: 'var(--color-border)'
				}}
				transition={{ duration: 0.12 }}
				style={{
					background: 'var(--color-input)',
					border: '1px solid var(--color-border)',
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
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.94 }}
						animate={{
							opacity: inputFocused ? 1 : 0.65
						}}
						transition={{ duration: 0.15 }}
						style={{
							background: 'transparent',
							border: 'none',
							outline: 'none'
						}}
						title={`Search with ${engine.label}, click to switch`}
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
								? 'var(--color-border-strong)'
								: 'var(--color-border)',
							transition: 'background 0.2s'
						}}
					/>

					<input
						ref={inputRef}
						type="text"
						value={inputValue}
						onChange={e => setInputValue(e.target.value)}
						onFocus={() => {
							setInputFocused(true);
							if (displayUrl) setInputValue(displayUrl);
						}}
						onBlur={() => {
							setInputFocused(false);
							if (!inputValue.trim() && displayUrl) {
								setInputValue(displayUrl);
							}
						}}
						placeholder={
							inputFocused
								? `Search with ${engine.label} or enter URL`
								: proxyReady
									? 'Search or enter URL'
									: 'Proxy starting...'
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
						{getProtocolDisplay()}
					</span>
				</form>
			</motion.div>

			<div
				className="flex items-center gap-0.5 h-10 rounded-full p-2! relative z-[90]"
				style={pillStyle}
				ref={menuRef}
			>
				<motion.button
					whileHover={{ scale: 1.05 }}
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
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.94 }}
					onClick={() => setIsMenuOpen(!isMenuOpen)}
					className={iconButtonClass}
				>
					<MoreVertical className="w-4 h-4" />
				</motion.button>

				<AnimatePresence>
					{isMenuOpen && (
						<>
							<motion.button
								type="button"
								aria-label="Close menu"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => setIsMenuOpen(false)}
								className="fixed inset-0 z-[85] cursor-default"
								style={{ background: 'transparent' }}
							/>
							<motion.div
								initial={{
									opacity: 0,
									scale: 0.96,
									y: -8,
									filter: 'blur(8px)'
								}}
								animate={{
									opacity: 1,
									scale: 1,
									y: 0,
									filter: 'blur(0px)'
								}}
								exit={{
									opacity: 0,
									scale: 0.96,
									y: -6,
									filter: 'blur(6px)'
								}}
								transition={{
									type: 'spring',
									stiffness: 420,
									damping: 28
								}}
								className="absolute right-0 top-full mt-3 w-56 rounded-2xl p-1.5 flex flex-col z-[95] pointer-events-auto"
								style={{
									background: 'var(--color-surface)',
									border: '1px solid var(--color-border)',
									transformOrigin: 'top right'
								}}
							>
								{[
									{
										label: isPinned
											? 'Unpin from New Tab'
											: 'Pin to New Tab',
										icon: isPinned ? PinOff : Pin,
										action: () => {
											onTogglePin();
											setIsMenuOpen(false);
										},
										disabled: !canTogglePin
									},
									{
										label: isSavedGame
											? 'Remove from Games'
											: 'Save as Game',
										icon: isSavedGame
											? BookmarkMinus
											: Bookmark,
										action: () => {
											onToggleSavedGame();
											setIsMenuOpen(false);
										},
										disabled: !canToggleSavedGame
									}
								].map((item, i) => {
									const Icon = item.icon;
									return (
										<motion.button
											key={item.label}
											initial={{ opacity: 0, x: -4 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{
												delay: i * 0.025 + 0.03,
												duration: 0.14
											}}
											whileHover={
												item.disabled
													? {}
													: {
															background:
																'rgba(255, 255, 255, 0.05)'
														}
											}
											whileTap={
												item.disabled
													? {}
													: { scale: 0.98 }
											}
											onClick={item.action}
											disabled={item.disabled}
											className={`flex items-center gap-2.5 px-3 py-2.5 text-sm text-left rounded-xl transition-colors ${
												item.disabled
													? 'cursor-default text-white/25'
													: 'cursor-pointer text-white/80 hover:text-white'
											}`}
										>
											<Icon className="w-4 h-4 shrink-0" />
											<span className="flex-1">
												{item.label}
											</span>
										</motion.button>
									);
								})}
							</motion.div>
						</>
					)}
				</AnimatePresence>
			</div>
		</header>
	);
};
