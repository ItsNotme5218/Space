import { memo, useState } from 'react';
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
	staggerIndex: number;
	staggerDelay: number;
	onCardClick: (id: string) => void;
	onHoverStart: (id: string) => void;
	onHoverEnd: () => void;
	onLaunch?: (item: GridItem) => void;
	onToggleSave?: (item: GridItem) => void;
	isSaved?: boolean;
}

const hostFromUrl = (url?: string): string => {
	if (!url) return '';
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
};

export const GridCard = memo(
	({
		item,
		isExpanded,
		isHovered,
		isHiddenByExpansion,
		expandedStyle,
		staggerIndex,
		staggerDelay,
		onCardClick,
		onHoverStart,
		onHoverEnd,
		onLaunch,
		onToggleSave,
		isSaved = false
	}: GridCardProps) => {
		const [hasAnimated, setHasAnimated] = useState(false);
		const [iconFailed, setIconFailed] = useState(false);
		const delay = hasAnimated ? 0 : staggerIndex * staggerDelay;
		const host = hostFromUrl(item.url);
		const favicon = host
			? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
			: '';

		return (
			<div
				className="relative w-full h-full"
				onMouseEnter={() => onHoverStart(item.id)}
				onMouseLeave={onHoverEnd}
				style={{
					...expandedStyle,
					perspective: '750px',
					zIndex: isHovered ? 10 : expandedStyle?.zIndex || 1
				}}
			>
				<motion.div
					layoutId={`card-${item.id}`}
					onClick={() => onCardClick(item.id)}
					onMouseEnter={() => onHoverStart(item.id)}
					onAnimationComplete={() => setHasAnimated(true)}
					initial={{ opacity: 0, scale: 0.8, y: 20 }}
					animate={{
						opacity: isHiddenByExpansion ? 0 : 1,
						scale: isHiddenByExpansion ? 0.8 : 1,
						y: isHovered && !isExpanded ? -12 : 0,
						rotateX: isHovered && !isExpanded ? -8 : 0,
						boxShadow:
							isHovered && !isExpanded
								? '0 0 25px 5px rgba(139, 92, 246, 0.4), inset 0 0 15px rgba(203, 166, 247, 0.3)'
								: '0 0 0px 0px rgba(139, 92, 246, 0), inset 0 0 0px rgba(203, 166, 247, 0)'
					}}
					transition={{
						layout: { type: 'spring', stiffness: 350, damping: 30 },
						opacity: { duration: 0.25, delay },
						scale: { duration: 0.25, delay },
						y: {
							type: 'spring',
							stiffness: 520,
							damping: 30
						},
						rotateX: {
							type: 'spring',
							stiffness: 520,
							damping: 30
						},
						boxShadow: { duration: 0.4 }
					}}
					className="relative rounded-2xl overflow-visible cursor-pointer w-full h-full"
					style={{
						background: isExpanded
							? 'transparent'
							: 'rgba(20, 10, 30, 0.65)',
						border: isExpanded
							? 'none'
							: '1px solid rgba(203, 166, 247, 0.3)',
						backdropFilter: 'blur(8px)',
						WebkitBackdropFilter: 'blur(8px)',
						pointerEvents: isHiddenByExpansion ? 'none' : 'auto',
						transformStyle: 'preserve-3d',
						transformOrigin: 'center bottom'
					}}
				>
					{isExpanded ? (
						<ExpandedMosaic
							item={item}
							isSaved={isSaved}
							onLaunch={onLaunch}
							onToggleSave={onToggleSave}
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							{favicon && !iconFailed ? (
								<img
									src={favicon}
									alt=""
									referrerPolicy="no-referrer"
									loading="lazy"
									onError={() => setIconFailed(true)}
									style={{
										width: 34,
										height: 34,
										borderRadius: 9
									}}
								/>
							) : item.url ? (
								<span className="text-xl font-semibold text-white/70">
									{(item.title || '?')
										.trim()
										.charAt(0)
										.toUpperCase()}
								</span>
							) : null}
						</div>
					)}
				</motion.div>
				{!isExpanded && (
					<CollapsedCard
						isHovered={isHovered}
						itemName={item.title}
					/>
				)}
			</div>
		);
	}
);
