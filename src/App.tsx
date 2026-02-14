import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { GamesPage } from './pages/GamesPage';
import { AppsPage } from './pages/AppsPage';
import { SettingsPage } from './pages/SettingsPage';
import './App.css';

export interface Session {
	id: number;
	url: string;
}

const App = () => {
	const [activeItem, setActiveItem] = useState('home');
	const [topBarHovered, setTopBarHovered] = useState(false);
	const [sidebarHovered, setSidebarHovered] = useState(false);
	const nextIdRef = useRef(2);
	const rawSessions = useRef<Session[]>([
		{ id: 1, url: 'https://example.com' }
	]);
	const [sessions, setSessions] = useState<Session[]>(() => [
		...rawSessions.current
	]);
	const [activeSession, setActiveSession] = useState(1);

	const handleSessionChange = (id: number) => {
		setActiveSession(id);
	};

	const handleAddSession = () => {
		const newId = nextIdRef.current++;
		const entry: Session = { id: newId, url: 'https://example.com' };
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
				url: 'https://example.com'
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

	const renderMainContent = () => {
		if (activeItem === 'games') {
			return <GamesPage />;
		}
		if (activeItem === 'apps') {
			return <AppsPage />;
		}
		if (activeItem === 'settings') {
			return <SettingsPage />;
		}
		return (
			<div
				className="absolute inset-2"
				style={{ transformStyle: 'preserve-3d' }}
			>
				{sessions.map((s, index) => {
					const activeIndex = sessions.findIndex(
						x => x.id === activeSession
					);
					const thisIndex = sessions.findIndex(x => x.id === s.id);
					const offset = thisIndex - activeIndex;
					const isActive = offset === 0;
					return (
						<motion.div
							key={s.id - 1}
							animate={{
								x: isActive
									? '0%'
									: offset < 0
										? '-60%'
										: '60%',
								scale: isActive ? 1 : 0.85,
								opacity: isActive ? 1 : 0,
								rotateY: isActive ? 0 : offset < 0 ? 25 : -25,
								zIndex: isActive ? 10 : 10 - Math.abs(offset)
							}}
							transition={{
								type: 'spring',
								stiffness: 300,
								damping: 28,
								mass: 0.9
							}}
							className="absolute inset-0 iframeContainer"
							style={{
								pointerEvents: isActive ? 'auto' : 'none',
								transformOrigin:
									offset <= 0 ? 'right center' : 'left center'
							}}
						>
							<iframe
								src={s.url}
								true-frame-id={s.id - 1}
								frame-id={index}
								className="w-full h-full rounded-2xl border border-[#2d2d3a]/50"
								style={{
									filter: 'brightness(1) backdrop-blur(4px)' // add brightness slider at some point
								}}
							/>
						</motion.div>
					);
				})}
			</div>
		);
	};

	return (
		<div
			className="h-screen bg-[#000000] flex flex-col overflow-hidden"
			style={{ perspective: '1200px' }}
		>
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
				onItemClick={setActiveItem}
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
	);
};

export default App;
