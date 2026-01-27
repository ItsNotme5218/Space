import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

interface SessionsProps {
	activeSession: number;
	onSessionChange: (session: number) => void;
	hovered: boolean;
}

const sessions = [
	{ id: 1, label: '1' },
	{ id: 2, label: '2' }
];

export const Sessions = ({ activeSession, onSessionChange, hovered }: SessionsProps) => {
	return (
		<motion.div
			initial={{ y: 100, opacity: 0 }}
			animate={{ y: hovered ? 0 : 100, opacity: hovered ? 1 : 0 }}
			transition={{ type: 'spring', stiffness: 300, damping: 30 }}
			className="flex flex-col items-center gap-2"
		>
			<div
				className="rounded-[1.25rem] border border-[#1B1B1B] flex flex-col items-center gap-2 p-2"
				style={{
					background: 'rgba(14, 14, 16, 0.65)',
					boxShadow: '0 0 4px 1px rgba(255, 255, 255, 0.05), 0 0 10px 1px #1B1B1B inset',
					backdropFilter: 'blur(3px)'
				}}
			>
				{sessions.map(session => {
					const isActive = activeSession === session.id;
					return (
						<motion.button
							key={session.id}
							onClick={() => onSessionChange(session.id)}
							whileHover={{ scale: 1.08 }}
							whileTap={{ scale: 0.92 }}
							className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
							style={{
								background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'rgba(26, 26, 26, 0.8)',
								border: isActive ? '1px solid rgba(203, 166, 247, 0.4)' : '1px solid rgba(45, 45, 58, 0.5)',
								boxShadow: isActive
									? '0 0 12px 2px rgba(139, 92, 246, 0.3), inset 0 0 8px rgba(203, 166, 247, 0.2)'
									: 'inset 0 1px 1px rgba(255,255,255,0.03)'
							}}
						>
							<AnimatePresence mode="wait">
								<motion.span
									key={isActive ? 'active' : 'inactive'}
									initial={{ scale: 0.5, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0.5, opacity: 0 }}
									transition={{ type: 'spring', stiffness: 500, damping: 30 }}
									className={`text-sm font-medium ${isActive ? 'text-violet-300' : 'text-zinc-500'}`}
								>
									{session.label}
								</motion.span>
							</AnimatePresence>
							{isActive && (
								<motion.div
									layoutId="session-indicator"
									className="absolute inset-0 rounded-xl"
									style={{
										background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(203, 166, 247, 0.05) 100%)',
										border: '1px solid rgba(203, 166, 247, 0.3)'
									}}
									transition={{ type: 'spring', stiffness: 400, damping: 30 }}
								/>
							)}
						</motion.button>
					);
				})}
			</div>

			<motion.button
				whileHover={{ scale: 1.1, rotate: 90 }}
				whileTap={{ scale: 0.9 }}
				transition={{ type: 'spring', stiffness: 400, damping: 20 }}
				className="w-7 h-7 rounded-full flex items-center justify-center"
				style={{
					background: 'rgba(26, 26, 26, 0.9)',
					border: '1px solid rgba(45, 45, 58, 0.6)',
					boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)'
				}}
			>
				<Plus className="w-3.5 h-3.5 text-zinc-500" />
			</motion.button>
		</motion.div>
	);
};
