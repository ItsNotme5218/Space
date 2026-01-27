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

export const GridCard = memo(({
	item,
	isExpanded,
	isHovered,
	isHiddenByExpansion,
	expandedStyle,
	initialDelay,
	onCardClick,
	onHoverStart,
	onHoverEnd
}: GridCardProps) => {
	       return (
		       <div
			       className="relative w-full h-full"
			       style={{ perspective: '1000px' }}
		       >
			       <motion.div
				       layoutId={`card-${item.id}`}
				       onClick={() => onCardClick(item.id)}
				       onMouseEnter={() => onHoverStart(item.id)}
				       onMouseLeave={onHoverEnd}
				       initial={{ opacity: 0, scale: 0.8, y: 20 }}
				       animate={{
					       opacity: isHiddenByExpansion ? 0 : 1,
					       scale: isHiddenByExpansion ? 0.8 : 1,
					       y: isHovered && !isExpanded ? -16 : 0,
					       rotateX: isHovered && !isExpanded ? -12 : 0
				       }}
				       transition={{
					       layout: { type: 'spring', stiffness: 400, damping: 35 },
					       opacity: { duration: 0.25, delay: initialDelay / 1000 },
					       scale: { duration: 0.25, delay: initialDelay / 1000 },
					       y: { type: 'spring', stiffness: 500, damping: 30 },
					       rotateX: { type: 'spring', stiffness: 400, damping: 25 }
				       }}
				       className="relative rounded-2xl overflow-visible cursor-pointer w-full h-full flex flex-col items-center"
				       style={{
					       ...expandedStyle,
					       background: isExpanded ? 'transparent' : 'rgba(20, 10, 30, 0.8)',
					       border: isExpanded ? 'none' : '1px solid rgba(139, 92, 246, 0.3)',
					       pointerEvents: isHiddenByExpansion ? 'none' : 'auto',
					       transformStyle: 'preserve-3d',
					       transformOrigin: 'center bottom',
					       zIndex: isHovered ? 10 : 1
				       }}
			       >
				       {isExpanded ? <ExpandedMosaic /> : null}
				       {!isExpanded && <CollapsedCard isHovered={isHovered} itemName={item.title} />}
			       </motion.div>
		       </div>
	       );
});
