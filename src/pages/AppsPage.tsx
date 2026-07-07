import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ItemGrid, type GridItem } from '../components/grid';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { emptySavedAppsState, normalizeComparableUrl } from '../utils/playback';
import appsData from '../json/apps.json';

interface RawApp {
	name: string;
	url: string;
	category: string;
	description?: string;
	confidence?: number;
}

const slugify = (value: string): string =>
	value
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_]/g, '')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '');

const toGridItem = (raw: RawApp, source: 'default' | 'saved'): GridItem => ({
	id: slugify(raw.name) || slugify(raw.url),
	title: raw.name,
	url: raw.url,
	category: raw.category,
	description: raw.description,
	confidence: raw.confidence,
	source
});

const dispatchAppLaunch = (item: GridItem) => {
	if (!item.url) return;
	window.dispatchEvent(
		new CustomEvent('space:navigate', {
			detail: {
				url: item.url,
				target: 'new',
				title: item.title,
				image: item.image,
				kind: 'app',
				librarySource: item.source === 'saved' ? 'custom' : 'default'
			}
		})
	);
};

export const AppsPage = () => {
	const [savedAppsState, setSavedAppsState] = useLocalStorage(
		'savedAppsState',
		emptySavedAppsState
	);

	const removedUrls = useMemo(
		() =>
			new Set(
				savedAppsState.removedAppUrls.map(url =>
					normalizeComparableUrl(url)
				)
			),
		[savedAppsState.removedAppUrls]
	);

	const savedUrls = useMemo(
		() =>
			new Set(
				savedAppsState.customApps.map(app =>
					normalizeComparableUrl(app.url)
				)
			),
		[savedAppsState.customApps]
	);

	const apps = useMemo<GridItem[]>(() => {
		const defaults = appsData as RawApp[];
		const defaultUrls = new Set(
			defaults.map(app => normalizeComparableUrl(app.url))
		);

		const defaultItems = defaults
			.filter(app => !removedUrls.has(normalizeComparableUrl(app.url)))
			.map(app =>
				toGridItem(
					app,
					savedUrls.has(normalizeComparableUrl(app.url))
						? 'saved'
						: 'default'
				)
			);

		const extraSaved = savedAppsState.customApps
			.filter(
				app =>
					app.url && !defaultUrls.has(normalizeComparableUrl(app.url))
			)
			.map(app =>
				toGridItem(
					{
						name: app.name,
						url: app.url,
						category: 'Saved'
					},
					'saved'
				)
			);

		return [...extraSaved, ...defaultItems];
	}, [removedUrls, savedAppsState.customApps, savedUrls]);

	const isItemSaved = useCallback(
		(item: GridItem) =>
			Boolean(item.url) &&
			savedUrls.has(normalizeComparableUrl(item.url!)),
		[savedUrls]
	);

	const handleLaunch = useCallback((item: GridItem) => {
		dispatchAppLaunch(item);
	}, []);

	const handleToggleSave = useCallback(
		(item: GridItem) => {
			if (!item.url) return;
			const url = item.url;
			const normalized = normalizeComparableUrl(url);

			setSavedAppsState(previous => {
				const alreadySaved = previous.customApps.some(
					app => normalizeComparableUrl(app.url) === normalized
				);

				if (alreadySaved) {
					return {
						...previous,
						customApps: previous.customApps.filter(
							app =>
								normalizeComparableUrl(app.url) !== normalized
						)
					};
				}

				return {
					customApps: [
						{
							id: `${slugify(item.title)}-${Date.now()}`,
							name: item.title,
							url,
							image: item.image,
							addedAt: Date.now()
						},
						...previous.customApps
					],
					removedAppUrls: previous.removedAppUrls.filter(
						removed =>
							normalizeComparableUrl(removed) !== normalized
					)
				};
			});
		},
		[setSavedAppsState]
	);

	return (
		<motion.div
			initial="hidden"
			animate="visible"
			variants={{
				hidden: { opacity: 0 },
				visible: {
					opacity: 1,
					transition: {
						staggerChildren: 0.1,
						delayChildren: 0.1
					}
				}
			}}
			className="h-full w-full"
		>
			<ItemGrid
				items={apps}
				onLaunchItem={handleLaunch}
				onToggleSaveItem={handleToggleSave}
				isItemSaved={isItemSaved}
				header={
					<motion.header
						variants={{
							hidden: {
								opacity: 0,
								y: -20,
								filter: 'blur(10px)'
							},
							visible: {
								opacity: 1,
								y: 0,
								filter: 'blur(0px)',
								transition: {
									type: 'spring',
									stiffness: 300,
									damping: 25
								}
							}
						}}
						className="mb-6"
					>
						<h1 className="text-2xl md:text-3xl font-bold text-white/92 tracking-tight">
							Apps
						</h1>
						<p className="mt-1 text-sm text-white/42">
							Explore and launch your favorite applications.
						</p>
					</motion.header>
				}
			/>
		</motion.div>
	);
};
