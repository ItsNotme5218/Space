import { useState } from 'react';
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

const panelStyle = {
	background: 'var(--color-surface)',
	border: '1px solid var(--color-border)'
};

export const ExpandedMosaic = ({
	item,
	isSaved = false,
	onLaunch,
	onToggleSave
}: ExpandedMosaicProps) => {
	const [artFailed, setArtFailed] = useState(false);
	const host = hostFromUrl(item?.url);
	const initial = (item?.title || '?').trim().charAt(0).toUpperCase() || '?';
	const artwork = item?.image || (host ? faviconFor(host) : '');
	const isPoster = Boolean(item?.image);
	const categories = (item?.categories ?? []).slice(0, 4);

	const handleLaunch = (event: React.MouseEvent) => {
		event.stopPropagation();
		if (item && onLaunch) onLaunch(item);
	};

	const handleToggleSave = (event: React.MouseEvent) => {
		event.stopPropagation();
		if (item && onToggleSave) onToggleSave(item);
	};

	return (
		<div className="absolute inset-0 flex gap-2">
			<div
				className="flex w-1/2 items-center justify-center overflow-hidden rounded-2xl"
				style={panelStyle}
			>
				{artwork && !artFailed ? (
					<img
						src={artwork}
						alt=""
						referrerPolicy="no-referrer"
						decoding="async"
						onError={() => setArtFailed(true)}
						className={isPoster ? 'h-full w-full object-cover' : ''}
						style={
							isPoster
								? undefined
								: { width: 44, height: 44, borderRadius: 12 }
						}
					/>
				) : (
					<span className="text-3xl font-bold text-white/70">
						{initial}
					</span>
				)}
			</div>

			<div className="flex w-1/2 flex-col gap-2">
				<div
					className="flex h-12 items-center justify-center rounded-2xl px-3"
					style={panelStyle}
				>
					<span className="w-full truncate text-center text-base font-semibold text-white/90">
						{item?.title ?? 'Game'}
					</span>
				</div>

				<div
					className="flex flex-1 flex-col justify-center gap-1.5 rounded-2xl px-3 py-2"
					style={panelStyle}
				>
					<span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
						Categories
					</span>
					<div className="flex flex-wrap gap-1">
						{categories.length > 0 ? (
							categories.map(category => (
								<span
									key={`${item?.id}-${category}`}
									className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white/70"
									style={{
										background: 'var(--color-surface-light)'
									}}
								>
									{category}
								</span>
							))
						) : (
							<span className="text-[11px] text-white/40">
								Uncategorized
							</span>
						)}
					</div>
				</div>

				<div className="flex gap-2">
					<button
						onClick={handleLaunch}
						className="flex h-11 grow items-center justify-center rounded-2xl font-medium text-white transition-colors"
						style={{
							background: 'var(--color-primary)',
							border: '1px solid var(--color-primary)'
						}}
					>
						Play
					</button>
					<button
						onClick={handleToggleSave}
						className="flex h-11 w-11 items-center justify-center rounded-2xl text-white/70 transition-colors hover:text-white"
						title={isSaved ? 'Remove from saved' : 'Save game'}
						style={{
							background: isSaved
								? 'var(--color-primary)'
								: 'var(--color-surface)',
							border: `1px solid ${
								isSaved
									? 'var(--color-primary)'
									: 'var(--color-border)'
							}`
						}}
					>
						<Star
							className="h-5 w-5"
							style={{ fill: isSaved ? 'currentColor' : 'none' }}
						/>
					</button>
				</div>
			</div>
		</div>
	);
};
