import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { NewTab } from './components/NewTab';
import { SpaceStars } from './components/SpaceStars';
import { IntroSplash } from './components/IntroSplash';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLocalStorage } from './hooks/useLocalStorage';

import './App.css';

export interface Session {
	id: number;
	url: string;
}

const App = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const activeItem = location.pathname.replace('/', '') || 'home';
	const [sidebarHovered, setSidebarHovered] = useState(false);
	const [showIntro, setShowIntro] = useState(true);
	const [autoHideSidebar] = useLocalStorage('autoHideSidebar', true);
	const nextIdRef = useRef(2);
	const rawSessions = useRef<Session[]>([
		{ id: 1, url: '' }
	]);
	const [sessions, setSessions] = useState<Session[]>([
		{ id: 1, url: '' }
	]);
	const [activeSession, setActiveSession] = useState(1);

	useEffect(() => {
		rawSessions.current = sessions;
	}, [sessions]);

	const handleNavClick = (id: string) => {
		navigate(id === 'home' ? '/' : `/${id}`);
	};


	const handleAddSession = () => {
		const newId = nextIdRef.current++;
		const entry: Session = { id: newId, url: '' };
		rawSessions.current.push(entry);
		setSessions([...rawSessions.current]);
		setActiveSession(newId);
	};

	const handleCloseSession = (id: number) => {
		const idx = rawSessions.current.findIndex(s => s.id === id);
		if (idx === -1) return;
		rawSessions.current.splice(idx, 1);

		if (rawSessions.current.length === 0) {
			const fallbackId = nextIdRef.current++;
			const fallback: Session = {
				id: fallbackId,
				url: ''
			};
			rawSessions.current.push(fallback);
			setActiveSession(fallbackId);
		} else if (activeSession === id) {
			const newActive =
				rawSessions.current[
					Math.min(idx, rawSessions.current.length - 1)
				];
			setActiveSession(newActive.id);
		}

		setSessions([...rawSessions.current]);
	};

	const isSpecialPage =
		activeItem === 'games' ||
		activeItem === 'apps' ||
		activeItem === 'settings';

	const [switching, setSwitching] = useState(false);
	const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleSessionSwitch = (id: number) => {
		if (id === activeSession) return;
		setSwitching(true);
		setActiveSession(id);
		if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
		switchTimerRef.current = setTimeout(() => setSwitching(false), 500);
	};

	const renderMainContent = () => {
		const isPage = isSpecialPage;
		const activeIndex = sessions.findIndex(x => x.id === activeSession);

		return (
			<>
				<motion.div
					animate={{
						scale: switching ? 0.85 : 1,
						opacity: switching ? 0.7 : 1,
					}}
					transition={{
						type: 'spring',
						stiffness: 170,
						damping: 15,
						mass: 0.4,
					}}
					className="absolute inset-2"
					style={{
						display: isPage ? 'none' : 'block',
						borderRadius: 12,
						transformOrigin: 'center center',
						perspective: 1200
					}}
				>
					<motion.div
						animate={{ x: `${-activeIndex * (100 / sessions.length)}%` }}
						transition={{
							type: 'spring',
							stiffness: 650,
							damping: 75,
						}}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							height: '100%',
							display: 'flex',
							width: `${sessions.length * 100}%`,
						}}
					>
						{sessions.map((s, index) => {
							const isActive = index === activeIndex;
							return (
								<div
									key={s.id}
									className="iframeContainer"
									style={{
										width: `${100 / sessions.length}%`,
										height: '100%',
										flexShrink: 0,
										pointerEvents: isActive ? 'auto' : 'none',
										visibility: (isActive || switching) ? 'visible' : 'hidden',
										paddingLeft: '8px'
									}}
								>
									{s.url ? (
										<iframe
											src={s.url}
											data-true-frame-id={s.id - 1}
											data-frame-id={index}
											className="w-full h-full"
											style={{
												borderRadius: 12,
												border: '1px solid rgba(255,255,255,0.06)',
												background: 'rgba(24,20,28,0.2)',
												backdropFilter: 'blur(4px)',
												WebkitBackdropFilter: 'blur(4px)',
											}}
										/>
									) : (
										<NewTab />
									)}
								</div>
							);
						})}
					</motion.div>
				</motion.div>

				<AnimatePresence mode="wait">
					{isPage && (
						<motion.div
							key={location.pathname}
							initial={{ opacity: 0, scale: 0.96 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.96 }}
							transition={{ duration: 0.2 }}
							className="absolute inset-0"
						>
							<Outlet />
						</motion.div>
					)}
				</AnimatePresence>
			</>
		);
	};

	return (
		<div
			className="h-screen flex flex-col overflow-hidden"
			style={{ background: '#050312' }}
		>
			<div className="fixed inset-0" style={{ zIndex: 0 }}>
				<SpaceStars mode="background" />
			</div>

			{showIntro && (
				<IntroSplash onComplete={() => setShowIntro(false)} />
			)}

			<div className="relative flex flex-col h-full" style={{ zIndex: 1 }}>
			{!isSpecialPage && (
				<div className="shrink-0" style={{ height: '3rem' }} />
			)}
				<div className="flex-1 flex overflow-hidden">
					<motion.div
						animate={{
							width: isSpecialPage ? '4rem' : (!autoHideSidebar || sidebarHovered) ? '4rem' : 0
						}}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						className="shrink-0"
					/>
					<main className="flex-1 relative">
						{renderMainContent()}
					</main>
				</div>
				<Sidebar
					activeItem={activeItem}
					onItemClick={handleNavClick}
					onHoverChange={setSidebarHovered}
					sessions={sessions}
					activeSession={activeSession}
					onSessionChange={handleSessionSwitch}
					onAddSession={handleAddSession}
					onCloseSession={handleCloseSession}
					alwaysVisible={isSpecialPage || !autoHideSidebar}
				/>
				{!isSpecialPage && <TopBar />}
			</div>
		</div>
	);
};

export default App;
