import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';

interface SessionsProps {
	activeSession: number;
	onSessionChange: (session: number) => void;
}

const sessions = [
	{ id: 1, label: '1' },
	{ id: 2, label: '2' },
	{ id: 3, label: '3' }
];

export const Sessions = ({ activeSession, onSessionChange }: SessionsProps) => {
	const [hoveredSession, setHoveredSession] = useState<number | null>(null);

	const handleSessionClick = (session: { id: number }) => {
		if (activeSession === session.id && hoveredSession === session.id) {
			console.log('Close session', session.id);
		} else {
			onSessionChange(session.id);
		}
	};

	return (
		<div className="flex flex-col items-center gap-2 mt-2!">
			<div className="flex flex-col items-center p-2">
				{sessions.map(session => {
					const isActive = activeSession === session.id;
					const isHovered = hoveredSession === session.id;
					const showClose = isActive && isHovered;

					return (
						<motion.button
							key={session.id}
							onClick={() => handleSessionClick(session)}
							onMouseEnter={() => setHoveredSession(session.id)}
							onMouseLeave={() => setHoveredSession(null)}
							whileHover={{ scale: 1.08 }}
							whileTap={{ scale: 0.92 }}
							className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden mb-2!"
							style={{
								background: isActive
									? 'rgba(139, 92, 246, 0.15)'
									: 'rgba(26, 26, 26, 0.8)',
								border: isActive
									? '1px solid rgba(203, 166, 247, 0.4)'
									: '1px solid rgba(45, 45, 58, 0.5)',
								boxShadow: isActive
									? '0 0 12px 2px rgba(139, 92, 246, 0.3), inset 0 0 8px rgba(203, 166, 247, 0.2)'
									: 'inset 0 1px 1px rgba(255,255,255,0.03)'
							}}
						>
							<AnimatePresence mode="wait">
								{showClose ? (
									<motion.div
										key="close"
										initial={{
											scale: 0.5,
											opacity: 0,
											rotate: -90
										}}
										animate={{
											scale: 1,
											opacity: 1,
											rotate: 0
										}}
										exit={{
											scale: 0.5,
											opacity: 0,
											rotate: 90
										}}
										transition={{
											type: 'spring',
											stiffness: 750,
											damping: 30
										}}
									>
										<X className="w-4 h-4 text-violet-300" />
									</motion.div>
								) : (
									<motion.span
										key={`label-${session.id}`}
										initial={{ scale: 0.5, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										exit={{ scale: 0.5, opacity: 0 }}
										transition={{
											type: 'spring',
											stiffness: 750,
											damping: 30
										}}
										className={`text-sm font-medium ${isActive ? 'text-violet-300' : 'text-zinc-500'}`}
									>
										{session.label}
									</motion.span>
								)}
							</AnimatePresence>
							{isActive && (
								<motion.div
									layoutId="session-indicator"
									className="absolute inset-0 rounded-xl pointer-events-none"
									style={{
										background:
											'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(203, 166, 247, 0.05) 100%)',
										border: '1px solid rgba(203, 166, 247, 0.3)'
									}}
									transition={{
										type: 'spring',
										stiffness: 500,
										damping: 15
									}}
								/>
							)}
						</motion.button>
					);
				})}
			</div>

			<motion.button
				whileHover={{ scale: 1.1, rotate: 90 }}
				whileTap={{ scale: 0.9 }}
				transition={{ type: 'spring', stiffness: 200, damping: 10 }}
				className="w-7 h-7 rounded-full flex items-center justify-center"
				style={{
					background: 'rgba(26, 26, 26, 0.9)',
					border: '1px solid rgba(45, 45, 58, 0.6)',
					boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)'
				}}
			>
				<Plus className="w-3.5 h-3.5 text-zinc-500" />
			</motion.button>
		</div>
	);
};
