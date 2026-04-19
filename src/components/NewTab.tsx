import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus } from 'lucide-react';
import {
	readSetting,
	writeSetting,
	cache,
	subscribe,
	useLocalStorage
} from '../hooks/useLocalStorage';
import {
	defaultPins,
	getPinHostname,
	addPin,
	removePin,
	isPinned,
	pinLimit,
	type PinnedShortcut
} from '../utils/pins';

const spring = { type: 'spring' as const, stiffness: 520, damping: 34 };
const springSoft = { type: 'spring' as const, stiffness: 420, damping: 30 };

const font = "'DM Sans', 'Inter', system-ui, sans-serif";

const accent = '#8b5cf6';

const getGreeting = (): string => {
	const hour = new Date().getHours();
	switch (true) {
		case hour < 4:
			return 'Good Night';
		case hour < 12:
			return 'Good Morning';
		case hour < 17:
			return 'Good Afternoon';
		case hour < 21:
			return 'Good Evening';
		default:
			return 'Good Night';
	}
};

const readLS = (key: string, fallback: boolean): boolean => {
	switch (cache.has(key)) {
		case true:
			return cache.get(key) as boolean;
		default:
			return fallback;
	}
};

const formatTime = (hour12: boolean): { time: string; period: string } => {
	const now = new Date();
	switch (hour12) {
		case false:
			return {
				time: now.toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
					hour12: false
				}),
				period: ''
			};
		default: {
			const h = now.getHours();
			const m = now.getMinutes();
			const period = h >= 12 ? 'PM' : 'AM';
			const h12 = h % 12 || 12;
			return {
				time: `${h12}:${m.toString().padStart(2, '0')}`,
				period
			};
		}
	}
};

const formatDate = (): string => {
	const now = new Date();
	return now
		.toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		})
		.toUpperCase();
};

const faviconUrl = (url: string): string =>
	`https://www.google.com/s2/favicons?domain=${encodeURIComponent(getPinHostname(url))}&sz=64`;

const hashHue = (input: string): number => {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		hash = (hash * 31 + input.charCodeAt(i)) | 0;
	}
	return Math.abs(hash) % 360;
};

const tileColor = (url: string): string => `hsl(${hashHue(url)}, 60%, 62%)`;

interface NewTabProps {
	onNavigate?: (url: string) => void;
}

const PinTile = ({
	pin,
	index,
	onOpen,
	onRemove
}: {
	pin: PinnedShortcut;
	index: number;
	onOpen: (url: string) => void;
	onRemove: (url: string) => void;
}) => {
	const [iconFailed, setIconFailed] = useState(false);
	const [hovered, setHovered] = useState(false);
	const color = tileColor(pin.url);

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.85, y: 8 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.85, y: 8 }}
			transition={{ ...spring, delay: 0.08 + index * 0.018 }}
			className="relative flex flex-col items-center gap-2 py-2 rounded-xl group"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			whileHover={{ scale: 1.05, y: -2 }}
		>
			<motion.button
				whileTap={{ scale: 0.95 }}
				onClick={() => onOpen(pin.url)}
				className="w-14 h-14 rounded-[14px] flex items-center justify-center relative overflow-hidden cursor-pointer"
				style={{
					border: `1px solid rgba(255, 255, 255, 0.06)`
				}}
				title={`${getPinHostname(pin.url)} - open shortcut`}
			>
				{iconFailed ? (
					<span
						className="text-base font-bold relative z-10"
						style={{
							color,
							fontFamily: font,
							letterSpacing: '-0.02em'
						}}
					>
						{getPinHostname(pin.url).charAt(0).toUpperCase()}
					</span>
				) : (
					<img
						src={faviconUrl(pin.url)}
						alt=""
						onError={() => setIconFailed(true)}
						className="relative z-10"
						style={{ width: 24, height: 24, borderRadius: 5 }}
					/>
				)}
			</motion.button>
			<span
				className="text-[10px] leading-none truncate max-w-18 text-center uppercase"
				style={{
					fontFamily: font,
					color: 'rgba(255, 255, 255, 0.55)',
					letterSpacing: '0.08em',
					fontWeight: 500
				}}
			>
				{pin.name}
			</span>

			<motion.button
				animate={{
					opacity: hovered ? 1 : 0,
					scale: hovered ? 1 : 0.6
				}}
				transition={{ duration: 0.15 }}
				whileHover={{ scale: 1.12 }}
				whileTap={{ scale: 0.92 }}
				onClick={e => {
					e.stopPropagation();
					onRemove(pin.url);
				}}
				className="absolute cursor-pointer flex items-center justify-center"
				style={{
					top: -2,
					right: 2,
					width: 20,
					height: 20,
					borderRadius: 10,
					color: 'rgba(255, 255, 255, 0.9)'
				}}
				title={`Unpin ${pin.name}`}
				aria-label={`Unpin ${pin.name}`}
			>
				<span
					aria-hidden="true"
					style={{
						fontSize: 16,
						lineHeight: 0.75,
						fontWeight: 700,
						transform: 'translateY(-1px)'
					}}
				>
					×
				</span>
			</motion.button>
		</motion.div>
	);
};

const AddPinTile = ({ onAdd }: { onAdd: () => void }) => {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.85, y: 8 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			transition={{ ...spring, delay: 0.12 }}
			className="relative flex flex-col items-center gap-2 py-2 rounded-xl group"
		>
			<motion.button
				type="button"
				whileHover={{ scale: 1.05, y: -2 }}
				whileTap={{ scale: 0.95 }}
				onClick={onAdd}
				className="w-14 h-14 rounded-[14px] flex items-center justify-center relative"
				style={{
					background: 'rgba(14, 14, 18, 0.35)',
					border: '1px dashed rgba(255, 255, 255, 0.14)',
					cursor: 'pointer'
				}}
				title="Pin a site"
			>
				<Plus
					style={{
						width: 18,
						height: 18,
						color: 'rgba(255, 255, 255, 0.55)'
					}}
					strokeWidth={2}
				/>
			</motion.button>
			<span
				className="text-[10px] leading-none uppercase"
				style={{
					fontFamily: font,
					color: 'rgba(255, 255, 255, 0.4)',
					letterSpacing: '0.08em',
					fontWeight: 500
				}}
			>
				Add
			</span>
		</motion.div>
	);
};

export const NewTab = ({ onNavigate }: NewTabProps) => {
	const [searchFocused, setSearchFocused] = useState(false);
	const [searchValue, setSearchValue] = useState('');
	const [hour12, setHour12] = useState(() => readLS('clock12h', false));
	const [lockFormat, setLockFormat] = useState(() =>
		readLS('clockLock', false)
	);
	const [timeParts, setTimeParts] = useState(() => formatTime(hour12));
	const [greeting] = useState(getGreeting);
	const [pins, setPins] = useLocalStorage<PinnedShortcut[]>(
		'pinnedShortcuts',
		defaultPins
	);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			const [h12, lock] = await Promise.all([
				readSetting('clock12h', false),
				readSetting('clockLock', false)
			]);
			switch (cancelled) {
				case true:
					return;
				default:
					setHour12(h12);
					setLockFormat(lock);
			}
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
		const interval = setInterval(
			() => setTimeParts(formatTime(hour12)),
			10_000
		);
		return () => clearInterval(interval);
	}, [hour12]);

	const handleClockClick = () => {
		switch (lockFormat) {
			case true:
				return;
			default: {
				const next = !hour12;
				setHour12(next);
				writeSetting('clock12h', next);
				setTimeParts(formatTime(next));
			}
		}
	};

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const query = searchValue.trim();
		switch (true) {
			case query.length === 0:
			case !onNavigate:
				return;
			default:
				onNavigate!(query);
		}
	};

	const handlePinOpen = (url: string) => {
		onNavigate?.(url);
	};

	const handlePinRemove = (url: string) => {
		setPins(previous => removePin(previous, url));
	};

	const handlePromptPin = () => {
		switch (pins.length >= pinLimit) {
			case true:
				window.alert(
					`Pin limit reached (${pinLimit}). Unpin a site first.`
				);
				return;
			default:
				break;
		}

		const input = window.prompt('Enter a site URL to pin', 'https://');

		if (input === null) {
			return;
		}

		const trimmed = input.trim();

		switch (trimmed.length === 0) {
			case false:
				break;
			default:
				window.alert('Enter a valid URL to pin.');
				return;
		}

		switch (isPinned(pins, trimmed)) {
			case true:
				window.alert('That site is already pinned.');
				return;
			default:
				break;
		}

		const next = addPin(pins, { url: trimmed });

		switch (next.length > pins.length) {
			case true:
				setPins(next);
				return;
			default:
				window.alert(
					'Could not pin that site. Check the URL and try again.'
				);
		}
	};

	return (
		<div
			className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
			style={{ background: 'transparent' }}
		>
			<motion.div
				initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
				animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
				transition={{ ...springSoft, delay: 0 }}
				className="flex flex-col items-center mb-8 select-none"
			>
				<motion.span
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.02, duration: 0.22 }}
					className="text-[10px] mb-3 flex items-center gap-2"
					style={{
						fontFamily: font,
						color: 'rgba(255, 255, 255, 0.35)',
						letterSpacing: '0.22em',
						fontWeight: 500
					}}
				>
					<span
						style={{
							display: 'inline-block',
							width: 16,
							height: 1,
							background: 'rgba(139, 92, 246, 0.5)'
						}}
					/>
					{formatDate()}
					<span
						style={{
							display: 'inline-block',
							width: 16,
							height: 1,
							background: 'rgba(139, 92, 246, 0.5)'
						}}
					/>
				</motion.span>
				<motion.div
					className="relative"
					onClick={handleClockClick}
					whileTap={lockFormat ? {} : { scale: 0.97 }}
					style={{ cursor: lockFormat ? 'default' : 'pointer' }}
				>
					<motion.span
						className="text-[72px] font-light leading-none"
						style={{
							fontFamily: font,
							color: 'rgba(255, 255, 255, 0.92)',
							letterSpacing: '-0.04em',
							fontVariantNumeric: 'tabular-nums'
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
								className="absolute text-[14px] font-medium"
								style={{
									fontFamily: font,
									color: 'rgba(139, 92, 246, 0.7)',
									letterSpacing: '0.1em',
									right: 0,
									top: 4,
									transform: 'translate(calc(100% + 8px), 0)'
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
					transition={{ delay: 0.08, duration: 0.22 }}
					className="text-xs mt-3"
					style={{
						fontFamily: font,
						color: 'rgba(255, 255, 255, 0.45)',
						letterSpacing: '0.14em',
						fontWeight: 400
					}}
				>
					{greeting}
				</motion.span>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 16, scale: 0.97 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ ...springSoft, delay: 0.04 }}
				className="w-full px-6"
				style={{ maxWidth: 520 }}
			>
				<form onSubmit={handleSearchSubmit}>
					<motion.div
						animate={{
							boxShadow: searchFocused
								? '0 0 0 1px rgba(139, 92, 246, 0.45), 0 0 32px rgba(139, 92, 246, 0.12), 0 8px 24px rgba(0, 0, 0, 0.5)'
								: '0 0 0 1px rgba(255, 255, 255, 0.03), 0 8px 20px rgba(0, 0, 0, 0.35)',
							borderColor: searchFocused
								? 'rgba(139, 92, 246, 0.45)'
								: 'rgba(40, 40, 50, 0.7)'
						}}
						transition={{ duration: 0.2 }}
						className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-xl"
						style={{
							background: 'rgba(12, 12, 16, 0.75)',
							backdropFilter: 'blur(8px)',
							WebkitBackdropFilter: 'blur(8px)',
							border: '1px solid rgba(40, 40, 50, 0.7)'
						}}
					>
						<div
							className="shrink-0 flex items-center justify-center"
							style={{
								width: 28,
								height: 28,
								borderRadius: 8,
								transition: 'all 0.2s'
							}}
						>
							<Search
								style={{
									width: 14,
									height: 14,
									color: searchFocused
										? 'rgba(139, 92, 246, 0.9)'
										: 'rgba(255, 255, 255, 0.35)',
									transition: 'color 0.2s'
								}}
							/>
						</div>
						<input
							type="text"
							placeholder="Search or enter URL"
							value={searchValue}
							onChange={e => setSearchValue(e.target.value)}
							onFocus={() => setSearchFocused(true)}
							onBlur={() => setSearchFocused(false)}
							className="flex-1 bg-transparent border-none outline-none py-1"
							style={{
								fontSize: 14,
								fontFamily: font,
								letterSpacing: '0.005em',
								color: 'rgba(255, 255, 255, 0.88)',
								caretColor: accent
							}}
						/>
					</motion.div>
				</form>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ ...springSoft, delay: 0.08 }}
				className="mt-10 w-full px-6"
				style={{ maxWidth: 560 }}
			>
				<div
					className="flex flex-wrap justify-center gap-4"
				>
					<AnimatePresence mode="popLayout">
						{pins.map((pin, i) => (
							<PinTile
								key={pin.id}
								pin={pin}
								index={i}
								onOpen={handlePinOpen}
								onRemove={handlePinRemove}
							/>
						))}
					</AnimatePresence>
					<AddPinTile onAdd={handlePromptPin} />
				</div>
			</motion.div>
		</div>
	);
};
