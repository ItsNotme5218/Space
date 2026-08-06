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
		const artwork = item.image ?? '';
		const favicon = host
			? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
			: '';
		const thumbnail = artwork || favicon;

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
					initial={{ opacity: 0 }}
					animate={{
						opacity: isHiddenByExpansion ? 0 : 1,
						y: isHovered && !isExpanded ? -20 : 0,
						rotateX: isHovered && !isExpanded ? -14 : 0
					}}
					transition={{
						layout: { type: 'spring', stiffness: 350, damping: 30 },
						opacity: { duration: 0.18, delay },
						y: { type: 'spring', stiffness: 520, damping: 30 },
						rotateX: { type: 'spring', stiffness: 520, damping: 30 }
					}}
					className="relative rounded-2xl overflow-visible cursor-pointer w-full h-full"
					style={{
						background: isExpanded
							? 'transparent'
							: 'var(--color-surface)',
						border: isExpanded
							? 'none'
							: `1px solid ${
									isHovered
										? 'var(--color-primary)'
										: 'var(--color-border)'
								}`,
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
						<div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl pointer-events-none">
							{thumbnail && !iconFailed ? (
								<img
									src={thumbnail}
									alt=""
									referrerPolicy="no-referrer"
									loading="lazy"
									decoding="async"
									onError={() => setIconFailed(true)}
									className={
										artwork
											? 'h-full w-full object-cover'
											: ''
									}
									style={
										artwork
											? undefined
											: {
													width: 34,
													height: 34,
													borderRadius: 9
												}
									}
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
