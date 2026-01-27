import { memo } from 'react';
import { motion } from 'framer-motion';
import { ExpandedMosaic } from './ExpandedMosaic';
import { CollapsedCard } from './CollapsedCard';
import type { GridItem } from './types';

interface GridCardProps {
	item: GridItem;
	isExpanded: boolean;
	isHovered: boolean;
	isHiddenByExpansion: boolean;
	expandedStyle: React.CSSProperties;
	initialDelay: number;
	onCardClick: (id: number) => void;
	onHoverStart: (id: number) => void;
	onHoverEnd: () => void;
}

export const GridCard = memo(function GridCard({
	item,
	isExpanded,
	isHovered,
	isHiddenByExpansion,
	expandedStyle,
	initialDelay,
	onCardClick,
	onHoverStart,
	onHoverEnd
}: GridCardProps) {
	return (
		<motion.div
			layoutId={`card-${item.id}`}
			onClick={() => onCardClick(item.id)}
			onMouseEnter={() => onHoverStart(item.id)}
			onMouseLeave={onHoverEnd}
			initial={{ opacity: 0, scale: 0.8, y: 20 }}
			animate={{
				opacity: isHiddenByExpansion ? 0 : 1,
				scale: isHiddenByExpansion ? 0.8 : 1,
				y: isHovered && !isExpanded ? -8 : 0
			}}
			transition={{
				layout: { type: 'spring', stiffness: 400, damping: 35 },
				opacity: { duration: 0.25 },
				scale: { duration: 0.25 },
				y: { type: 'spring', stiffness: 500, damping: 30 }
			}}
			className="relative rounded-2xl overflow-hidden cursor-pointer"
			style={{
				...expandedStyle,
				background: isExpanded ? 'transparent' : 'rgba(20, 10, 30, 0.8)',
				border: isExpanded ? 'none' : '1px solid rgba(139, 92, 246, 0.3)',
				pointerEvents: isHiddenByExpansion ? 'none' : 'auto',
				animationDelay: `${initialDelay}ms`
			}}
		>
			{isExpanded ? <ExpandedMosaic /> : <CollapsedCard isHovered={isHovered} />}
		</motion.div>
	);
});
