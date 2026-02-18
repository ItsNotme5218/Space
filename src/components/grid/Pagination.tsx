import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPrevPage: () => void;
	onNextPage: () => void;
	onPageSelect: (page: number) => void;
}

export const Pagination = ({
	currentPage,
	totalPages,
	onPrevPage,
	onNextPage,
	onPageSelect
}: PaginationProps) => {
	return (
		<div className="flex items-center justify-center gap-4 py-4 mb-2">
			<motion.button
				whileHover={{ scale: 1.1 }}
				whileTap={{ scale: 0.9 }}
				onClick={onPrevPage}
				disabled={currentPage === 0}
				className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				style={{
					background: 'rgba(139, 92, 246, 0.2)',
					border: '1px solid rgba(139, 92, 246, 0.4)'
				}}
			>
				<ChevronLeft className="w-5 h-5 text-white" />
			</motion.button>

			<div className="flex items-center gap-2">
				{Array.from({ length: totalPages }, (_, i) => (
					<motion.button
						key={i}
						whileHover={{ scale: 1.2 }}
						whileTap={{ scale: 0.9 }}
						onClick={() => onPageSelect(i)}
						className="w-2.5 h-2.5 rounded-full transition-all"
						style={{
							background:
								currentPage === i
									? 'rgba(139, 92, 246, 1)'
									: 'rgba(139, 92, 246, 0.3)',
							boxShadow:
								currentPage === i
									? '0 0 8px 2px rgba(139, 92, 246, 0.5)'
									: 'none'
						}}
					/>
				))}
			</div>

			<motion.button
				whileHover={{ scale: 1.1 }}
				whileTap={{ scale: 0.9 }}
				onClick={onNextPage}
				disabled={currentPage === totalPages - 1}
				className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				style={{
					background: 'rgba(139, 92, 246, 0.2)',
					border: '1px solid rgba(139, 92, 246, 0.4)'
				}}
			>
				<ChevronRight className="w-5 h-5 text-white" />
			</motion.button>
		</div>
	);
};
