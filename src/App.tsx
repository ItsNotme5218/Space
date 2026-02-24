import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { SpaceStars } from './components/SpaceStars';
import { IntroSplash } from './components/IntroSplash';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTabCloak } from './hooks/useTabCloak';
import { Proxy } from './utils/proxy';
import { getDefaultPagePath } from './utils/internal-pages';

import './App.css';

const NEWTAB_URL = getDefaultPagePath();

export interface Session {
	id: number;
	url: string;
}

const App = () => {
	useTabCloak();
	const location = useLocation();
	const navigate = useNavigate();
	const activeItem = location.pathname.replace('/', '') || 'home';
	const [sidebarHovered, setSidebarHovered] = useState(false);
	const [showIntro, setShowIntro] = useState(true);
	const [autoHideSidebar] = useLocalStorage('autoHideSidebar', true);
	const [particles] = useLocalStorage('particles', true);
	const [bgMode] = useLocalStorage('bgMode', 'solid');
	const [bgValue] = useLocalStorage('bgValue', '#050312');
	const nextIdRef = useRef(1);
	const carouselRef = useRef<HTMLDivElement>(null);
	const rawSessions = useRef<Session[]>([{ id: 0, url: '' }]);
	const [sessions, setSessions] = useState<Session[]>([{ id: 0, url: '' }]);
	const [activeSession, setActiveSession] = useState(0);
	const [proxyReady, setProxyReady] = useState(false);
	const proxyRef = useRef<Proxy | null>(null);

	useEffect(() => {
		const proxy = new Proxy();
		proxyRef.current = proxy;
		window.proxy = proxy;

		proxy.ready.then(async () => {
			const swConfig = proxy.config;
			const proxySetting = proxy.proxySetting;

			if (
				proxySetting === 'sj' &&
				swConfig[proxySetting] &&
				typeof swConfig[proxySetting].func === 'function'
			) {
				await swConfig[proxySetting].func();
			}

			await proxy.registerSW(swConfig[proxySetting]);
			await proxy.setTransports();

			const transport = await proxy.connection.getTransport();
			if (transport == null) {
				await proxy.setTransports();
			}

			setProxyReady(true);
			console.log('[App] Proxy initialized and ready');
		});
	}, []);

	const navigateSession = useCallback(
		async (sessionId: number, input: string) => {
			const proxy = proxyRef.current;
			if (!proxy || !proxyReady) return;

			const encodedUrl = await proxy.convertURL(
				proxy.config,
				proxy.proxySetting,
				input
			);

			const idx = rawSessions.current.findIndex(
				s => s.id === sessionId
			);
			if (idx !== -1) {
				rawSessions.current[idx].url = encodedUrl;
				setSessions([...rawSessions.current]);
			}
		},
		[proxyReady]
	);

	useEffect(() => {
		rawSessions.current = sessions;
	}, [sessions]);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type !== 'newtab-navigate') return;
			const url = event.data.url;
			if (!url || typeof url !== 'string') return;

			const root = carouselRef.current;
			if (!root) return;
			const iframes = root.querySelectorAll<HTMLIFrameElement>('iframe[data-session-uid]');
			for (const iframe of iframes) {
				if (iframe.contentWindow === event.source) {
					const sessionUid = Number(iframe.dataset.sessionUid);
					if (!isNaN(sessionUid)) {
						navigateSession(sessionUid, url);
					}
					return;
				}
			}

			navigateSession(activeSession, url);
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, [navigateSession, activeSession]);

	useEffect(() => {
		const root = carouselRef.current;
		if (!root) return;
		for (const s of sessions) {
			const iframe = root.querySelector<HTMLIFrameElement>(
				`iframe[data-session-uid="${s.id}"]`
			);
			if (!iframe) continue;
			const targetSrc = s.url || NEWTAB_URL;
			if (iframe.getAttribute('src') !== targetSrc) {
				iframe.src = targetSrc;
			}
		}
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
		navigate('/');
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
		activeItem === 'settings' ||
		activeItem === 'playback';

	const [switching, setSwitching] = useState(false);
	const [siblingsOpaque, setSiblingsOpaque] = useState(false);
	const [siblingsVisible, setSiblingsVisible] = useState(false);
	const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleSessionSwitch = (id: number) => {
		if (id === activeSession) return;
		setSwitching(true);
		setSiblingsOpaque(true);
		setSiblingsVisible(true);
		setActiveSession(id);
		if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
		if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
		if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
		switchTimerRef.current = setTimeout(() => setSwitching(false), 500);
		fadeTimerRef.current = setTimeout(() => setSiblingsOpaque(false), 500);
		hideTimerRef.current = setTimeout(() => setSiblingsVisible(false), 900);
	};

	const getActiveIframe = useCallback((): HTMLIFrameElement | null => {
		const activeIndex = sessions.findIndex(x => x.id === activeSession);
		const root = carouselRef.current;
		if (!root) return null;
		const containers = root.querySelectorAll('.iframeContainer');
		const container = containers[activeIndex];
		if (!container) return null;
		return container.querySelector('iframe') as HTMLIFrameElement | null;
	}, [sessions, activeSession]);

	const handleIframeBack = useCallback(() => {
		console.log(`${activeSession} navigated back`);
	}, [activeSession]);

	const handleIframeForward = useCallback(() => {
		console.log(`${activeSession} navigated forward`);
	}, [activeSession]);

	const handleIframeReload = useCallback(() => {
		const iframe = getActiveIframe();
		if (!iframe) return;

		const activeSessionData = rawSessions.current.find(s => s.id === activeSession);
		if (!activeSessionData?.url) {
			iframe.src = NEWTAB_URL;
			return;
		}

		if (iframe.contentWindow) {
			try {
				iframe.contentWindow.location.reload();
			} catch {
				// eslint-disable-next-line no-self-assign
				if (iframe.src) iframe.src = iframe.src;
			}
		}
	}, [getActiveIframe, activeSession]);

	const renderMainContent = () => {
		const isPage = isSpecialPage;
		const activeIndex = sessions.findIndex(x => x.id === activeSession);

		return (
			<>
				<motion.div
					ref={carouselRef}
					animate={{
						scale: switching ? 0.85 : 1,
						opacity: switching ? 0.7 : 1
					}}
					transition={{
						type: 'spring',
						stiffness: 170,
						damping: 15,
						mass: 0.4
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
						animate={{
							x: `calc(${-activeIndex * (100 / sessions.length)}% - ((${activeIndex}) * 8px))`
						}}
						transition={{
							type: 'spring',
							stiffness: 650,
							damping: 75
						}}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							height: '100%',
							display: 'flex',
							width: `${sessions.length * 100}%`
						}}
					>
						{sessions.map((s, index) => {
							const isActive = index === activeIndex;
							return (
								<div
									key={s.id}
									className="iframeContainer"
									style={{
										width: `calc(${100 / sessions.length}%`,
										height: '100%',
										flexShrink: 0,
										pointerEvents: isActive
											? 'auto'
											: 'none',
										opacity: isActive
											? 1
											: siblingsOpaque
												? 0.7
												: 0,
										transition: 'opacity 0.4s ease',
										visibility:
											isActive || siblingsVisible
												? 'visible'
												: 'hidden',
										paddingLeft: '0px',
										marginRight: '8px'
									}}
								>
								<iframe
									src={s.url || NEWTAB_URL}
									data-session-id={index}
									data-session-uid={s.id}
									className="w-full h-full"
									style={{
											borderRadius: 12,
											border: '1px solid rgba(255,255,255,0.06)',
											background:
												'rgba(24,20,28,0.65)',
											backdropFilter: 'blur(4px)',
											WebkitBackdropFilter:
												'blur(4px)'
										}}
									/>
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

	const bgStyle = (() => {
		if (particles) return { background: '#050312' };
		switch (bgMode) {
			case 'image':
				return {
					background: '#050312',
					backgroundImage: `url(${bgValue})`,
					backgroundSize: 'cover',
					backgroundPosition: 'center'
				};
			case 'solid':
				return { background: bgValue || '#050312' };
			default:
				return { background: '#050312' };
		}
	})();

	return (
		<div
			className="h-screen flex flex-col overflow-hidden"
			style={bgStyle}
		>
			<div className="fixed inset-0" style={{ zIndex: 0 }}>
				{particles && <SpaceStars mode="background" />}
			</div>

			{showIntro && (
				<IntroSplash onComplete={() => setShowIntro(false)} />
			)}

			<div
				className="relative flex flex-col h-full"
				style={{ zIndex: 1 }}
			>
				{!isSpecialPage && (
					<div className="shrink-0" style={{ height: '3rem' }} />
				)}
				<div className="flex-1 flex overflow-hidden">
					<motion.div
						animate={{
							width: isSpecialPage
								? '4rem'
								: !autoHideSidebar || sidebarHovered
									? '4rem'
									: 0
						}}
						transition={{
							type: 'spring',
							stiffness: 300,
							damping: 30
						}}
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
				{!isSpecialPage && (
					<TopBar
						sessions={sessions}
						activeSession={activeSession}
						carouselRef={carouselRef}
						proxyReady={proxyReady}
						onNavigate={url =>
							navigateSession(activeSession, url)
						}
						onBack={handleIframeBack}
						onForward={handleIframeForward}
						onReload={handleIframeReload}
						onHome={() => {
							const idx = rawSessions.current.findIndex(
								s => s.id === activeSession
							);
							if (idx !== -1) {
								rawSessions.current[idx].url = '';
								setSessions([...rawSessions.current]);
							}
						}}
					/>
				)}
			</div>
		</div>
	);
};

export default App;
