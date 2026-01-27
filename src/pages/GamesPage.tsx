import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Game {
	id: number;
	title: string;
}

const generateMockGames = (count: number): Game[] =>
	Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		title: `Game ${i + 1}`
	}));

const COLS = 4;
const ROWS = 5;
const ITEMS_PER_PAGE = COLS * ROWS;
const staggerDelay = 0.1;

export const GamesPage = () => {
	const [currentPage, setCurrentPage] = useState(0);
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [hoveredId, setHoveredId] = useState<number | null>(null);
	const [animationKey, setAnimationKey] = useState(0);

	const allGames = useMemo(() => generateMockGames(80), []);
	const totalPages = Math.ceil(allGames.length / ITEMS_PER_PAGE);
	const currentGames = allGames.slice(
		currentPage * ITEMS_PER_PAGE,
		(currentPage + 1) * ITEMS_PER_PAGE
	);

	const getExpandDirection = (index: number) => {
		const col = index % COLS;
		const row = Math.floor(index / COLS);
		const expandRight = col < COLS - 1;
		const expandDown = row < ROWS - 1;
		return { expandRight, expandDown };
	};

	const handleCardClick = (gameId: number) => {
		setExpandedId(expandedId === gameId ? null : gameId);
	};

	const handleNextPage = () => {
		if (currentPage < totalPages - 1) {
			setExpandedId(null);
			setCurrentPage(currentPage + 1);
			setAnimationKey(prev => prev + 1);
		}
	};

	const handlePrevPage = () => {
		if (currentPage > 0) {
			setExpandedId(null);
			setCurrentPage(currentPage - 1);
			setAnimationKey(prev => prev + 1);
		}
	};

	return (
		<div className="h-full w-full flex flex-col p-4 overflow-hidden">
			<div className="flex-1 flex justify-center items-center">
				<div className="w-[75%] h-[90%] ml-[5%] relative">
					<div
						className="grid gap-3 h-full"
						style={{
							gridTemplateColumns: `repeat(${COLS}, 1fr)`,
							gridTemplateRows: `repeat(${ROWS}, 1fr)`
						}}
					>
						{currentGames.map((game, index) => {
							const isExpanded = expandedId === game.id;
							const isHovered = hoveredId === game.id;
							const { expandRight, expandDown } =
								getExpandDirection(index);
							const col = index % COLS;
							const row = Math.floor(index / COLS);

							const expandedStyle = isExpanded
								? {
										gridColumn: expandRight
											? `${col + 1} / span 2`
											: `${col} / span 2`,
										gridRow: expandDown
											? `${row + 1} / span 2`
											: `${row} / span 2`,
										zIndex: 50
									}
								: {
										gridColumn: `${col + 1} / span 1`,
										gridRow: `${row + 1} / span 1`,
										zIndex: 1
									};

							const isHiddenByExpansion =
								expandedId !== null &&
								!isExpanded &&
								(() => {
									const expandedIndex =
										currentGames.findIndex(
											g => g.id === expandedId
										);
									if (expandedIndex === -1) return false;
									const expCol = expandedIndex % COLS;
									const expRow = Math.floor(
										expandedIndex / COLS
									);
									const {
										expandRight: expR,
										expandDown: expD
									} = getExpandDirection(expandedIndex);

									const expColStart = expR
										? expCol
										: expCol - 1;
									const expColEnd = expColStart + 1;
									const expRowStart = expD
										? expRow
										: expRow - 1;
									const expRowEnd = expRowStart + 1;

									return (
										col >= expColStart &&
										col <= expColEnd &&
										row >= expRowStart &&
										row <= expRowEnd
									);
								})();

							return (
								<motion.div
									key={`${animationKey}-${game.id}`}
									layout
									onClick={() => handleCardClick(game.id)}
									onMouseEnter={() => setHoveredId(game.id)}
									onMouseLeave={() => setHoveredId(null)}
									initial={{ opacity: 0, scale: 0.8, y: 20 }}
									animate={{
										opacity: isHiddenByExpansion ? 0 : 1,
										scale: isHiddenByExpansion ? 0.8 : 1,
										y: isHovered && !isExpanded ? -8 : 0
									}}
									transition={{
										layout: {
											type: 'spring',
											stiffness: 300,
											damping: 30
										},
										opacity: {
											duration: 0.3,
											delay: index * staggerDelay
										},
										scale: {
											duration: 0.3,
											delay: index * staggerDelay
										},
										y: {
											type: 'spring',
											stiffness: 400,
											damping: 25
										}
									}}
									className="relative rounded-2xl overflow-hidden cursor-pointer"
									style={{
										...expandedStyle,
										background: isExpanded
											? 'transparent'
											: 'rgba(20, 10, 30, 0.8)',
										border: isExpanded
											? 'none'
											: '1px solid rgba(139, 92, 246, 0.3)',
										pointerEvents: isHiddenByExpansion
											? 'none'
											: 'auto'
									}}
								>
									{isExpanded ? (
										<motion.div
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: 0.3 }}
											className="absolute inset-0 flex gap-3"
										>
											<div className="flex flex-col gap-3 w-1/2">
												{/* image */}
												<motion.div
													initial={{
														opacity: 0,
														scale: 0.8
													}}
													animate={{
														opacity: 1,
														scale: 1
													}}
													transition={{ delay: 0.35 }}
													className="flex-[1.2] rounded-2xl"
													style={{
														background:
															'rgba(20, 10, 30, 0.8)',
														border: '1px solid rgba(139, 92, 246, 0.3)'
													}}
												/>
												{/* stats */}
												<motion.div
													initial={{
														opacity: 0,
														scale: 0.8
													}}
													animate={{
														opacity: 1,
														scale: 1
													}}
													transition={{ delay: 0.45 }}
													className="flex-1 rounded-2xl p-3 grid grid-cols-2 grid-rows-2 gap-2"
													style={{
														background:
															'rgba(20, 10, 30, 0.8)',
														border: '1px solid rgba(139, 92, 246, 0.3)'
													}}
												>
													{[0, 1, 2, 3].map(
														(
															i // array should be changed to a stat json
														) => (
															<div
																key={i}
																className="flex items-center gap-2"
															>
																<span className="text-white/60 text-sm">
																	stat
																</span>
															</div>
														)
													)}
												</motion.div>
											</div>
											<div className="flex flex-col gap-3 w-1/2">
												{/* title */}
												<motion.div
													initial={{
														opacity: 0,
														scale: 0.8
													}}
													animate={{
														opacity: 1,
														scale: 1
													}}
													transition={{ delay: 0.4 }}
													className="h-16 rounded-2xl flex items-center justify-center px-4"
													style={{
														background:
															'rgba(20, 10, 30, 0.8)',
														border: '1px solid rgba(139, 92, 246, 0.3)'
													}}
												>
													<div
														className="h-5 w-3/4 rounded-md"
														style={{
															background:
																'rgba(255, 255, 255, 0.2)'
														}}
													/>
												</motion.div>
												{/* description */}
												<motion.div
													initial={{
														opacity: 0,
														scale: 0.8
													}}
													animate={{
														opacity: 1,
														scale: 1
													}}
													transition={{ delay: 0.5 }}
													className="flex-1 rounded-2xl flex items-center justify-center p-4"
													style={{
														background:
															'rgba(20, 10, 30, 0.8)',
														border: '1px solid rgba(139, 92, 246, 0.3)'
													}}
												>
													<div
														className="h-3 w-full rounded-md"
														style={{
															background:
																'rgba(255, 255, 255, 0.1)'
														}}
													/>
												</motion.div>
												{/* play */}
												<motion.div
													initial={{
														opacity: 0,
														scale: 0.8
													}}
													animate={{
														opacity: 1,
														scale: 1
													}}
													transition={{ delay: 0.55 }}
													className="h-14 rounded-2xl flex items-center justify-center"
													style={{
														background:
															'rgba(139, 92, 246, 0.3)',
														border: '1px solid rgba(139, 92, 246, 0.5)'
													}}
												>
													<div
														className="h-4 w-24 rounded-md"
														style={{
															background:
																'rgba(255, 255, 255, 0.3)'
														}}
													/>
												</motion.div>
											</div>
										</motion.div>
									) : (
										<motion.div
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="absolute inset-0 flex flex-col"
										>
											<div className="flex-1" />
											<motion.div
												initial={{
													height: 0,
													opacity: 0
												}}
												animate={{
													height: isHovered ? 32 : 0,
													opacity: isHovered ? 1 : 0
												}}
												transition={{ duration: 0.2 }}
												className="px-3 flex items-center"
												style={{
													background:
														'rgba(20, 10, 30, 0.95)'
												}}
											>
												<div
													className="h-3 w-16 rounded-sm"
													style={{
														background:
															'rgba(255, 255, 255, 0.3)'
													}}
												/>
											</motion.div>
										</motion.div>
									)}
								</motion.div>
							);
						})}
					</div>
				</div>
			</div>

			<div className="flex items-center justify-center gap-4 py-6 mb-4! -mt-4!">
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
					onClick={handlePrevPage}
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
							onClick={() => {
								setExpandedId(null);
								setCurrentPage(i);
							}}
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
					onClick={handleNextPage}
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
		</div>
	);
};
