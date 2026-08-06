import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPrevPage: () => void;
	onNextPage: () => void;
	onPageSelect: (page: number) => void;
}

const windowRadius = 2;

/**
 * Builds a windowed page list: first page, last page, and everything within
 * `windowRadius` of the current one. `null` marks a gap. The library runs to
 * hundreds of pages, so rendering one control per page is not an option.
 */
const buildPageList = (currentPage: number, totalPages: number) => {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, index) => index);
	}

	const pages = new Set<number>([0, totalPages - 1]);

	for (
		let page = currentPage - windowRadius;
		page <= currentPage + windowRadius;
		page++
	) {
		if (page >= 0 && page < totalPages) pages.add(page);
	}

	const sorted = [...pages].sort((a, b) => a - b);
	const withGaps: (number | null)[] = [];

	sorted.forEach((page, index) => {
		if (index > 0 && page - sorted[index - 1] > 1) withGaps.push(null);
		withGaps.push(page);
	});

	return withGaps;
};

export const Pagination = ({
	currentPage,
	totalPages,
	onPrevPage,
	onNextPage,
	onPageSelect
}: PaginationProps) => {
	if (totalPages <= 1) return null;

	const pages = buildPageList(currentPage, totalPages);

	return (
		<div className="flex shrink-0 items-center justify-center gap-2 py-3">
			<button
				onClick={onPrevPage}
				disabled={currentPage === 0}
				className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30"
				style={{
					background: 'var(--color-surface)',
					border: '1px solid var(--color-border)'
				}}
			>
				<ChevronLeft className="h-4 w-4 text-white/80" />
			</button>

			{pages.map((page, index) =>
				page === null ? (
					<span
						key={`gap-${index}`}
						className="px-1 text-xs text-white/30"
					>
						...
					</span>
				) : (
					<button
						key={page}
						onClick={() => onPageSelect(page)}
						className="h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition-colors"
						style={{
							background:
								currentPage === page
									? 'var(--color-primary)'
									: 'var(--color-surface)',
							border: `1px solid ${
								currentPage === page
									? 'var(--color-primary)'
									: 'var(--color-border)'
							}`,
							color:
								currentPage === page
									? '#ffffff'
									: 'rgba(255,255,255,0.6)'
						}}
					>
						{page + 1}
					</button>
				)
			)}

			<button
				onClick={onNextPage}
				disabled={currentPage === totalPages - 1}
				className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30"
				style={{
					background: 'var(--color-surface)',
					border: '1px solid var(--color-border)'
				}}
			>
				<ChevronRight className="h-4 w-4 text-white/80" />
			</button>
		</div>
	);
};
