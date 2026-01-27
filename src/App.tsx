import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import './App.css';

const sessionUrls = [
	'https://example.com',
	'https://www.wikipedia.org'
];

const App = () => {
	const [activeItem, setActiveItem] = useState('home');
	const [topBarHovered, setTopBarHovered] = useState(false);
	const [sidebarHovered, setSidebarHovered] = useState(false);
	const [activeSession, setActiveSession] = useState(1);
	const [direction, setDirection] = useState(0);

	const handleSessionChange = (session: number) => {
		setDirection(session > activeSession ? 1 : -1);
		setActiveSession(session);
	};

	const slideVariants = {
		enter: (dir: number) => ({
			x: dir > 0 ? '100%' : '-100%',
			scale: 0.92,
			opacity: 0,
			rotateY: dir > 0 ? 15 : -15
		}),
		center: {
			x: 0,
			scale: 1,
			opacity: 1,
			rotateY: 0
		},
		exit: (dir: number) => ({
			x: dir < 0 ? '100%' : '-100%',
			scale: 0.92,
			opacity: 0,
			rotateY: dir < 0 ? 15 : -15
		})
	};

	return (
		<div className="h-screen bg-[#101010] flex flex-col overflow-hidden" style={{ perspective: '1200px' }}>
			<motion.div
				animate={{ height: topBarHovered ? 40 : 0 }}
				transition={{ type: 'spring', stiffness: 300, damping: 30 }}
				className="shrink-0"
			/>
			<div className="flex-1 flex overflow-hidden">
				<motion.div
					animate={{ width: sidebarHovered ? 72 : 0 }}
					transition={{ type: 'spring', stiffness: 300, damping: 30 }}
					className="shrink-0"
				/>
				<main className="flex-1 p-2 relative" style={{ transformStyle: 'preserve-3d' }}>
					<AnimatePresence initial={false} custom={direction} mode="popLayout">
						<motion.div
							key={activeSession}
							custom={direction}
							variants={slideVariants}
							initial="enter"
							animate="center"
							exit="exit"
							transition={{
								x: { type: 'spring', stiffness: 300, damping: 30 },
								opacity: { duration: 0.25 },
								scale: { duration: 0.35 },
								rotateY: { duration: 0.35 }
							}}
							className="absolute inset-2"
							style={{ transformStyle: 'preserve-3d' }}
						>
							<iframe
								src={sessionUrls[activeSession - 1]}
								className="w-full h-full rounded-2xl border border-[#2d2d3a]/50"
								style={{ background: '#1a1a1a' }}
							/>
						</motion.div>
					</AnimatePresence>
				</main>
			</div>
			<Sidebar
				activeItem={activeItem}
				onItemClick={setActiveItem}
				onHoverChange={setSidebarHovered}
				activeSession={activeSession}
				onSessionChange={handleSessionChange}
			/>
			<TopBar onHoverChange={setTopBarHovered} />
		</div>
	);
};

export default App;
