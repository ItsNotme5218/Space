import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
	Gamepad2,
	LayoutGrid,
	Search as SearchIcon,
	Clock,
	Trash2,
	ExternalLink
} from 'lucide-react';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };
const soft = { type: 'spring' as const, stiffness: 200, damping: 22 };

const tabs = [
	{ id: 'games', label: 'Games', icon: Gamepad2 },
	{ id: 'apps', label: 'Apps', icon: LayoutGrid },
	{ id: 'searches', label: 'Searches', icon: SearchIcon }
] as const;

type TabId = (typeof tabs)[number]['id'];

interface HistoryEntry {
	id: number;
	title: string;
	url: string;
	timestamp: number;
	favicon?: string;
}

interface MediaEntry {
	id: number;
	title: string;
	image: string;
	timestamp: number;
	url: string;
}

const mockGameHistory: MediaEntry[] = Array.from({ length: 12 }, (_, i) => ({
	id: i + 1,
	title: `Game ${i + 1}`,
	image: '',
	timestamp: Date.now() - i * 3600000 * (1 + Math.random() * 5),
	url: `https://example.com/game/${i + 1}`
}));

const mockAppHistory: MediaEntry[] = Array.from({ length: 10 }, (_, i) => ({
	id: i + 100,
	title: `App ${i + 1}`,
	image: '',
	timestamp: Date.now() - i * 3600000 * (2 + Math.random() * 8),
	url: `https://example.com/app/${i + 1}`
}));

const mockSearchHistory: HistoryEntry[] = Array.from(
	{ length: 20 },
	(_, i) => ({
		id: i + 200,
		title: `Search result ${i + 1}`,
		url: `https://example.com/search?q=query+${i + 1}`,
		timestamp: Date.now() - i * 1800000 * (1 + Math.random() * 3),
		favicon: undefined
	})
);

const formatTimestamp = (ts: number): string => {
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (mins < 1) return 'Just now';
	if (mins < 60) return `${mins}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;
	return new Date(ts).toLocaleDateString();
};

const groupByDay = <T extends { timestamp: number }>(
	items: T[]
): Map<string, T[]> => {
	const groups = new Map<string, T[]>();
	const now = new Date();
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	items.forEach(item => {
		const date = new Date(item.timestamp);
		let key: string;
		if (date >= today) key = 'Today';
		else if (date >= yesterday) key = 'Yesterday';
		else key = 'Older';

		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(item);
	});

	return groups;
};

const MediaCard = ({ entry, delay }: { entry: MediaEntry; delay: number }) => (
	<motion.a
		href={entry.url}
		initial={{ opacity: 0, y: 10 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ ...soft, delay }}
		whileHover={{ y: -3, scale: 1.02 }}
		whileTap={{ scale: 0.97 }}
		className="group block rounded-2xl overflow-hidden cursor-pointer"
		style={{
			background: 'rgba(12,10,18,0.65)',
			border: '1px solid rgba(255,255,255,0.06)',
			boxShadow:
				'0 2px 16px -4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)'
		}}
		onClick={e => e.preventDefault()}
	>
		<div
			className="w-full aspect-video"
			style={{
				background:
					'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(255,255,255,0.03))',
				borderBottom: '1px solid rgba(255,255,255,0.04)'
			}}
		/>
		<div className="px-4 py-3 flex items-start justify-between gap-2">
			<div className="min-w-0">
				<p className="text-[14px] text-white/80 font-medium truncate group-hover:text-white/95 transition-colors duration-150">
					{entry.title}
				</p>
				<p className="text-[12px] text-white/25 mt-0.5">
					{formatTimestamp(entry.timestamp)}
				</p>
			</div>
			<motion.div
				className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
				whileHover={{ scale: 1.15 }}
			>
				<ExternalLink className="w-3.5 h-3.5 text-white/30" />
			</motion.div>
		</div>
	</motion.a>
);

const SearchEntry = ({
	entry,
	delay,
	onDelete
}: {
	entry: HistoryEntry;
	delay: number;
	onDelete: (id: number) => void;
}) => {
	let hostname = '';
	try {
		hostname = new URL(entry.url).hostname;
	} catch {
		hostname = entry.url;
	}

	return (
		<motion.div
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
			className="group flex items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-white/2 rounded-xl"
		>
			<div
				className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
				style={{
					background: 'rgba(139,92,246,0.1)',
					border: '1px solid rgba(139,92,246,0.15)'
				}}
			>
				{entry.favicon ? (
					<img
						src={entry.favicon}
						alt=""
						className="w-4 h-4 rounded-sm"
					/>
				) : (
					<Clock className="w-3.5 h-3.5 text-violet-300/60" />
				)}
			</div>

			<div className="flex-1 min-w-0">
				<p className="text-[14px] text-white/75 font-medium truncate group-hover:text-white/90 transition-colors duration-150">
					{entry.title}
				</p>
				<p className="text-[12px] text-white/20 truncate mt-0.5">
					{hostname}
				</p>
			</div>

			<span className="text-[11px] text-white/20 shrink-0 font-mono tabular-nums">
				{formatTimestamp(entry.timestamp)}
			</span>

			<motion.button
				whileHover={{ scale: 1.15 }}
				whileTap={{ scale: 0.9 }}
				onClick={() => onDelete(entry.id)}
				className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer text-white/25 hover:text-red-400/80"
			>
				<Trash2 className="w-3.5 h-3.5" />
			</motion.button>
		</motion.div>
	);
};

const MediaPanel = ({ items, type }: { items: MediaEntry[]; type: string }) => {
	const grouped = groupByDay(items);

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
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
						{entries.map((entry, i) => (
							<MediaCard
								key={`${type}-${entry.id}`}
								entry={entry}
								delay={i * 0.03}
							/>
						))}
					</div>
				</motion.section>
			))}
			{items.length === 0 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-center py-20 text-white/20 text-sm"
				>
					No {type} history yet
				</motion.div>
			)}
		</div>
	);
};

const SearchPanel = () => {
	const [entries, setEntries] = useState(mockSearchHistory);
	const [query, setQuery] = useState('');

	const handleDelete = (id: number) => {
		setEntries(prev => prev.filter(e => e.id !== id));
	};

	const filtered = query
		? entries.filter(
				e =>
					e.title.toLowerCase().includes(query.toLowerCase()) ||
					e.url.toLowerCase().includes(query.toLowerCase())
			)
		: entries;

	const grouped = groupByDay(filtered);

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
					onChange={e => setQuery(e.target.value)}
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
							background: 'rgba(12,10,18,0.65)',
							border: '1px solid rgba(255,255,255,0.06)',
							backdropFilter: 'blur(8px)',
							WebkitBackdropFilter: 'blur(8px)',
							boxShadow:
								'0 2px 16px -4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)'
						}}
					>
						<AnimatePresence mode="popLayout">
							{dayEntries.map((entry, i) => (
								<SearchEntry
									key={entry.id}
									entry={entry}
									delay={i * 0.02}
									onDelete={handleDelete}
								/>
							))}
						</AnimatePresence>
					</div>
				</motion.section>
			))}

			{filtered.length === 0 && (
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

const panels: Record<TabId, () => React.ReactNode> = {
	games: () => <MediaPanel items={mockGameHistory} type="game" />,
	apps: () => <MediaPanel items={mockAppHistory} type="app" />,
	searches: () => <SearchPanel />
};

export const PlaybackPage = () => {
	const [active, setActive] = useState<TabId>('games');
	const Panel = panels[active];

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
					Games, apps, and search history
				</motion.p>

				<LayoutGroup>
					<motion.nav
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ ...soft, delay: 0.06 }}
						className="flex gap-2 p-2.5 rounded-2xl"
						style={{
							background: 'rgba(12,10,18,0.5)',
							border: '1px solid rgba(255,255,255,0.05)',
							backdropFilter: 'blur(40px)',
							WebkitBackdropFilter: 'blur(40px)',
							boxShadow: '0 2px 16px -6px rgba(0,0,0,0.35)'
						}}
					>
						{tabs.map(t => {
							const Icon = t.icon;
							const isActive = t.id === active;
							return (
								<motion.button
									key={t.id}
									onClick={() => setActive(t.id)}
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
													'linear-gradient(180deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.06) 100%)',
												border: '1px solid rgba(139,92,246,0.18)',
												boxShadow:
													'inset 0 1px 1px rgba(255,255,255,0.08), inset 0 -1px 2px rgba(0,0,0,0.15), 0 0 16px rgba(139,92,246,0.08)'
											}}
											transition={spring}
										/>
									)}
									<Icon className="w-4 h-4 relative z-10" />
									<span className="relative z-10 font-medium">
										{t.label}
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
						background:
							'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.2) 25%, rgba(139,92,246,0.3) 50%, rgba(139,92,246,0.2) 75%, transparent 100%)'
					}}
				/>

				<div className="w-full max-w-4xl">
					<AnimatePresence mode="wait">
						<motion.div
							key={active}
							initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
							animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
							exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
							transition={soft}
						>
							<Panel />
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
};
