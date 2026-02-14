import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PageTransition } from './components/PageTransition';
import { NewTab } from './components/NewTab';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import './App.css';

export interface Session {
	id: number;
	url: string;
}

const App = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const activeItem = location.pathname.replace('/', '') || 'home';
	const [topBarHovered, setTopBarHovered] = useState(false);
	const [sidebarHovered, setSidebarHovered] = useState(false);
	const [introComplete, setIntroComplete] = useState(false);

	const handleNavClick = (id: string) => {
		navigate(id === 'home' ? '/' : `/${id}`);
	};

	const handleIntroComplete = useCallback(() => {
		setIntroComplete(true);
	}, []);

	const isSpecialPage =
		activeItem === 'games' ||
		activeItem === 'apps' ||
		activeItem === 'settings';
	
	const isHome = activeItem === 'home';

	const renderMainContent = () => {
		const isPage = isSpecialPage;

		return (
			<>
				<motion.div
					className="absolute inset-0"
					animate={{
						opacity: isPage ? 0 : 1,
						scale: isPage ? 0.96 : 1,
						filter: isPage
							? 'blur(8px) brightness(0.6)'
							: 'blur(0px) brightness(1)'
					}}
					transition={{
						scale: {
							type: 'spring',
							stiffness: 380,
							damping: 32,
							mass: 0.85
						},
						opacity: { duration: 0.25, ease: 'easeOut' },
						filter: { duration: 0.3, ease: 'easeOut' }
					}}
					style={{
						pointerEvents: isPage ? 'none' : 'auto'
					}}
				>
					{isHome && (
						<NewTab onIntroComplete={handleIntroComplete} />
					)}
					{!isHome && !isPage && <Outlet />}
				</motion.div>

				<AnimatePresence mode="wait">
					{isPage && (
						<PageTransition key={location.pathname}>
							<Outlet />
						</PageTransition>
					)}
				</AnimatePresence>
			</>
		);
	};

	return (
		<div
			className="h-screen bg-[#000000] flex flex-col overflow-hidden"
			style={{ perspective: '1200px' }}
		>
			<AnimatePresence>
				{introComplete && !isSpecialPage && (
					<motion.div
						initial={{ height: 0 }}
						animate={{ height: topBarHovered ? 40 : 0 }}
						exit={{ height: 0 }}
						transition={{
							type: 'spring',
							stiffness: 300,
							damping: 30
						}}
						className="shrink-0"
					/>
				)}
			</AnimatePresence>

			<div className="flex-1 flex overflow-hidden">
				<AnimatePresence>
					{introComplete && (
						<motion.div
							initial={{ width: 0 }}
							animate={{
								width: isSpecialPage
									? 72
									: sidebarHovered
										? 72
										: 0
							}}
							exit={{ width: 0 }}
							transition={{
								type: 'spring',
								stiffness: 300,
								damping: 30
							}}
							className="shrink-0"
						/>
					)}
				</AnimatePresence>

				<main
					className="flex-1 relative"
					style={{ transformStyle: 'preserve-3d' }}
				>
					{renderMainContent()}
				</main>
			</div>

			<AnimatePresence>
				{introComplete && (
					<motion.div
						initial={{ opacity: 0, x: -80 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{
							type: 'spring',
							stiffness: 300,
							damping: 30,
							delay: 0.1
						}}
					>
						<Sidebar
							activeItem={activeItem}
							onItemClick={handleNavClick}
							onHoverChange={setSidebarHovered}
							sessions={[]}
							activeSession={0}
							onSessionChange={() => {}}
							onAddSession={() => {}}
							onCloseSession={() => {}}
							alwaysVisible={isSpecialPage}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{introComplete && !isSpecialPage && (
					<motion.div
						initial={{ opacity: 0, y: -40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							type: 'spring',
							stiffness: 300,
							damping: 30,
							delay: 0.2
						}}
					>
						<TopBar onHoverChange={setTopBarHovered} />
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default App;
