import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { NewTab } from './components/NewTab';
import { SpaceStars } from './components/SpaceStars';
import { IntroSplash } from './components/IntroSplash';
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
	const [showIntro, setShowIntro] = useState(true);
	const nextIdRef = useRef(2);
	const rawSessions = useRef<Session[]>([
		{ id: 1, url: '' }
	]);
	const [sessions, setSessions] = useState<Session[]>([
		{ id: 1, url: '' }
	]);
	const [activeSession, setActiveSession] = useState(1);
	const prevActiveRef = useRef(1);
	const switchDirection = useRef<'left' | 'right'>('right');

	useEffect(() => {
		rawSessions.current = sessions;
	}, [sessions]);

	const handleNavClick = (id: string) => {
		navigate(id === 'home' ? '/' : `/${id}`);
	};

	const handleSessionChange = (id: number) => {
		const prevIdx = sessions.findIndex(s => s.id === activeSession);
		const nextIdx = sessions.findIndex(s => s.id === id);
		switchDirection.current = nextIdx >= prevIdx ? 'right' : 'left';
		prevActiveRef.current = activeSession;
		setActiveSession(id);
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

	const getCardAnimation = useMemo(() => {
		const dir = switchDirection.current === 'right' ? 1 : -1;

		return (offset: number, _total: number) => {
			const isActive = offset === 0;
			const absOffset = Math.abs(offset);
			const sign = offset < 0 ? -1 : 1;

			if (isActive) {
				return {
					animate: {
						x: [dir * 120, dir * 60, 0],
						y: [-40, -20, 0],
						scale: [0.72, 0.88, 1],
						rotateY: [dir * -35, dir * -12, 0],
						rotateX: [8, 3, 0],
						rotateZ: [dir * -6, dir * -2, 0],
						opacity: [0.85, 1, 1],
						z: [0, 60, 0],
					},
					transition: {
						duration: 0.55,
						ease: [0.22, 1.0, 0.36, 1.0] as [number, number, number, number],
						times: [0, 0.5, 1],
					},
					zIndex: 20,
				};
			}

			const deckX = sign * (35 + absOffset * 12);
			const deckY = 30 + absOffset * 6;
			const deckScale = 0.62 - absOffset * 0.04;
			const deckRotateY = sign * 40;
			const deckRotateX = -12 - absOffset * 2;
			const deckRotateZ = sign * (8 + absOffset * 2);
			const deckZ = -(absOffset * 80 + 120);

			return {
				animate: {
					x: deckX,
					y: deckY,
					scale: Math.max(deckScale, 0.4),
					rotateY: deckRotateY,
					rotateX: deckRotateX,
					rotateZ: deckRotateZ,
					opacity: absOffset <= 1 ? 0.35 : 0,
					z: deckZ,
				},
				transition: {
					type: 'spring' as const,
					stiffness: 180,
					damping: 26,
					mass: 1.2,
					opacity: { duration: 0.4, delay: 0.15 },
				},
				zIndex: 10 - absOffset,
			};
		};
	}, [activeSession]); // eslint-disable-line react-hooks/exhaustive-deps

	const renderMainContent = () => {
		const isPage = isSpecialPage;

		return (
			<>
				<div
					className="absolute inset-2"
					style={{
						transformStyle: 'preserve-3d',
						perspective: '1200px',
						display: isPage ? 'none' : 'block'
					}}
				>
					{sessions.map((s, index) => {
						const activeIndex = sessions.findIndex(
							x => x.id === activeSession
						);
						const thisIndex = sessions.findIndex(x => x.id === s.id);
						const offset = thisIndex - activeIndex;
						const isActive = offset === 0;
						const card = getCardAnimation(offset, sessions.length);

						return (
							<motion.div
								key={s.id - 1}
								animate={{
									...card.animate,
									zIndex: card.zIndex,
								}}
								transition={card.transition}
								className="absolute inset-0 iframeContainer"
								style={{
									pointerEvents: isActive ? 'auto' : 'none',
									transformOrigin: 'center center',
									transformStyle: 'preserve-3d',
									backfaceVisibility: 'hidden',
								}}
							>
								{s.url ? (
									<iframe
										src={s.url}
										true-frame-id={s.id - 1}
										frame-id={index}
										className="w-full h-full rounded-2xl border border-[#2d2d3a]/50"
										style={{
											filter: 'brightness(1) backdrop-blur(4px)'
										}}
									/>
								) : (
									<NewTab />
								)}
							</motion.div>
						);
					})}
				</div>

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
			style={{ perspective: '1200px', background: '#050312' }}
		>
			<div className="fixed inset-0" style={{ zIndex: 0 }}>
				<SpaceStars mode="background" />
			</div>

			{showIntro && (
				<IntroSplash onComplete={() => setShowIntro(false)} />
			)}

			<div className="relative flex flex-col h-full" style={{ zIndex: 1 }}>
				{!isSpecialPage && (
					<motion.div
						animate={{ height: topBarHovered ? 40 : 0 }}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						className="shrink-0"
					/>
				)}
				<div className="flex-1 flex overflow-hidden">
					<motion.div
						animate={{
							width: isSpecialPage ? 72 : sidebarHovered ? 72 : 0
						}}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						className="shrink-0"
					/>
					<main
						className={`flex-1 relative ${isSpecialPage ? '' : 'p-2'}`}
						style={{ transformStyle: 'preserve-3d' }}
					>
						{renderMainContent()}
					</main>
				</div>
				<Sidebar
					activeItem={activeItem}
					onItemClick={handleNavClick}
					onHoverChange={setSidebarHovered}
					sessions={sessions}
					activeSession={activeSession}
					onSessionChange={handleSessionChange}
					onAddSession={handleAddSession}
					onCloseSession={handleCloseSession}
					alwaysVisible={isSpecialPage}
				/>
				{!isSpecialPage && <TopBar onHoverChange={setTopBarHovered} />}
			</div>
		</div>
	);
};

export default App;
