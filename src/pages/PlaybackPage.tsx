import { useMemo, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
	Gamepad2,
	Search as SearchIcon,
	Clock,
	Trash2,
	ExternalLink
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
	emptyPlaybackState,
	type PlaybackMediaEntry,
	type PlaybackSearchEntry
} from '../utils/playback';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };
const soft = { type: 'spring' as const, stiffness: 200, damping: 22 };

const tabs = [
	{ id: 'searches', label: 'Searches', icon: SearchIcon },
	{ id: 'games', label: 'Games', icon: Gamepad2 }
] as const;

type TabId = (typeof tabs)[number]['id'];

const formatTimestamp = (ts: number): string => {
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	switch (true) {
		case mins < 1:
			return 'Just now';
		case mins < 60:
			return `${mins}m ago`;
		case hours < 24:
			return `${hours}h ago`;
		case days < 7:
			return `${days}d ago`;
		default:
			return new Date(ts).toLocaleDateString();
	}
};

const groupByDay = <T extends { timestamp: number }>(items: T[]) => {
	const groups = new Map<string, T[]>();
	const now = new Date();
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	items.forEach(item => {
		const date = new Date(item.timestamp);
		let key = 'Older';

		switch (true) {
			case date >= today:
				key = 'Today';
				break;
			case date >= yesterday:
				key = 'Yesterday';
				break;
			default:
				break;
		}

		switch (groups.has(key)) {
			case false:
				groups.set(key, []);
				break;
			default:
				break;
		}

		groups.get(key)!.push(item);
	});

	return groups;
};

const openHistoryEntry = (
	entry: PlaybackMediaEntry | PlaybackSearchEntry,
	kind: 'game' | 'search'
) => {
	window.dispatchEvent(
		new CustomEvent('space:navigate', {
			detail: {
				url: entry.url,
				target: kind === 'search' ? 'new' : 'active',
				title: entry.title,
				image: 'image' in entry ? entry.image : undefined,
				tags: 'tags' in entry ? entry.tags : [],
				kind,
				librarySource:
					'librarySource' in entry ? entry.librarySource : null
			}
		})
	);
};

const MediaCard = ({
	entry,
	delay,
	kind,
	onDelete
}: {
	entry: PlaybackMediaEntry;
	delay: number;
	kind: 'game';
	onDelete: (id: string) => void;
}) => (
	<motion.div
		onClick={() => openHistoryEntry(entry, kind)}
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		exit={{
			opacity: 0,
			scale: 0.96
		}}
		transition={{ ...soft, delay }}
		className="group rounded-2xl overflow-hidden cursor-pointer"
		style={{
			background: 'var(--color-surface)',
			border: '1px solid var(--color-border)'
		}}
	>
		<div
			className="w-full aspect-video"
			style={{
				background: entry.image
					? `url(${entry.image}) center / cover no-repeat`
					: 'var(--color-surface-light)',
				borderBottom: '1px solid var(--color-border)'
			}}
		/>
		<div className="px-4 py-3 flex items-start justify-between gap-2">
			<div className="min-w-0">
				<p className="text-[14px] text-white/80 font-medium truncate group-hover:text-white/95 transition-colors duration-150">
					{entry.title}
				</p>
				<p className="text-[12px] text-white/25 mt-0.5 truncate">
					{entry.hostLabel}
				</p>
				<p className="text-[12px] text-white/20 mt-1">
					{formatTimestamp(entry.timestamp)}
				</p>
			</div>
			<div className="flex items-center gap-1.5 shrink-0">
				<motion.div
					className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
					whileHover={{ scale: 1.15 }}
				>
					<ExternalLink className="w-3.5 h-3.5 text-white/30" />
				</motion.div>
				<motion.button
					whileHover={{ scale: 1.15 }}
					whileTap={{ scale: 0.9 }}
					onClick={event => {
						event.stopPropagation();
						onDelete(entry.id);
					}}
					className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer text-white/25 hover:text-red-400/80"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</motion.button>
			</div>
		</div>
	</motion.div>
);

const SearchEntry = ({
	entry,
	delay,
	onDelete
}: {
	entry: PlaybackSearchEntry;
	delay: number;
	onDelete: (id: string) => void;
}) => (
	<motion.div
		onClick={() => openHistoryEntry(entry, 'search')}
		initial={{ opacity: 0, y: 8 }}
		animate={{ opacity: 1, y: 0 }}
		exit={{
			opacity: 0,
			x: -20,
			height: 0,
			marginBottom: 0,
			paddingTop: 0,
			paddingBottom: 0
		}}
		transition={{ ...soft, delay }}
		className="group flex items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-white/2 rounded-xl cursor-pointer"
	>
		<div
			className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
			style={{
				background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
				border: '1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)'
			}}
		>
			<Clock className="w-3.5 h-3.5" style={{ color: 'color-mix(in srgb, var(--color-primary-light) 60%, transparent)' }} />
		</div>

		<div className="flex-1 min-w-0">
			<p className="text-[14px] text-white/75 font-medium truncate group-hover:text-white/90 transition-colors duration-150">
				{entry.title}
			</p>
			<p className="text-[12px] text-white/20 truncate mt-0.5">
				{entry.hostLabel}
			</p>
		</div>

		<span className="text-[11px] text-white/20 shrink-0 font-mono tabular-nums">
			{formatTimestamp(entry.timestamp)}
		</span>

		<motion.button
			whileHover={{ scale: 1.15 }}
			whileTap={{ scale: 0.9 }}
			onClick={event => {
				event.stopPropagation();
				onDelete(entry.id);
			}}
			className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer text-white/25 hover:text-red-400/80"
		>
			<Trash2 className="w-3.5 h-3.5" />
		</motion.button>
	</motion.div>
);

const MediaPanel = ({
	items,
	kind,
	onDelete
}: {
	items: PlaybackMediaEntry[];
	kind: 'game';
	onDelete: (id: string) => void;
}) => {
	const grouped = useMemo(() => groupByDay(items), [items]);

	return (
		<div className="flex flex-col gap-10">
			{Array.from(grouped.entries()).map(([day, entries], gi) => (
				<motion.section
					key={day}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...soft, delay: gi * 0.06 }}
				>
					<h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-4 pl-1">
						{day}
					</h3>
					<AnimatePresence mode="popLayout">
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
							{entries.map((entry, i) => (
								<MediaCard
									key={`${kind}-${entry.id}`}
									entry={entry}
									delay={i * 0.03}
									kind={kind}
									onDelete={onDelete}
								/>
							))}
						</div>
					</AnimatePresence>
				</motion.section>
			))}
			{items.length === 0 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-center py-20 text-white/20 text-sm"
				>
					No {kind} history yet
				</motion.div>
			)}
		</div>
	);
};

const SearchPanel = ({
	items,
	onDelete
}: {
	items: PlaybackSearchEntry[];
	onDelete: (id: string) => void;
}) => {
	const [query, setQuery] = useState('');
	const filteredItems = useMemo(() => {
		switch (Boolean(query.trim())) {
			case false:
				return items;
			default: {
				const normalizedQuery = query.trim().toLowerCase();

				return items.filter(
					entry =>
						entry.title.toLowerCase().includes(normalizedQuery) ||
						entry.query.toLowerCase().includes(normalizedQuery) ||
						entry.url.toLowerCase().includes(normalizedQuery)
				);
			}
		}
	}, [items, query]);
	const grouped = useMemo(() => groupByDay(filteredItems), [filteredItems]);

	return (
		<div className="flex flex-col gap-8">
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={soft}
				className="flex items-center gap-3 px-5 py-3 rounded-xl"
				style={{
					background: 'rgba(12,10,18,0.65)',
					border: '1px solid rgba(255,255,255,0.06)'
				}}
			>
				<SearchIcon className="w-4 h-4 text-white/20 shrink-0" />
				<input
					type="text"
					value={query}
					onChange={event => setQuery(event.target.value)}
					placeholder="Filter history..."
					spellCheck={false}
					className="flex-1 bg-transparent border-none outline-none text-[13px] text-white/70 placeholder:text-white/15"
					style={{
						fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif"
					}}
				/>
				{query && (
					<motion.button
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						whileTap={{ scale: 0.85 }}
						onClick={() => setQuery('')}
						className="text-[11px] text-white/25 hover:text-white/50 cursor-pointer transition-colors"
					>
						Clear
					</motion.button>
				)}
			</motion.div>

			{Array.from(grouped.entries()).map(([day, dayEntries], gi) => (
				<motion.section
					key={day}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...soft, delay: gi * 0.06 }}
				>
					<h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-2 pl-1">
						{day}
					</h3>
					<div
						className="rounded-2xl divide-y divide-white/4 overflow-hidden"
						style={{
							background: 'var(--color-surface)',
							border: '1px solid var(--color-border)'
						}}
					>
						<AnimatePresence mode="popLayout">
							{dayEntries.map((entry, i) => (
								<SearchEntry
									key={entry.id}
									entry={entry}
									delay={i * 0.02}
									onDelete={onDelete}
								/>
							))}
						</AnimatePresence>
					</div>
				</motion.section>
			))}

			{filteredItems.length === 0 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-center py-20 text-white/20 text-sm"
				>
					{query ? 'No results found' : 'No search history yet'}
				</motion.div>
			)}
		</div>
	);
};

export const PlaybackPage = () => {
	const [active, setActive] = useState<TabId>('searches');
	const [playbackState, setPlaybackState] = useLocalStorage(
		'playbackState',
		emptyPlaybackState
	);

	const handleDeleteGame = (id: string) => {
		setPlaybackState(previousState => ({
			...previousState,
			games: previousState.games.filter(entry => entry.id !== id)
		}));
	};

	const handleDeleteSearch = (id: string) => {
		setPlaybackState(previousState => ({
			...previousState,
			searches: previousState.searches.filter(entry => entry.id !== id)
		}));
	};

	return (
		<div className="h-full w-full overflow-y-auto">
			<div className="min-h-full flex flex-col items-center px-10 pt-20 pb-24">
				<motion.h1
					initial={{ opacity: 0, y: -16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={soft}
					className="text-4xl font-bold text-white/90 tracking-tight mb-3"
				>
					Playback
				</motion.h1>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ ...soft, delay: 0.04 }}
					className="text-base text-white/25 mb-12"
				>
					Games and search history
				</motion.p>

				<LayoutGroup>
					<motion.nav
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ ...soft, delay: 0.06 }}
						className="flex gap-2 p-2.5 rounded-2xl"
					>
						{tabs.map(tab => {
							const Icon = tab.icon;
							const isActive = tab.id === active;

							return (
								<motion.button
									key={tab.id}
									onClick={() => setActive(tab.id)}
									whileTap={{ scale: 0.96 }}
									className="relative flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-sm cursor-pointer z-10"
									animate={{
										color: isActive
											? 'rgba(255,255,255,0.95)'
											: 'rgba(255,255,255,0.35)'
									}}
									transition={{ duration: 0.15 }}
								>
									{isActive && (
										<motion.div
											layoutId="playback-tab"
											className="absolute inset-0 rounded-xl"
											style={{
												background:
													'var(--color-primary)',
												border: '1px solid var(--color-primary)'
											}}
											transition={spring}
										/>
									)}
									<Icon className="w-4 h-4 relative z-10" />
									<span className="relative z-10 font-medium">
										{tab.label}
									</span>
								</motion.button>
							);
						})}
					</motion.nav>
				</LayoutGroup>

				<motion.div
					initial={{ opacity: 0, scaleX: 0 }}
					animate={{ opacity: 1, scaleX: 1 }}
					transition={{ ...soft, delay: 0.1 }}
					className="w-full max-w-4xl h-px mt-12 mb-14"
					style={{
						background: 'var(--color-border)'
					}}
				/>

				<div className="w-full max-w-4xl">
					<AnimatePresence mode="wait">
						<motion.div
							key={active}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -14 }}
							transition={soft}
						>
							{(() => {
								switch (active) {
									case 'games':
										return (
											<MediaPanel
												items={playbackState.games}
												kind="game"
												onDelete={handleDeleteGame}
											/>
										);
									default:
										return (
											<SearchPanel
												items={playbackState.searches}
												onDelete={handleDeleteSearch}
											/>
										);
								}
							})()}
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
};
