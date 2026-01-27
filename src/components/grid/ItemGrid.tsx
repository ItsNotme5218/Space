import { useState, useCallback } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { GridCard } from './GridCard';
import { Pagination } from './Pagination';
import type { GridItem, GridConfig } from './types';
import { DEFAULT_GRID_CONFIG } from './types';

interface ItemGridProps {
	items: GridItem[];
	config?: Partial<GridConfig>;
}

export const ItemGrid = ({ items, config }: ItemGridProps) => {
	const { cols, rows, staggerDelay } = { ...DEFAULT_GRID_CONFIG, ...config };
	const itemsPerPage = cols * rows;

	const [currentPage, setCurrentPage] = useState(0);
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [hoveredId, setHoveredId] = useState<number | null>(null);
	const [staggerKey, setStaggerKey] = useState(0);

	const totalPages = Math.ceil(items.length / itemsPerPage);
	const currentItems = items.slice(
		currentPage * itemsPerPage,
		(currentPage + 1) * itemsPerPage
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

	const handleCardClick = useCallback((id: number) => {
		setExpandedId(prev => (prev === id ? null : id));
	}, []);

	const handleHoverStart = useCallback((id: number) => {
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
		<div className="h-full w-full flex flex-col p-4 overflow-hidden">
			<div className="flex-1 flex justify-center items-center">
				<div className="w-[75%] h-[90%] ml-[5%] relative">
					<LayoutGroup>
						<div
							className="grid gap-3 h-full"
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
									/>
								))}
							</AnimatePresence>
						</div>
					</LayoutGroup>
				</div>
			</div>

			<Pagination
				currentPage={currentPage}
				totalPages={totalPages}
				onPrevPage={handlePrevPage}
				onNextPage={handleNextPage}
				onPageSelect={handlePageSelect}
			/>
		</div>
	);
};
