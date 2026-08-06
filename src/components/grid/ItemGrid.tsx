import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { GridCard } from './GridCard';
import { Pagination } from './Pagination';
import type { GridItem, GridConfig } from './types';
import { defaultGridConfig } from './types';

interface ItemGridProps {
	items: GridItem[];
	config?: Partial<GridConfig>;
	header?: ReactNode;
	resetKey?: string;
	onItemClick?: (item: GridItem) => void;
	onLaunchItem?: (item: GridItem) => void;
	onToggleSaveItem?: (item: GridItem) => void;
	isItemSaved?: (item: GridItem) => boolean;
}

export const ItemGrid = ({
	items,
	config,
	header,
	resetKey,
	onItemClick,
	onLaunchItem,
	onToggleSaveItem,
	isItemSaved
}: ItemGridProps) => {
	const { cols, rows, staggerDelay } = { ...defaultGridConfig, ...config };
	const itemsPerPage = cols * rows;

	const [currentPage, setCurrentPage] = useState(0);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [staggerKey, setStaggerKey] = useState(0);

	useEffect(() => {
		setCurrentPage(0);
		setExpandedId(null);
		setStaggerKey(k => k + 1);
	}, [resetKey]);

	const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
	const safePage = Math.min(currentPage, totalPages - 1);
	const currentItems = items.slice(
		safePage * itemsPerPage,
		(safePage + 1) * itemsPerPage
	);

	const getExpandDirection = (index: number) => {
		const col = index % cols;
		const row = Math.floor(index / cols);
		const expandRight = col < cols - 1;
		const expandDown = row < rows - 1;
		return { expandRight, expandDown };
	};

	const getExpandedStyle = (index: number, isExpanded: boolean) => {
		const col = index % cols;
		const row = Math.floor(index / cols);
		const { expandRight, expandDown } = getExpandDirection(index);

		if (isExpanded) {
			return {
				gridColumn: expandRight
					? `${col + 1} / span 2`
					: `${col} / span 2`,
				gridRow: expandDown ? `${row + 1} / span 2` : `${row} / span 2`,
				zIndex: 50
			};
		}
		return {
			gridColumn: `${col + 1} / span 1`,
			gridRow: `${row + 1} / span 1`,
			zIndex: 1
		};
	};

	const isHiddenByExpansion = (index: number) => {
		if (expandedId === null) return false;
		const expandedIndex = currentItems.findIndex(
			item => item.id === expandedId
		);
		if (expandedIndex === -1) return false;
		if (currentItems[index]?.id === expandedId) return false;

		const col = index % cols;
		const row = Math.floor(index / cols);
		const expCol = expandedIndex % cols;
		const expRow = Math.floor(expandedIndex / cols);
		const { expandRight: expR, expandDown: expD } =
			getExpandDirection(expandedIndex);

		const expColStart = expR ? expCol : expCol - 1;
		const expColEnd = expColStart + 1;
		const expRowStart = expD ? expRow : expRow - 1;
		const expRowEnd = expRowStart + 1;

		return (
			col >= expColStart &&
			col <= expColEnd &&
			row >= expRowStart &&
			row <= expRowEnd
		);
	};

	const handleCardClick = useCallback(
		(id: string) => {
			if (onItemClick) {
				const item = items.find(i => i.id === id);
				if (item) onItemClick(item);
				return;
			}
			setExpandedId(prev => (prev === id ? null : id));
		},
		[onItemClick, items]
	);

	const handleHoverStart = useCallback((id: string) => {
		setHoveredId(id);
	}, []);

	const handleHoverEnd = useCallback(() => {
		setHoveredId(null);
	}, []);

	const handleNextPage = useCallback(() => {
		setExpandedId(null);
		setStaggerKey(k => k + 1);
		setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
	}, [totalPages]);

	const handlePrevPage = useCallback(() => {
		setExpandedId(null);
		setStaggerKey(k => k + 1);
		setCurrentPage(prev => Math.max(prev - 1, 0));
	}, []);

	const handlePageSelect = useCallback((page: number) => {
		setExpandedId(null);
		setStaggerKey(k => k + 1);
		setCurrentPage(page);
	}, []);

	return (
		<div className="h-full w-full flex flex-col overflow-hidden">
			{header && (
				<div className="shrink-0 px-4 pt-4 pb-1 md:px-8 md:pt-5 md:pb-2">
					{header}
				</div>
			)}
			<div className="flex-1 flex justify-center items-center overflow-hidden px-3 md:px-6">
				<div className="w-[92%] h-[92%] relative">
					<LayoutGroup>
						<div
							className="grid gap-x-3 gap-y-3 h-full"
							style={{
								gridTemplateColumns: `repeat(${cols}, 1fr)`,
								gridTemplateRows: `repeat(${rows}, 1fr)`
							}}
						>
							<AnimatePresence mode="popLayout">
								{currentItems.map((item, index) => (
									<GridCard
										key={`${staggerKey}-${item.id}`}
										item={item}
										isExpanded={expandedId === item.id}
										isHovered={hoveredId === item.id}
										isHiddenByExpansion={isHiddenByExpansion(
											index
										)}
										expandedStyle={getExpandedStyle(
											index,
											expandedId === item.id
										)}
										staggerIndex={index}
										staggerDelay={staggerDelay}
										onCardClick={handleCardClick}
										onHoverStart={handleHoverStart}
										onHoverEnd={handleHoverEnd}
										onLaunch={onLaunchItem}
										onToggleSave={onToggleSaveItem}
										isSaved={
											isItemSaved
												? isItemSaved(item)
												: false
										}
									/>
								))}
							</AnimatePresence>
						</div>
					</LayoutGroup>
				</div>
			</div>

			<Pagination
				currentPage={safePage}
				totalPages={totalPages}
				onPrevPage={handlePrevPage}
				onNextPage={handleNextPage}
				onPageSelect={handlePageSelect}
			/>
		</div>
	);
};
