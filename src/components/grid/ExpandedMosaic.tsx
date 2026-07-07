import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { GridItem } from './types';

interface ExpandedMosaicProps {
	item?: GridItem;
	isSaved?: boolean;
	onLaunch?: (item: GridItem) => void;
	onToggleSave?: (item: GridItem) => void;
}

const hostFromUrl = (url?: string): string => {
	if (!url) return '';
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
};

const faviconFor = (host: string): string =>
	`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;

const confidenceStyle = (confidence?: number) => {
	if (confidence === undefined || confidence === null) {
		return { label: 'N/A', color: 'rgba(255,255,255,0.4)', fraction: 0 };
	}
	const color =
		confidence >= 85
			? '#34d399'
			: confidence >= 70
				? '#a78bfa'
				: confidence >= 50
					? '#fbbf24'
					: '#f87171';
	return { label: `${confidence}%`, color, fraction: confidence / 100 };
};

export const ExpandedMosaic = ({
	item,
	isSaved = false,
	onLaunch,
	onToggleSave
}: ExpandedMosaicProps) => {
	const [iconFailed, setIconFailed] = useState(false);
	const host = hostFromUrl(item?.url);
	const initial = (item?.title || '?').trim().charAt(0).toUpperCase() || '?';
	const conf = confidenceStyle(item?.confidence);
	const description =
		item?.description || item?.subtitle || 'A site from your library.';

	const handleLaunch = (event: React.MouseEvent) => {
		event.stopPropagation();
		if (item && onLaunch) onLaunch(item);
	};

	const handleToggleSave = (event: React.MouseEvent) => {
		event.stopPropagation();
		if (item && onToggleSave) onToggleSave(item);
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 0.3 }}
			className="absolute inset-0 flex gap-3"
		>
			<div className="flex flex-col gap-3 w-1/2">
				<motion.div
					initial={{ opacity: 0, scale: 0.8, y: 10 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					transition={{
						opacity: { delay: 0.35 },
						scale: { delay: 0.35, type: 'spring' },
						y: { delay: 0.35, type: 'spring' }
					}}
					className="flex-[1.2] rounded-2xl flex items-center justify-center overflow-hidden"
					style={{
						background: 'rgba(20, 10, 30, 0.45)',
						border: '1px solid rgba(203, 166, 247, 0.3)',
						boxShadow: '0 0 20px 2px rgba(139, 92, 246, 0.15)',
						backdropFilter: 'blur(12px)',
						WebkitBackdropFilter: 'blur(12px)'
					}}
				>
					{host && !iconFailed ? (
						<img
							src={faviconFor(host)}
							alt=""
							referrerPolicy="no-referrer"
							onError={() => setIconFailed(true)}
							style={{ width: 48, height: 48, borderRadius: 12 }}
						/>
					) : (
						<span className="text-4xl font-bold text-white/70">
							{initial}
						</span>
					)}
				</motion.div>
				<motion.div
					initial={{ opacity: 0, scale: 0.8, y: 10 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					transition={{
						opacity: { delay: 0.45 },
						scale: { delay: 0.45, type: 'spring' },
						y: { delay: 0.45, type: 'spring' }
					}}
					className="flex-1 rounded-2xl p-4 flex flex-col justify-center gap-2"
					style={{
						background: 'rgba(20, 10, 30, 0.45)',
						boxShadow:
							'0px 0px 12px rgba(139, 92, 246, 0.2), 0px 0px 8px 2px rgba(203, 166, 247, 0.1) inset',
						border: '1px solid rgba(203, 166, 247, 0.3)',
						backdropFilter: 'blur(12px)',
						WebkitBackdropFilter: 'blur(12px)'
					}}
				>
					<span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
						Proxy Support
					</span>
					<span
						className="text-2xl font-bold leading-none"
						style={{ color: conf.color }}
					>
						{conf.label}
					</span>
					<div
						className="h-1.5 w-full overflow-hidden rounded-full"
						style={{ background: 'rgba(255,255,255,0.08)' }}
					>
						<div
							style={{
								width: `${conf.fraction * 100}%`,
								height: '100%',
								background: conf.color
							}}
						/>
					</div>
				</motion.div>
			</div>

			<div className="flex flex-col gap-3 w-1/2">
				<motion.div
					initial={{ opacity: 0, scale: 0.8, x: -10 }}
					animate={{ opacity: 1, scale: 1, x: 0 }}
					transition={{ delay: 0.4, type: 'spring' }}
					className="h-16 rounded-2xl flex items-center justify-center px-4"
					style={{
						background: 'rgba(20, 10, 30, 0.45)',
						boxShadow:
							'0px 0px 12px rgba(139, 92, 246, 0.2), 0px 0px 8px 2px rgba(203, 166, 247, 0.1) inset',
						border: '1px solid rgba(203, 166, 247, 0.3)',
						backdropFilter: 'blur(12px)',
						WebkitBackdropFilter: 'blur(12px)'
					}}
				>
					<span className="w-full truncate text-center text-lg font-semibold text-white/90">
						{item?.title ?? 'App'}
					</span>
				</motion.div>
				<motion.div
					initial={{ opacity: 0, scale: 0.8, x: -10 }}
					animate={{ opacity: 1, scale: 1, x: 0 }}
					transition={{ delay: 0.5, type: 'spring' }}
					className="flex-1 rounded-2xl flex items-start justify-start p-4"
					style={{
						background: 'rgba(20, 10, 30, 0.45)',
						boxShadow:
							'0px 0px 12px rgba(139, 92, 246, 0.2), 0px 0px 8px 2px rgba(203, 166, 247, 0.1) inset',
						border: '1px solid rgba(203, 166, 247, 0.3)',
						backdropFilter: 'blur(12px)',
						WebkitBackdropFilter: 'blur(12px)'
					}}
				>
					<p className="text-white/50 text-sm leading-relaxed">
						{description}
					</p>
				</motion.div>
				<div className="flex gap-2">
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: 10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						whileHover={{
							scale: 1.05,
							boxShadow:
								'0px 0px 15px rgba(203, 166, 247, 0.8), 0px 0px 10px 3px #CBA6F7 inset'
						}}
						whileTap={{ scale: 0.95 }}
						onClick={handleLaunch}
						transition={{
							opacity: { delay: 0.55 },
							scale: { type: 'spring' }
						}}
						className="h-14 rounded-2xl flex items-center justify-center grow cursor-pointer font-medium text-white"
						style={{
							background: 'rgba(203, 166, 247, 0.15)',
							boxShadow:
								'0px 0px 8px rgba(203, 166, 247, 0.40), 0px 0px 8px 2px rgba(203, 166, 247, 0.3) inset',
							border: '1px #CBA6F7 solid',
							backdropFilter: 'blur(12px)',
							WebkitBackdropFilter: 'blur(12px)'
						}}
					>
						Launch
					</motion.div>
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: 10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						whileHover={{
							scale: 1.1,
							rotate: 180,
							boxShadow:
								'0px 0px 15px rgba(139, 92, 246, 0.6), 0px 0px 10px 3px rgba(139, 92, 246, 0.4) inset'
						}}
						whileTap={{ scale: 0.9 }}
						onClick={handleToggleSave}
						transition={{
							opacity: { delay: 0.6 },
							scale: { type: 'spring' },
							rotate: { type: 'spring' }
						}}
						className="h-14 w-14 rounded-2xl flex items-center justify-center cursor-pointer text-violet-300 hover:text-white"
						title={isSaved ? 'Remove from saved' : 'Save app'}
						style={{
							background: isSaved
								? 'rgba(139, 92, 246, 0.35)'
								: 'rgba(20, 10, 30, 0.45)',
							boxShadow:
								'0px 0px 8px rgba(139, 92, 246, 0.3), 0px 0px 8px 2px rgba(139, 92, 246, 0.3) inset',
							border: '1px solid rgba(139, 92, 246, 0.5)',
							backdropFilter: 'blur(12px)',
							WebkitBackdropFilter: 'blur(12px)'
						}}
					>
						<Star
							className="h-6 w-6"
							style={{ fill: isSaved ? 'currentColor' : 'none' }}
						/>
					</motion.div>
				</div>
			</div>
		</motion.div>
	);
};
