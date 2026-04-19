import {
	memo,
	startTransition,
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Flag,
	Play,
	Search,
	X
} from 'lucide-react';
import { Loading } from '../components/Loading';
import { SpaceGames } from '../utils/games';

type GameSource = 'local' | 'imported';

interface GameItem {
	id: string;
	title: string;
	image: string;
	url: string;
	tags: string[];
	source: GameSource;
	hostLabel: string;
	searchValue: string;
}

interface RawGame {
	id: string;
	name: string;
	image?: string;
	url?: string;
	tags?: string[];
}

interface GameCategory {
	id: string;
	label: string;
	description: string;
	totalItems: number;
	items: GameItem[];
}

interface ViewerState {
	categoryId: string;
	itemIndex: number;
}

interface CategoryRowProps {
	category: GameCategory;
	onSelect: (categoryId: string, itemIndex: number) => void;
	onViewAll: (categoryId: string) => void;
}

interface GamePosterProps {
	title: string;
	image: string;
	className?: string;
}

interface GameCardProps {
	game: GameItem;
	onSelect: () => void;
	compact?: boolean;
}

const rowPreviewSize = 18;
const activePageSize = 120;
const viewerPreviewSize = 12;
const importedMapBatchSize = 600;
const shelfEdgeZone = 72;
const glassStyle = {
	background: 'rgba(12,10,18,0.65)',
	border: '1px solid rgba(255,255,255,0.06)',
	boxShadow:
		'0 2px 16px -4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
	backdropFilter: 'blur(24px)',
	WebkitBackdropFilter: 'blur(24px)'
};
const buttonStyle = {
	background: 'rgba(12,10,18,0.5)',
	border: '1px solid rgba(255,255,255,0.05)',
	boxShadow: '0 2px 16px -6px rgba(0,0,0,0.35)',
	backdropFilter: 'blur(40px)',
	WebkitBackdropFilter: 'blur(40px)'
};
const primaryButtonStyle = {
	background:
		'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.12))',
	border: '1px solid rgba(139,92,246,0.22)',
	boxShadow: '0 0 16px rgba(139,92,246,0.15)',
	color: '#c4b5fd'
};
const reportIssueUrl = 'https://github.com/crllect/space-v2/issues/new';

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const spaceGames = new SpaceGames();
let cachedLocalGames: GameItem[] | null = null;
let cachedImportedGames: GameItem[] | null = null;
let localGamesPromise: Promise<GameItem[]> | null = null;
let importedGamesPromise: Promise<GameItem[]> | null = null;

const categoryConfig = [
	{
		id: 'popular',
		label: 'Popular',
		description: 'The quickest way into the most opened games.'
	},
	{
		id: 'multiplayer',
		label: 'Multiplayer',
		description: 'Competitive and co-op games worth queueing up.'
	},
	{
		id: 'horror',
		label: 'Horror',
		description: 'Short, weird, and tense picks for darker sessions.'
	},
	{
		id: 'emulator',
		label: 'Emulators',
		description: 'Retro-style runs and throwback favorites.'
	},
	{
		id: 'all',
		label: 'All Games',
		description: 'Everything in the library, local and imported.'
	}
] as const;

const normalizeImage = (image?: string) => {
	switch (true) {
		case !image:
			return '';
		case image!.startsWith('//'):
			return `https:${image}`;
		default:
			return image!;
	}
};

const normalizeTagValue = (tag: string) => {
	const value = tag.trim().toLowerCase();

	switch (true) {
		case value.includes('featured'):
		case value.includes('trending'):
		case value.includes('popular'):
		case value.includes('top rated'):
		case value.includes('top-rated'):
		case value === 'hot':
			return 'popular';
		case value.includes('multiplayer'):
		case value.includes('multi-player'):
		case value.includes('multi player'):
		case value.includes('co-op'):
		case value.includes('coop'):
		case value.includes('versus'):
		case value.includes('2 player'):
		case value.includes('two player'):
		case value.includes('.io'):
			return 'multiplayer';
		case value.includes('horror'):
		case value.includes('scary'):
		case value.includes('spooky'):
		case value.includes('creepy'):
		case value.includes('haunted'):
		case value.includes('zombie'):
			return 'horror';
		case value.includes('emulator'):
		case value.includes('emulation'):
		case value.includes('retro'):
		case value.includes('arcade'):
		case value.includes('game boy'):
		case value.includes('gameboy'):
		case value.includes('nintendo'):
		case value.includes('nes'):
		case value.includes('snes'):
		case value.includes('n64'):
		case value.includes('gba'):
		case value.includes('gbc'):
		case value.includes('sega'):
		case value.includes('playstation'):
		case value.includes('ps1'):
			return 'emulator';
		default:
			return value;
	}
};

const inferGameTags = (game: RawGame) => {
	const sourceValues = [game.name ?? '', game.url ?? '', ...(game.tags ?? [])];
	const nextTags: string[] = [];

	for (const value of sourceValues) {
		const normalizedValue = normalizeTagValue(value);

		switch (normalizedValue) {
			case 'popular':
			case 'multiplayer':
			case 'horror':
			case 'emulator':
				nextTags.push(normalizedValue);
				break;
			default:
				break;
		}
	}

	return Array.from(new Set(nextTags));
};

const normalizeTags = (tags?: string[]) =>
	Array.from(
		new Set(
			['all', ...(tags ?? [])]
				.filter(Boolean)
				.map(tag => normalizeTagValue(tag))
		)
	);

const mapGame = (game: RawGame, source: GameSource): GameItem => {
	const url = game.url ?? '';
	const tags = normalizeTags([...(game.tags ?? []), ...inferGameTags(game)]);
	const hostLabel = getHostLabel(url);

	return {
		id: game.id,
		title: game.name,
		image: normalizeImage(game.image),
		url,
		tags,
		source,
		hostLabel,
		searchValue: [game.name, url, source, hostLabel, ...tags]
			.join(' ')
			.toLowerCase()
	};
};

const waitForIdle = () =>
	new Promise<void>(resolve => {
		switch (typeof window.requestIdleCallback) {
			case 'function':
				window.requestIdleCallback(() => resolve(), {
					timeout: 120
				});
				return;
			default:
				window.setTimeout(resolve, 16);
		}
	});

const fetchMappedLocalGames = () => {
	switch (Boolean(cachedLocalGames)) {
		case true:
			return Promise.resolve(cachedLocalGames!);
		default:
			break;
	}

	switch (Boolean(localGamesPromise)) {
		case true:
			return localGamesPromise!;
		default:
			break;
	}

	localGamesPromise = spaceGames
		.fetchLocalGamesList()
		.then(localList => {
			cachedLocalGames = localList.map(game => mapGame(game, 'local'));
			return cachedLocalGames;
		})
		.catch(error => {
			localGamesPromise = null;
			throw error;
		});

	return localGamesPromise;
};

const fetchMappedImportedGames = (existingIds: Set<string>) => {
	switch (Boolean(cachedImportedGames)) {
		case true:
			return Promise.resolve(cachedImportedGames!);
		default:
			break;
	}

	switch (Boolean(importedGamesPromise)) {
		case true:
			return importedGamesPromise!;
		default:
			break;
	}

	importedGamesPromise = (async () => {
		const importedList =
			await spaceGames.fetchImportedGamesList(existingIds);
		const nextImportedGames: GameItem[] = [];

		for (
			let startIndex = 0;
			startIndex < importedList.length;
			startIndex += importedMapBatchSize
		) {
			nextImportedGames.push(
				...importedList
					.slice(startIndex, startIndex + importedMapBatchSize)
					.map(game => mapGame(game, 'imported'))
			);
			await waitForIdle();
		}

		cachedImportedGames = nextImportedGames;
		return cachedImportedGames;
	})().catch(error => {
		importedGamesPromise = null;
		throw error;
	});

	return importedGamesPromise;
};

const getAllPreviewItems = (
	localGames: GameItem[],
	importedGames: GameItem[]
) => {
	switch (true) {
		case localGames.length >= rowPreviewSize:
			return localGames.slice(0, rowPreviewSize);
		case importedGames.length === 0:
			return localGames.slice(0, rowPreviewSize);
		default:
			return [
				...localGames,
				...importedGames.slice(
					0,
					Math.max(0, rowPreviewSize - localGames.length)
				)
			];
	}
};

const getHostLabel = (url: string) => {
	switch (true) {
		case !url:
			return 'library';
		default:
			try {
				return new URL(url).hostname.replace(/^www\./, '');
			} catch {
				return 'library';
			}
	}
};

const getTagLabel = (tag: string) => {
	switch (tag) {
		case 'popular':
			return 'Popular';
		case 'multiplayer':
			return 'Multiplayer';
		case 'horror':
			return 'Horror';
		case 'emulator':
			return 'Emulator';
		case 'all':
			return 'All';
		default:
			return tag.charAt(0).toUpperCase() + tag.slice(1);
	}
};

const getSummaryText = (game: GameItem, categoryLabel: string) => {
	const visibleTags = game.tags.filter(tag => tag !== 'all');

	switch (visibleTags.length) {
		case 0:
			return `${game.title} is ready to open from ${game.hostLabel}.`;
		case 1:
			return `${game.title} is part of ${getTagLabel(visibleTags[0]).toLowerCase()} and opens directly inside the browser tab.`;
		default:
			return `${game.title} fits the ${categoryLabel.toLowerCase()} shelf and is tagged ${getTagLabel(visibleTags[0]).toLowerCase()} and ${getTagLabel(visibleTags[1]).toLowerCase()}.`;
	}
};

const dispatchGameLaunch = (url: string, target: 'active' | 'new') => {
	switch (Boolean(url)) {
		case false:
			return;
		default:
			window.dispatchEvent(
				new CustomEvent('space:navigate', {
					detail: {
						url,
						target
					}
				})
			);
	}
};

const GamePoster = memo(({ title, image, className = '' }: GamePosterProps) => {
	const [imageFailed, setImageFailed] = useState(false);
	const hasLoadedImage = Boolean(image) && !imageFailed;

	useEffect(() => {
		setImageFailed(false);
	}, [image]);

	return (
		<div
			className={`relative overflow-hidden ${className}`}
		>
			{hasLoadedImage ? (
				<img
					src={image}
					alt={title}
					loading="lazy"
					decoding="async"
					referrerPolicy="no-referrer"
					onError={() => setImageFailed(true)}
					className="absolute inset-0 h-full w-full object-cover"
				/>
			) : (
				<div className="absolute inset-0 animate-pulse bg-white/6" />
			)}

			<div
				className="absolute inset-0 flex flex-col items-start justify-end p-4"
			>
				<div className="mt-2 max-w-full truncate text-sm font-semibold text-white/92">
					{title}
				</div>
			</div>
		</div>
	);
});

const GameCard = memo(({ game, onSelect, compact = false }: GameCardProps) => {
	const visibleTags = game.tags.filter(tag => tag !== 'all').slice(0, 2);
	const hoverBorderColor =
		game.source === 'imported'
			? 'rgba(190,147,255,0.3)'
			: 'rgba(255,255,255,0.15)';

	return (
		<motion.button
			onClick={onSelect}
			whileHover={{
				y: compact ? -3 : -4,
				scale: compact ? 1.01 : 1.02,
				borderColor: hoverBorderColor
			}}
			whileTap={{ scale: 0.97 }}
			className={`overflow-hidden rounded-2xl text-left ${
				compact ? 'shrink-0 w-44 md:w-52' : 'w-full'
			}`}
			style={{
				...glassStyle,
				border: `1px solid ${
					game.source === 'imported'
						? 'rgba(168,85,247,0.22)'
						: 'rgba(255,255,255,0.1)'
				}`
			}}
		>
			<div className="p-3">
				<GamePoster
					title={game.title}
					image={game.image}
					className={
						compact ? 'h-28 md:h-32 rounded-xl' : 'h-40 rounded-xl'
					}
				/>

				<div className="mt-3 space-y-2 px-1 pb-1">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<h3 className="truncate text-sm font-semibold text-white/94 md:text-[15px]">
								{game.title}
							</h3>
							<p className="mt-1 truncate text-[11px] uppercase tracking-[0.22em] text-white/34">
								{game.hostLabel}
							</p>
						</div>

						<span
							className="rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em]"
							style={{
								background:
									game.source === 'imported'
										? 'rgba(168,85,247,0.14)'
										: 'rgba(255,255,255,0.08)',
								color:
									game.source === 'imported'
										? 'rgba(233,213,255,0.92)'
										: 'rgba(255,255,255,0.54)'
							}}
						>
							{game.source}
						</span>
					</div>

					<div className="flex flex-wrap gap-1.5">
						{visibleTags.length > 0 ? (
							visibleTags.map(tag => (
								<span
									key={`${game.id}-${tag}`}
									className="rounded-full bg-white/7 px-2.5 py-1 text-[11px] font-medium text-white/62"
								>
									{getTagLabel(tag)}
								</span>
							))
						) : (
							<span className="rounded-full bg-white/7 px-2.5 py-1 text-[11px] font-medium text-white/48">
								Explore
							</span>
						)}
					</div>
				</div>
			</div>
		</motion.button>
	);
});

const CategoryRow = memo(
	({ category, onSelect, onViewAll }: CategoryRowProps) => {
		const scrollerRef = useRef<HTMLDivElement | null>(null);
		const trackRef = useRef<HTMLDivElement | null>(null);
		const [edgeWeights, setEdgeWeights] = useState<Record<number, number>>(
			{}
		);
		const [canScrollLeft, setCanScrollLeft] = useState(false);
		const [canScrollRight, setCanScrollRight] = useState(false);

		const updateScrollState = useCallback(() => {
			const scroller = scrollerRef.current;

			switch (Boolean(scroller)) {
				case false:
					return;
				default:
					setCanScrollLeft(scroller!.scrollLeft > 4);
					setCanScrollRight(
						scroller!.scrollLeft <
							scroller!.scrollWidth - scroller!.clientWidth - 4
					);
			}
		}, []);

		const updateEdgeWeights = useCallback(() => {
			const scroller = scrollerRef.current;
			const track = trackRef.current;

			switch (Boolean(scroller && track)) {
				case false:
					return;
				default:
					break;
			}

			const scrollerRect = scroller!.getBoundingClientRect();
			const edgeZone = Math.min(
				shelfEdgeZone,
				scrollerRect.width / 5 || 1
			);
			const safeLeft = scrollerRect.left + edgeZone;
			const safeRight = scrollerRect.right - edgeZone;
			const nextWeights: Record<number, number> = {};

			Array.from(track!.children).forEach((node, index) => {
				const rect = (node as HTMLElement).getBoundingClientRect();
				const leftPenalty = clamp(
					(safeLeft - rect.left) / Math.max(edgeZone, 1),
					0,
					1
				);
				const rightPenalty = clamp(
					(rect.right - safeRight) / Math.max(edgeZone, 1),
					0,
					1
				);

				nextWeights[index] = clamp(
					1 - Math.max(leftPenalty, rightPenalty),
					0,
					1
				);
			});

			setEdgeWeights(nextWeights);
			updateScrollState();
		}, [updateScrollState]);

		useEffect(() => {
			const scroller = scrollerRef.current;
			const rafId = requestAnimationFrame(updateEdgeWeights);

			switch (Boolean(scroller)) {
				case false:
					return () => cancelAnimationFrame(rafId);
				default:
					break;
			}

			const handleScroll = () => {
				updateEdgeWeights();
			};

			scroller!.addEventListener('scroll', handleScroll, {
				passive: true
			});
			window.addEventListener('resize', updateEdgeWeights);

			return () => {
				cancelAnimationFrame(rafId);
				scroller!.removeEventListener('scroll', handleScroll);
				window.removeEventListener('resize', updateEdgeWeights);
			};
		}, [updateEdgeWeights]);

		const scrollShelf = useCallback((direction: 'left' | 'right') => {
			const scroller = scrollerRef.current;

			switch (Boolean(scroller)) {
				case false:
					return;
				default:
					scroller!.scrollBy({
						left:
							direction === 'left'
								? -scroller!.clientWidth * 0.68
								: scroller!.clientWidth * 0.68,
						behavior: 'smooth'
					});
			}
		}, []);

		return (
			<motion.section
				initial={false}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35 }}
				className="space-y-4"
			>
				<div className="flex items-end justify-between gap-4">
					<div className="space-y-1">
						<h2 className="text-xl font-semibold tracking-tight text-white/92 md:text-2xl">
							{category.label}
							<span className="ml-2 text-sm font-medium text-white/34">
								({category.totalItems.toLocaleString()})
							</span>
						</h2>
						<p className="text-sm text-white/44">
							{category.description}
						</p>
					</div>

					<div className="flex items-center gap-2">
						<motion.button
							onClick={() => onViewAll(category.id)}
							whileHover={{ scale: 1.03 }}
							whileTap={{ scale: 0.97 }}
							className="rounded-xl px-4 py-2 text-sm font-medium text-white/78"
							style={buttonStyle}
						>
							View All
						</motion.button>
						<motion.button
							onClick={() => scrollShelf('left')}
							whileHover={{ scale: 1.06 }}
							whileTap={{ scale: 0.95 }}
							disabled={!canScrollLeft}
							className="flex h-10 w-10 items-center justify-center rounded-xl"
							style={{
								...buttonStyle,
								opacity: canScrollLeft ? 1 : 0.3
							}}
						>
							<ChevronLeft className="h-4 w-4 text-white/84" />
						</motion.button>
						<motion.button
							onClick={() => scrollShelf('right')}
							whileHover={{ scale: 1.06 }}
							whileTap={{ scale: 0.95 }}
							disabled={!canScrollRight}
							className="flex h-10 w-10 items-center justify-center rounded-xl"
							style={{
								...buttonStyle,
								opacity: canScrollRight ? 1 : 0.3
							}}
						>
							<ChevronRight className="h-4 w-4 text-white/84" />
						</motion.button>
					</div>
				</div>

				<div className="-mx-16 px-8">
					<div
						ref={scrollerRef}
						className="overflow-x-auto pb-2 px-8"
						style={{
							scrollbarWidth: 'none',
							msOverflowStyle: 'none',
							WebkitMaskImage:
								'linear-gradient(to right, transparent 0, black 64px, black calc(100% - 64px), transparent 100%)',
							maskImage:
								'linear-gradient(to right, transparent 0, black 64px, black calc(100% - 64px), transparent 100%)'
						}}
					>
						<div ref={trackRef} className="flex w-max gap-4 py-2">
							{category.items.map((game, itemIndex) => {
								const weight = edgeWeights[itemIndex] ?? 1;
								const baseOpacity = clamp(
									0.6 + weight * 0.4,
									0,
									1
								);

								return (
									<motion.div
										key={`${category.id}-${game.id}-${itemIndex}`}
										animate={{
											opacity: baseOpacity
										}}
										whileHover={{
											opacity: 1
										}}
										className="origin-center"
									>
										<GameCard
											game={game}
											compact
											onSelect={() =>
												onSelect(category.id, itemIndex)
											}
										/>
									</motion.div>
								);
							})}
						</div>
					</div>
				</div>
			</motion.section>
		);
	}
);

export const GamesPage = () => {
	const [localGames, setLocalGames] = useState<GameItem[]>(
		() => cachedLocalGames ?? []
	);
	const [importedGames, setImportedGames] = useState<GameItem[]>(
		() => cachedImportedGames ?? []
	);
	const [isLoading, setIsLoading] = useState(() => !cachedLocalGames);
	const [isImportedLoading, setIsImportedLoading] = useState(
		() => !cachedImportedGames
	);
	const [searchValue, setSearchValue] = useState('');
	const [viewer, setViewer] = useState<ViewerState | null>(null);
	const [viewAllCategory, setViewAllCategory] = useState<string | null>(null);
	const [visibleItemCount, setVisibleItemCount] = useState(activePageSize);

	const deferredSearchValue = useDeferredValue(
		searchValue.trim().toLowerCase()
	);
	const isInitialLibraryLoading = isLoading && localGames.length === 0;

	useEffect(() => {
		let cancelled = false;

		fetchMappedLocalGames()
			.then(nextLocalGames => {
				switch (cancelled) {
					case true:
						return;
					default:
						break;
				}

				setLocalGames(nextLocalGames);
				setIsLoading(false);

				switch (Boolean(cachedImportedGames)) {
					case true:
						setImportedGames(cachedImportedGames!);
						setIsImportedLoading(false);
						return;
					default:
						setIsImportedLoading(true);
				}

				const localIds = new Set(nextLocalGames.map(game => game.id));

				fetchMappedImportedGames(localIds)
					.then(nextImportedGames => {
						switch (cancelled) {
							case true:
								return;
							default:
								startTransition(() => {
									setImportedGames(nextImportedGames);
								});
								setIsImportedLoading(false);
						}
					})
					.catch(error => {
						switch (cancelled) {
							case true:
								return;
							default:
								console.warn(
									'[GamesPage] imported games failed',
									error
								);
								setIsImportedLoading(false);
						}
					});
			})
			.catch(error => {
				switch (cancelled) {
					case true:
						return;
					default:
						console.error('[GamesPage] local games failed', error);
						setLocalGames([]);
						setImportedGames([]);
						setIsLoading(false);
						setIsImportedLoading(false);
						break;
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const totalGameCount = localGames.length + importedGames.length;

	const categoryMap = useMemo(() => {
		const nextMap: Record<string, GameItem[]> = {};

		for (const gameList of [localGames, importedGames]) {
			for (const game of gameList) {
				for (const tag of game.tags) {
					switch (Boolean(nextMap[tag])) {
						case false:
							nextMap[tag] = [];
							break;
						default:
							break;
					}

					nextMap[tag].push(game);
				}
			}
		}

		return nextMap;
	}, [importedGames, localGames]);

	const allPreviewItems = useMemo(
		() => getAllPreviewItems(localGames, importedGames),
		[importedGames, localGames]
	);

	const needsMergedGames = useMemo(() => {
		switch (true) {
			case deferredSearchValue.length > 0:
			case viewAllCategory === 'all':
			case viewer?.categoryId === 'all':
				return true;
			default:
				return false;
		}
	}, [deferredSearchValue.length, viewAllCategory, viewer?.categoryId]);

	const mergedGames = useMemo(() => {
		switch (needsMergedGames) {
			case true:
				return [...localGames, ...importedGames];
			default:
				return [];
		}
	}, [importedGames, localGames, needsMergedGames]);

	const getCategoryItems = useCallback(
		(categoryId: string) => {
			switch (categoryId) {
				case 'popular':
					return categoryMap.popular ?? [];
				case 'multiplayer':
					return categoryMap.multiplayer ?? [];
				case 'horror':
					return categoryMap.horror ?? [];
				case 'emulator':
					return categoryMap.emulator ?? [];
				case 'all':
					return mergedGames;
				default:
					return [];
			}
		},
		[categoryMap, mergedGames]
	);

	const rowCategories = useMemo(() => {
		return categoryConfig
			.map(config => {
				switch (config.id) {
					case 'all':
						return {
							id: config.id,
							label: config.label,
							description: config.description,
							totalItems: totalGameCount,
							items: allPreviewItems
						} satisfies GameCategory;
					default: {
						const sourceItems = categoryMap[config.id] ?? [];

						return {
							id: config.id,
							label: config.label,
							description: config.description,
							totalItems: sourceItems.length,
							items: sourceItems.slice(0, rowPreviewSize)
						} satisfies GameCategory;
					}
				}
			})
			.filter(category => category.totalItems > 0);
	}, [allPreviewItems, categoryMap, totalGameCount]);

	const activeCategory = useMemo(() => {
		switch (true) {
			case deferredSearchValue.length > 0: {
				const items = mergedGames.filter(game =>
					game.searchValue.includes(deferredSearchValue)
				);

				return {
					id: 'search',
					label: `Results for "${searchValue.trim()}"`,
					description: `${items.length.toLocaleString()} matching games`,
					totalItems: items.length,
					items
				} satisfies GameCategory;
			}
			case Boolean(viewAllCategory): {
				const matchedConfig = categoryConfig.find(
					config => config.id === viewAllCategory
				);
				const items = getCategoryItems(viewAllCategory!);

				switch (Boolean(matchedConfig)) {
					case false:
						return null;
					default:
						return {
							id: matchedConfig!.id,
							label: matchedConfig!.label,
							description: matchedConfig!.description,
							totalItems: items.length,
							items
						} satisfies GameCategory;
				}
			}
			default:
				return null;
		}
	}, [
		deferredSearchValue,
		getCategoryItems,
		mergedGames,
		searchValue,
		viewAllCategory
	]);

	const viewerCategory = useMemo(() => {
		switch (Boolean(viewer)) {
			case false:
				return null;
			default:
				switch (activeCategory?.id === viewer!.categoryId) {
					case true:
						return activeCategory;
					default: {
						const matchedConfig = categoryConfig.find(
							config => config.id === viewer!.categoryId
						);
						const items = getCategoryItems(viewer!.categoryId);

						switch (Boolean(matchedConfig)) {
							case false:
								return null;
							default:
								return {
									id: matchedConfig!.id,
									label: matchedConfig!.label,
									description: matchedConfig!.description,
									totalItems: items.length,
									items
								} satisfies GameCategory;
						}
					}
				}
		}
	}, [activeCategory, getCategoryItems, viewer]);

	const viewerItems = viewerCategory?.items ?? [];

	const activeViewerGame = useMemo(() => {
		switch (Boolean(viewer && viewerItems.length > 0)) {
			case false:
				return null;
			default:
				return viewerItems[viewer!.itemIndex] ?? null;
		}
	}, [viewer, viewerItems]);

	const visibleActiveItems = useMemo(() => {
		switch (Boolean(activeCategory)) {
			case false:
				return [];
			default:
				return activeCategory!.items.slice(0, visibleItemCount);
		}
	}, [activeCategory, visibleItemCount]);

	const viewerPreviewItems = useMemo(() => {
		switch (Boolean(viewer && activeViewerGame)) {
			case false:
				return [];
			default: {
				const maxStart = Math.max(
					0,
					viewerItems.length - viewerPreviewSize
				);
				const startIndex = clamp(
					viewer!.itemIndex - Math.floor(viewerPreviewSize / 2),
					0,
					maxStart
				);

				return viewerItems.slice(
					startIndex,
					startIndex + viewerPreviewSize
				);
			}
		}
	}, [activeViewerGame, viewer, viewerItems]);

	const canLoadMoreActiveItems = useMemo(() => {
		switch (Boolean(activeCategory)) {
			case false:
				return false;
			default:
				return visibleItemCount < activeCategory!.totalItems;
		}
	}, [activeCategory, visibleItemCount]);

	useEffect(() => {
		setVisibleItemCount(activePageSize);
	}, [activeCategory?.id, deferredSearchValue, viewAllCategory]);

	useEffect(() => {
		setViewer(currentViewer => {
			switch (Boolean(currentViewer)) {
				case false:
					return currentViewer;
				default:
					break;
			}

			const category =
				activeCategory?.id === currentViewer!.categoryId
					? activeCategory
					: viewerCategory;

			switch (Boolean(category)) {
				case false:
					return null;
				case currentViewer!.itemIndex >= category!.items.length:
					return {
						...currentViewer!,
						itemIndex: 0
					};
				default:
					return currentViewer;
			}
		});
	}, [activeCategory, viewerCategory]);

	const openViewer = useCallback((categoryId: string, itemIndex: number) => {
		setViewer({ categoryId, itemIndex });
	}, []);

	const closeViewer = useCallback(() => {
		setViewer(null);
	}, []);

	const openViewAll = useCallback((categoryId: string) => {
		setViewAllCategory(categoryId);
		setViewer(null);
	}, []);

	const closeViewAll = useCallback(() => {
		setViewAllCategory(null);
	}, []);

	const goViewerPrev = useCallback(() => {
		setViewer(previousViewer => {
			switch (Boolean(previousViewer && viewerItems.length > 0)) {
				case false:
					return previousViewer;
				default:
					return {
						...previousViewer!,
						itemIndex:
							(previousViewer!.itemIndex -
								1 +
								viewerItems.length) %
							viewerItems.length
					};
			}
		});
	}, [viewerItems.length]);

	const goViewerNext = useCallback(() => {
		setViewer(previousViewer => {
			switch (Boolean(previousViewer && viewerItems.length > 0)) {
				case false:
					return previousViewer;
				default:
					return {
						...previousViewer!,
						itemIndex:
							(previousViewer!.itemIndex + 1) % viewerItems.length
					};
			}
		});
	}, [viewerItems.length]);

	const handlePlayNow = useCallback(() => {
		switch (Boolean(activeViewerGame)) {
			case false:
				return;
			default:
				dispatchGameLaunch(activeViewerGame!.url, 'new');
				setViewer(null);
		}
	}, [activeViewerGame]);

	const handleReportBrokenGame = useCallback(() => {
		switch (Boolean(activeViewerGame)) {
			case false:
				return;
			default: {
				const title = `Broken game: ${activeViewerGame!.title}`;
				const body = [
					`Game: ${activeViewerGame!.title}`,
					`URL: ${activeViewerGame!.url}`,
					`Source: ${activeViewerGame!.source}`,
					`Tags: ${activeViewerGame!.tags.join(', ')}`,
					'',
					'What is broken?'
				].join('\n');
				const query = new URLSearchParams({
					title,
					body
				});

				window.open(`${reportIssueUrl}?${query.toString()}`, '_blank');
				setViewer(null);
			}
		}
	}, [activeViewerGame]);

	const loadMoreActiveItems = useCallback(() => {
		setVisibleItemCount(previousCount => previousCount + activePageSize);
	}, []);

	useEffect(() => {
		switch (Boolean(viewer)) {
			case false:
				return;
			default:
				break;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			switch (event.key) {
				case 'Escape':
					closeViewer();
					return;
				case 'ArrowLeft':
					goViewerPrev();
					return;
				case 'ArrowRight':
					goViewerNext();
					return;
				default:
					return;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [closeViewer, goViewerNext, goViewerPrev, viewer]);

	return (
		<div className="h-full w-full overflow-y-auto">
			<div className="min-h-full px-10 pt-16 pb-24">
				<div className="mx-auto max-w-[1500px] space-y-8">
					<motion.header
						initial={false}
						animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
						transition={{ duration: 0.25 }}
						className="space-y-6"
					>
						<div className="space-y-3 text-center">
							<h1 className="text-3xl font-bold tracking-tight text-white/94 md:text-4xl">
								Games
								<span className="ml-2 text-base font-normal text-white/40">
									({totalGameCount.toLocaleString()})
								</span>
							</h1>
							<p className="mx-auto max-w-2xl text-base text-white/25">
								Search the library, skim the shelves, and launch
								games directly into the browser tab.
							</p>
						</div>

						<div className="mx-auto grid w-full max-w-3xl gap-3 sm:grid-cols-3">
							<div
								className="rounded-2xl px-4 py-3"
								style={glassStyle}
							>
								<div className="text-[11px] uppercase tracking-[0.22em] text-white/34">
									Local
								</div>
								<div className="mt-2 text-2xl font-semibold text-white/92">
									{localGames.length.toLocaleString()}
								</div>
							</div>
							<div
								className="rounded-2xl px-4 py-3"
								style={glassStyle}
							>
								<div className="text-[11px] uppercase tracking-[0.22em] text-white/34">
									Imported
								</div>
								<div className="mt-2 text-2xl font-semibold text-white/92">
									{importedGames.length.toLocaleString()}
								</div>
							</div>
							<div
								className="rounded-2xl px-4 py-3"
								style={glassStyle}
							>
								<div className="text-[11px] uppercase tracking-[0.22em] text-white/34">
									Status
								</div>
								<div className="mt-2 text-sm font-medium text-white/74">
									{isImportedLoading
										? 'Loading imports'
										: 'Ready'}
								</div>
							</div>
						</div>

						<div
							className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-xl px-5 py-3"
							style={glassStyle}
						>
							<Search className="h-4 w-4 text-white/42" />
							<input
								value={searchValue}
								onChange={event => {
									setSearchValue(event.target.value);
									setViewAllCategory(null);
								}}
								placeholder="Search titles, tags, source, or URL"
								spellCheck={false}
								className="w-full bg-transparent text-sm text-white/88 outline-none placeholder:text-white/34"
							/>
							{searchValue ? (
								<button
									onClick={() => setSearchValue('')}
									className="flex h-8 w-8 items-center justify-center rounded-full text-white/46 transition-colors hover:text-white"
								>
									<X className="h-4 w-4" />
								</button>
							) : null}
						</div>
					</motion.header>

					{isInitialLibraryLoading ? (
						<div
							className="relative overflow-hidden rounded-3xl px-6 py-20"
							style={glassStyle}
						>
							<div className="relative h-20">
								<Loading />
							</div>
						</div>
					) : activeCategory ? (
						<section className="space-y-5">
							<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
								<div className="space-y-2">
									<h2 className="text-2xl font-semibold tracking-tight text-white/92 md:text-3xl">
										{activeCategory.label}
									</h2>
									<p className="text-sm text-white/44">
										{activeCategory.description}
									</p>
								</div>

								<div className="flex items-center gap-2">
									{deferredSearchValue.length === 0 ? (
										<motion.button
											onClick={closeViewAll}
											whileHover={{ scale: 1.03 }}
											whileTap={{ scale: 0.97 }}
											className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white/84"
											style={buttonStyle}
										>
											<ArrowLeft className="h-4 w-4" />
											Back
										</motion.button>
									) : null}
									<div className="rounded-xl bg-white/8 px-4 py-2 text-sm text-white/56">
										{activeCategory.totalItems.toLocaleString()}{' '}
										games
									</div>
								</div>
							</div>

							{activeCategory.totalItems > 0 ? (
								<>
									<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
										{visibleActiveItems.map(
											(game, itemIndex) => (
												<GameCard
													key={`${activeCategory.id}-${game.id}`}
													game={game}
													onSelect={() =>
														openViewer(
															activeCategory.id,
															itemIndex
														)
													}
												/>
											)
										)}
									</div>

									{canLoadMoreActiveItems ? (
										<div className="flex justify-center pt-2">
											<motion.button
												onClick={loadMoreActiveItems}
												whileHover={{ scale: 1.03 }}
												whileTap={{ scale: 0.97 }}
												className="rounded-xl px-5 py-3 text-sm font-medium"
												style={primaryButtonStyle}
											>
												Load More
											</motion.button>
										</div>
									) : null}
								</>
							) : (
								<div
									className="rounded-2xl px-6 py-16 text-center"
									style={glassStyle}
								>
									<div className="text-lg font-semibold text-white/90">
										No matching games
									</div>
									<p className="mt-2 text-sm text-white/46">
										Try another search or clear the filters.
									</p>
								</div>
							)}
						</section>
					) : (
						<div className="space-y-10">
							{rowCategories.map(category => (
								<CategoryRow
									key={category.id}
									category={category}
									onSelect={openViewer}
									onViewAll={openViewAll}
								/>
							))}
						</div>
					)}
				</div>

				<AnimatePresence>
					{activeViewerGame && viewerCategory ? (
						<motion.section
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-80"
						>
							<div
								className="absolute inset-0"
								onClick={closeViewer}
								style={{
									background: 'rgba(5, 3, 18, 0.92)',
                  filter: 'blur(100px)',
									backdropFilter: 'blur(10px)',
									WebkitBackdropFilter: 'blur(10px)'
								}}
							/>

							<motion.div
								initial={{ opacity: 0, scale: 0.985, y: 16 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.985, y: 16 }}
								transition={{ duration: 0.2 }}
								className="relative flex h-full flex-col px-5 py-5 md:px-8 md:py-7"
							>
								<div className="flex items-center justify-between gap-3">
									<motion.button
										onClick={closeViewer}
										whileHover={{ x: -2, scale: 1.02 }}
										whileTap={{ scale: 0.97 }}
										className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white/88"
										style={buttonStyle}
									>
										<ArrowLeft className="h-4 w-4" />
										Back
									</motion.button>

									<div className="text-xs uppercase tracking-[0.24em] text-white/42">
										{viewerCategory.label}
									</div>

									<div className="flex items-center gap-2">
										<motion.button
											onClick={goViewerPrev}
											whileHover={{ scale: 1.06 }}
											whileTap={{ scale: 0.94 }}
											className="flex h-10 w-10 items-center justify-center rounded-xl"
											style={buttonStyle}
										>
											<ChevronLeft className="h-4 w-4 text-white/84" />
										</motion.button>
										<motion.button
											onClick={goViewerNext}
											whileHover={{ scale: 1.06 }}
											whileTap={{ scale: 0.94 }}
											className="flex h-10 w-10 items-center justify-center rounded-xl"
											style={buttonStyle}
										>
											<ChevronRight className="h-4 w-4 text-white/84" />
										</motion.button>
									</div>
								</div>

								<div className="mt-6 grid flex-1 gap-6 overflow-hidden lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
									<div
										className="min-h-0 overflow-hidden rounded-3xl p-4"
										style={{
											...glassStyle,
											border: '1px solid rgba(255,255,255,0.08)'
										}}
									>
										<GamePoster
											title={activeViewerGame.title}
											image={activeViewerGame.image}
											className="h-full min-h-[320px] w-full rounded-2xl"
										/>
									</div>

									<div
										className="flex min-h-0 flex-col overflow-hidden rounded-3xl p-6"
										style={{
											background: 'rgba(11, 8, 16, 0.97)',
											border: '1px solid rgba(203,166,247,0.22)',
											boxShadow:
												'0 16px 60px rgba(0,0,0,0.35), inset 0 0 20px rgba(139,92,246,0.12)'
										}}
									>
										<div className="space-y-4">
											<div className="space-y-2">
												<div className="text-[11px] uppercase tracking-[0.24em] text-white/38">
													{activeViewerGame.hostLabel}
												</div>
												<h2 className="text-3xl font-bold tracking-tight text-white/94 md:text-4xl">
													{activeViewerGame.title}
												</h2>
											</div>

											<p className="text-sm leading-6 text-white/56 md:text-base">
												{getSummaryText(
													activeViewerGame,
													viewerCategory.label
												)}
											</p>

											<div className="flex flex-wrap gap-2">
												{activeViewerGame.tags.map(
													tag => (
														<span
															key={`${activeViewerGame.id}-${tag}`}
															className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-white/68"
														>
															{getTagLabel(tag)}
														</span>
													)
												)}
											</div>

											<div className="flex flex-wrap gap-3">
												<motion.button
													onClick={handlePlayNow}
													whileHover={{
														scale: 1.02,
														y: -1
													}}
													whileTap={{ scale: 0.98 }}
													className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
													style={primaryButtonStyle}
												>
													<Play className="h-4 w-4" />
													Play Now
												</motion.button>
												<motion.button
													onClick={
														handleReportBrokenGame
													}
													whileHover={{
														scale: 1.02,
														y: -1
													}}
													whileTap={{ scale: 0.98 }}
													className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white/88"
													style={buttonStyle}
												>
													<Flag className="h-4 w-4" />
													Report Broken Game
												</motion.button>
											</div>
										</div>

										<div className="mt-6 min-h-0 flex-1 overflow-hidden">
											<div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-white/38">
												More in {viewerCategory.label}
											</div>
											<div className="grid max-h-full gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
												{viewerPreviewItems.map(
													game => {
														const itemIndex =
															viewerItems.findIndex(
																item =>
																	item.id ===
																	game.id
															);

														return (
															<motion.button
																key={`viewer-item-${game.id}`}
																onClick={() =>
																	openViewer(
																		viewerCategory.id,
																		itemIndex
																	)
																}
																whileHover={{
																	y: -2,
																	scale: 1.01
																}}
																whileTap={{
																	scale: 0.99
																}}
																className="overflow-hidden rounded-2xl p-3 text-left"
																style={{
																	background:
																		itemIndex ===
																		viewer?.itemIndex
																			? 'rgba(139,92,246,0.12)'
																			: 'rgba(255,255,255,0.05)',
																	border:
																		itemIndex ===
																		viewer?.itemIndex
																			? '1px solid rgba(139,92,246,0.24)'
																			: '1px solid rgba(255,255,255,0.08)'
																}}
															>
																<GamePoster
																	title={
																		game.title
																	}
																	image={
																		game.image
																	}
																	className="h-24 w-full rounded-xl"
																/>
																<div className="mt-3 truncate text-sm font-semibold text-white/90">
																	{game.title}
																</div>
																<div className="mt-1 truncate text-[11px] uppercase tracking-[0.2em] text-white/34">
																	{
																		game.hostLabel
																	}
																</div>
															</motion.button>
														);
													}
												)}
											</div>
										</div>
									</div>
								</div>
							</motion.div>
						</motion.section>
					) : null}
				</AnimatePresence>
			</div>
		</div>
	);
};
