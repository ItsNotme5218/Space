import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { ItemGrid } from '../components/grid';
import type { GridItem } from '../components/grid';

interface GameItem {
	id: number;
	title: string;
}

interface GameCategory {
	id: number;
	label: string;
	items: GameItem[];
}

interface ViewerState {
	categoryIndex: number;
	itemIndex: number;
}

interface CategoryRowProps {
	category: GameCategory;
	categoryIndex: number;
	delay: number;
	onSelect: (categoryIndex: number, itemIndex: number) => void;
	onViewAll: (categoryIndex: number) => void;
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const createCategories = (
	categoryCount: number,
	itemsPerCategory: number
): GameCategory[] =>
	Array.from({ length: categoryCount }, (_, categoryIndex) => ({
		id: categoryIndex + 1,
		label: `Example ${categoryIndex + 1}`,
		items: Array.from({ length: itemsPerCategory }, (_, itemIndex) => {
			const id = categoryIndex * itemsPerCategory + itemIndex + 1;
			return {
				id,
				title: `Example ${id}`
			};
		})
	}));

const CategoryRow = ({
	category,
	categoryIndex,
	delay,
	onSelect,
	onViewAll
}: CategoryRowProps) => {
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const trackRef = useRef<HTMLDivElement | null>(null);
	const [edgeWeights, setEdgeWeights] = useState<Record<number, number>>({});
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const updateScrollState = useCallback(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		setCanScrollLeft(scroller.scrollLeft > 4);
		setCanScrollRight(
			scroller.scrollLeft <
				scroller.scrollWidth - scroller.clientWidth - 4
		);
	}, []);

	const updateEdgeWeights = useCallback(() => {
		const scroller = scrollerRef.current;
		const track = trackRef.current;
		if (!scroller || !track) {
			return;
		}

		const scrollerRect = scroller.getBoundingClientRect();
		const halfWidth = scrollerRect.width / 4 || 1;
		const nextWeights: Record<number, number> = {};

		Array.from(track.children).forEach((node, index) => {
			const rect = (node as HTMLElement).getBoundingClientRect();
			const center = rect.left + rect.width / 2;
			const nearestSideDistance = Math.min(
				center - scrollerRect.left,
				scrollerRect.right - center
			);
			nextWeights[index] = clamp(nearestSideDistance / halfWidth, 0, 1);
		});

		setEdgeWeights(nextWeights);
		updateScrollState();
	}, [updateScrollState]);

	useEffect(() => {
		const rafId = requestAnimationFrame(updateEdgeWeights);
		const scroller = scrollerRef.current;
		if (!scroller) {
			return () => cancelAnimationFrame(rafId);
		}

		const handleScroll = () => {
			updateEdgeWeights();
		};

		scroller.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', updateEdgeWeights);

		return () => {
			cancelAnimationFrame(rafId);
			scroller.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', updateEdgeWeights);
		};
	}, [updateEdgeWeights]);

	const scrollBy = useCallback((direction: 'left' | 'right') => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const amount = scroller.clientWidth * 0.6;
		scroller.scrollBy({
			left: direction === 'left' ? -amount : amount,
			behavior: 'smooth'
		});
	}, []);

	return (
		<motion.section
			initial={{ opacity: 0, y: 14 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.26, delay }}
		>
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h2 className="text-lg md:text-xl font-semibold text-white/90 tracking-tight">
						{category.label}
					</h2>
					<button
						onClick={() => onViewAll(categoryIndex)}
						className="text-xs font-medium text-white/45 hover:text-white/75 transition-colors"
					>
						View All
					</button>
				</div>
				<div className="flex items-center gap-1.5">
					<motion.button
						onClick={() => scrollBy('left')}
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						animate={{ opacity: canScrollLeft ? 1 : 0.25 }}
						className="h-8 w-8 rounded-full flex items-center justify-center"
						style={{
							background: 'rgba(255,255,255,0.06)',
							border: '1px solid rgba(255,255,255,0.12)'
						}}
						disabled={!canScrollLeft}
					>
						<ChevronLeft className="h-4 w-4 text-white/80" />
					</motion.button>
					<motion.button
						onClick={() => scrollBy('right')}
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						animate={{ opacity: canScrollRight ? 1 : 0.25 }}
						className="h-8 w-8 rounded-full flex items-center justify-center"
						style={{
							background: 'rgba(255,255,255,0.06)',
							border: '1px solid rgba(255,255,255,0.12)'
						}}
						disabled={!canScrollRight}
					>
						<ChevronRight className="h-4 w-4 text-white/80" />
					</motion.button>
				</div>
			</div>
			<div className="-mx-4 px-4">
				<div
					ref={scrollerRef}
					className="overflow-x-auto overflow-y-visible pb-3"
					style={{
						WebkitMaskImage:
							'linear-gradient(to right, transparent 0%, black 9%, black 91%, transparent 100%)',
						maskImage:
							'linear-gradient(to right, transparent 0%, black 9%, black 91%, transparent 100%)',
						scrollPaddingInline: '1rem'
					}}
				>
					<div ref={trackRef} className="flex w-max gap-4 px-4 py-3">
						{category.items.map((item, itemIndex) => {
							const weight = edgeWeights[itemIndex] ?? 1;
							const baseScale = 0.88 + weight * 0.12;
							const firstItemOpacityBoost =
								itemIndex === 0 ? 0.2 : 0;
							const baseOpacity = clamp(
								0.1 + weight * 0.8 + firstItemOpacityBoost,
								0,
								1
							);

							return (
								<motion.button
									key={`${category.id}-${item.id}`}
									onClick={() =>
										onSelect(categoryIndex, itemIndex)
									}
									animate={{
										scale: baseScale,
										opacity: baseOpacity
									}}
									whileHover={{
										y: -4,
										scale: Math.min(baseScale + 0.04, 1.06),
										opacity: 1
									}}
									whileTap={{
										scale: Math.max(baseScale - 0.03, 0.84)
									}}
									transition={{
										type: 'spring',
										stiffness: 280,
										damping: 22
									}}
									className="shrink-0 w-40 md:w-50 rounded-2xl p-3 md:p-4 text-left"
									style={{
										background: 'rgba(20, 10, 30, 1)',
										border: '1px solid rgba(139, 92, 246, 0.3)',
										boxShadow: '0 10px 26px rgba(0,0,0,0.3)'
									}}
								>
									<div
										className="h-24 md:h-28 rounded-xl"
										style={{
											background:
												'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03))',
											border: '1px solid rgba(255,255,255,0.08)'
										}}
									/>
									<h3 className="mt-1.5 text-sm md:text-[15px] font-semibold text-white/92">
										{item.title}
									</h3>
								</motion.button>
							);
						})}
					</div>
				</div>
			</div>
		</motion.section>
	);
};

export const GamesPage = () => {
	const categories = useMemo(() => createCategories(6, 14), []);
	const [viewer, setViewer] = useState<ViewerState | null>(null);
	const [viewAllCategory, setViewAllCategory] = useState<number | null>(null);

	const openViewer = useCallback(
		(categoryIndex: number, itemIndex: number) => {
			setViewer({ categoryIndex, itemIndex });
		},
		[]
	);

	const closeViewer = useCallback(() => {
		setViewer(null);
	}, []);

	const openViewAll = useCallback((categoryIndex: number) => {
		setViewAllCategory(categoryIndex);
	}, []);

	const closeViewAll = useCallback(() => {
		setViewAllCategory(null);
	}, []);

	const goViewerPrev = useCallback(() => {
		setViewer(prev => {
			if (!prev) {
				return prev;
			}
			const total = categories[prev.categoryIndex].items.length;
			return {
				...prev,
				itemIndex: (prev.itemIndex - 1 + total) % total
			};
		});
	}, [categories]);

	const goViewerNext = useCallback(() => {
		setViewer(prev => {
			if (!prev) {
				return prev;
			}
			const total = categories[prev.categoryIndex].items.length;
			return {
				...prev,
				itemIndex: (prev.itemIndex + 1) % total
			};
		});
	}, [categories]);

	useEffect(() => {
		if (!viewer) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				closeViewer();
				return;
			}
			if (event.key === 'ArrowLeft') {
				goViewerPrev();
				return;
			}
			if (event.key === 'ArrowRight') {
				goViewerNext();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [viewer, closeViewer, goViewerPrev, goViewerNext]);

	const viewerItems = viewer ? categories[viewer.categoryIndex].items : [];
	const viewerLabel = viewer ? categories[viewer.categoryIndex].label : '';

	const viewAllItems: GridItem[] = useMemo(() => {
		if (viewAllCategory === null) return [];
		return categories[viewAllCategory].items.map(item => ({
			id: item.id,
			title: item.title
		}));
	}, [viewAllCategory, categories]);

	const viewAllLabel =
		viewAllCategory !== null ? categories[viewAllCategory].label : '';

	const handleGridItemClick = useCallback(
		(item: GridItem) => {
			if (viewAllCategory === null) return;
			const itemIndex = categories[viewAllCategory].items.findIndex(
				i => i.id === item.id
			);
			if (itemIndex !== -1) {
				setViewer({ categoryIndex: viewAllCategory, itemIndex });
			}
		},
		[viewAllCategory, categories]
	);

	if (viewAllCategory !== null) {
		return (
			<div className="relative h-full w-full flex flex-col overflow-hidden">
				<ItemGrid
					items={viewAllItems}
					onItemClick={handleGridItemClick}
					header={
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.22 }}
							className="flex items-center gap-3"
						>
							<button
								onClick={closeViewAll}
								className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-white/85 hover:text-white transition-colors"
								style={{
									background: 'rgba(255,255,255,0.06)',
									border: '1px solid rgba(255,255,255,0.16)'
								}}
							>
								<ArrowLeft className="h-4 w-4" />
								Back
							</button>
							<h1 className="text-2xl md:text-3xl font-bold text-white/92 tracking-tight">
								{viewAllLabel}
							</h1>
						</motion.div>
					}
				/>

				<AnimatePresence>
					{viewer && viewerItems.length > 0 && (
						<motion.section
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-80"
						>
							<div
								className="absolute inset-0"
								style={{
									background: 'rgba(5, 3, 18, 0.96)',
									backdropFilter: 'blur(8px)',
									WebkitBackdropFilter: 'blur(8px)'
								}}
							/>

							<motion.div
								initial={{ opacity: 0, scale: 0.985 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.985 }}
								transition={{ duration: 0.2 }}
								className="relative h-full px-5 py-5 md:px-9 md:py-8 flex flex-col"
							>
								<div className="flex items-center justify-between gap-3">
									<motion.button
										onClick={closeViewer}
										whileHover={{ x: -2, scale: 1.02 }}
										whileTap={{ scale: 0.97 }}
										className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/85"
										style={{
											background:
												'rgba(255,255,255,0.06)',
											border: '1px solid rgba(255,255,255,0.16)'
										}}
									>
										<ArrowLeft className="h-4 w-4" />
										Back
									</motion.button>

									<div className="text-xs uppercase tracking-[0.22em] text-white/45">
										{viewerLabel}
									</div>

									<div className="flex items-center gap-2">
										<motion.button
											onClick={goViewerPrev}
											whileHover={{ scale: 1.06 }}
											whileTap={{ scale: 0.93 }}
											className="h-10 w-10 rounded-full flex items-center justify-center"
											style={{
												background:
													'rgba(255,255,255,0.06)',
												border: '1px solid rgba(255,255,255,0.16)'
											}}
										>
											<ChevronLeft className="h-5 w-5 text-white/85" />
										</motion.button>
										<motion.button
											onClick={goViewerNext}
											whileHover={{ scale: 1.06 }}
											whileTap={{ scale: 0.93 }}
											className="h-10 w-10 rounded-full flex items-center justify-center"
											style={{
												background:
													'rgba(255,255,255,0.06)',
												border: '1px solid rgba(255,255,255,0.16)'
											}}
										>
											<ChevronRight className="h-5 w-5 text-white/85" />
										</motion.button>
									</div>
								</div>

								<div className="relative flex-1 mt-5 overflow-hidden">
									<motion.div
										animate={{
											x: `-${viewer.itemIndex * (100 / viewerItems.length)}%`
										}}
										transition={{
											type: 'spring',
											stiffness: 520,
											damping: 58,
											mass: 0.8
										}}
										className="absolute inset-0 flex"
										style={{
											width: `${viewerItems.length * 100}%`
										}}
									>
										{viewerItems.map((item, index) => (
											<div
												key={`${item.id}-${index}`}
												className="h-full shrink-0 px-1 md:px-3"
												style={{
													width: `${100 / viewerItems.length}%`
												}}
											>
												<motion.article
													initial={{
														opacity: 0.7,
														scale: 0.98
													}}
													animate={{
														opacity: 1,
														scale: 1
													}}
													transition={{
														duration: 0.22
													}}
													className="h-full rounded-3xl p-6 md:p-10 flex flex-col justify-between"
													style={{
														background: `rgba(11, 8, 16, 0.97)`,
														border: '1px solid rgba(203,166,247,0.36)',
														boxShadow:
															'0 16px 60px rgba(0,0,0,0.35), inset 0 0 20px rgba(139,92,246,0.18)'
													}}
												>
													<div>
														<div className="text-xs uppercase tracking-[0.24em] text-violet-200/72">
															{viewerLabel}
														</div>
														<h3 className="mt-3 text-4xl md:text-5xl font-black tracking-tight text-white/95">
															{item.title}
														</h3>
														<p className="mt-3 max-w-xl text-sm md:text-base text-white/56">
															Placeholder
															fullscreen carousel
															panel.
														</p>
													</div>
													<div className="grid grid-cols-3 gap-3 max-w-sm">
														<div
															className="h-14 rounded-xl"
															style={{
																background:
																	'rgba(255,255,255,0.08)'
															}}
														/>
														<div
															className="h-14 rounded-xl"
															style={{
																background:
																	'rgba(255,255,255,0.08)'
															}}
														/>
														<div
															className="h-14 rounded-xl"
															style={{
																background:
																	'rgba(255,255,255,0.08)'
															}}
														/>
													</div>
												</motion.article>
											</div>
										))}
									</motion.div>
								</div>

								<div className="mt-4 flex items-center justify-center gap-2 overflow-x-auto px-2">
									{viewerItems.map((item, index) => {
										const isActive =
											viewer.itemIndex === index;
										return (
											<motion.button
												key={`viewer-dot-${item.id}`}
												onClick={() =>
													setViewer(prev =>
														prev
															? {
																	...prev,
																	itemIndex:
																		index
																}
															: prev
													)
												}
												whileHover={{ scale: 1.15 }}
												whileTap={{ scale: 0.9 }}
												className="h-2.5 rounded-full shrink-0"
												animate={{
													width: isActive ? 24 : 10
												}}
												style={{
													background: isActive
														? 'rgba(203,166,247,0.95)'
														: 'rgba(139,92,246,0.36)',
													boxShadow: isActive
														? '0 0 10px rgba(203,166,247,0.65)'
														: 'none'
												}}
											/>
										);
									})}
								</div>
							</motion.div>
						</motion.section>
					)}
				</AnimatePresence>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full overflow-y-auto px-5 py-6 md:px-10 md:py-8">
			<div className="mx-auto max-w-350 pb-10">
				<motion.header
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.28 }}
					className="mb-6"
				>
					<h1 className="text-2xl md:text-3xl font-bold text-white/92 tracking-tight">
						Games
					</h1>
					<p className="mt-1 text-sm text-white/42">
						Browse games by category.
					</p>
				</motion.header>

				<div className="space-y-7 pb-8">
					{categories.map((category, index) => (
						<CategoryRow
							key={category.id}
							category={category}
							categoryIndex={index}
							delay={index * 0.05}
							onSelect={openViewer}
							onViewAll={openViewAll}
						/>
					))}
				</div>
			</div>

			<AnimatePresence>
				{viewer && viewerItems.length > 0 && (
					<motion.section
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-80"
					>
						<div
							className="absolute inset-0"
							style={{
								background: 'rgba(5, 3, 18, 0.96)',
								backdropFilter: 'blur(8px)',
								WebkitBackdropFilter: 'blur(8px)'
							}}
						/>

						<motion.div
							initial={{ opacity: 0, scale: 0.985 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.985 }}
							transition={{ duration: 0.2 }}
							className="relative h-full px-5 py-5 md:px-9 md:py-8 flex flex-col"
						>
							<div className="flex items-center justify-between gap-3">
								<motion.button
									onClick={closeViewer}
									whileHover={{ x: -2, scale: 1.02 }}
									whileTap={{ scale: 0.97 }}
									className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/85"
									style={{
										background: 'rgba(255,255,255,0.06)',
										border: '1px solid rgba(255,255,255,0.16)'
									}}
								>
									<ArrowLeft className="h-4 w-4" />
									Back
								</motion.button>

								<div className="text-xs uppercase tracking-[0.22em] text-white/45">
									{viewerLabel}
								</div>

								<div className="flex items-center gap-2">
									<motion.button
										onClick={goViewerPrev}
										whileHover={{ scale: 1.06 }}
										whileTap={{ scale: 0.93 }}
										className="h-10 w-10 rounded-full flex items-center justify-center"
										style={{
											background:
												'rgba(255,255,255,0.06)',
											border: '1px solid rgba(255,255,255,0.16)'
										}}
									>
										<ChevronLeft className="h-5 w-5 text-white/85" />
									</motion.button>
									<motion.button
										onClick={goViewerNext}
										whileHover={{ scale: 1.06 }}
										whileTap={{ scale: 0.93 }}
										className="h-10 w-10 rounded-full flex items-center justify-center"
										style={{
											background:
												'rgba(255,255,255,0.06)',
											border: '1px solid rgba(255,255,255,0.16)'
										}}
									>
										<ChevronRight className="h-5 w-5 text-white/85" />
									</motion.button>
								</div>
							</div>

							<div className="relative flex-1 mt-5 overflow-hidden">
								<motion.div
									animate={{
										x: `-${viewer.itemIndex * (100 / viewerItems.length)}%`
									}}
									transition={{
										type: 'spring',
										stiffness: 520,
										damping: 58,
										mass: 0.8
									}}
									className="absolute inset-0 flex"
									style={{
										width: `${viewerItems.length * 100}%`
									}}
								>
									{viewerItems.map((item, index) => (
										<div
											key={`${item.id}-${index}`}
											className="h-full shrink-0 px-1 md:px-3"
											style={{
												width: `${100 / viewerItems.length}%`
											}}
										>
											<motion.article
												initial={{
													opacity: 0.7,
													scale: 0.98
												}}
												animate={{
													opacity: 1,
													scale: 1
												}}
												transition={{ duration: 0.22 }}
												className="h-full rounded-3xl p-6 md:p-10 flex flex-col justify-between"
												style={{
													background: `rgba(11, 8, 16, 0.97)`,
													border: '1px solid rgba(203,166,247,0.36)',
													boxShadow:
														'0 16px 60px rgba(0,0,0,0.35), inset 0 0 20px rgba(139,92,246,0.18)'
												}}
											>
												<div>
													<div className="text-xs uppercase tracking-[0.24em] text-violet-200/72">
														{viewerLabel}
													</div>
													<h3 className="mt-3 text-4xl md:text-5xl font-black tracking-tight text-white/95">
														{item.title}
													</h3>
													<p className="mt-3 max-w-xl text-sm md:text-base text-white/56">
														Placeholder fullscreen
														carousel panel.
													</p>
												</div>
												<div className="grid grid-cols-3 gap-3 max-w-sm">
													<div
														className="h-14 rounded-xl"
														style={{
															background:
																'rgba(255,255,255,0.08)'
														}}
													/>
													<div
														className="h-14 rounded-xl"
														style={{
															background:
																'rgba(255,255,255,0.08)'
														}}
													/>
													<div
														className="h-14 rounded-xl"
														style={{
															background:
																'rgba(255,255,255,0.08)'
														}}
													/>
												</div>
											</motion.article>
										</div>
									))}
								</motion.div>
							</div>

							<div className="mt-4 flex items-center justify-center gap-2 overflow-x-auto px-2">
								{viewerItems.map((item, index) => {
									const isActive = viewer.itemIndex === index;
									return (
										<motion.button
											key={`viewer-dot-${item.id}`}
											onClick={() =>
												setViewer(prev =>
													prev
														? {
																...prev,
																itemIndex: index
															}
														: prev
												)
											}
											whileHover={{ scale: 1.15 }}
											whileTap={{ scale: 0.9 }}
											className="h-2.5 rounded-full shrink-0"
											animate={{
												width: isActive ? 24 : 10
											}}
											style={{
												background: isActive
													? 'rgba(203,166,247,0.95)'
													: 'rgba(139,92,246,0.36)',
												boxShadow: isActive
													? '0 0 10px rgba(203,166,247,0.65)'
													: 'none'
											}}
										/>
									);
								})}
							</div>
						</motion.div>
					</motion.section>
				)}
			</AnimatePresence>
		</div>
	);
};
