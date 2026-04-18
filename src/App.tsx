import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { SpaceStars } from "./components/SpaceStars";
import { IntroSplash } from "./components/IntroSplash";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useTabCloak } from "./hooks/useTabCloak";
import { Proxy } from "./utils/proxy";
import { getDefaultPagePath } from "./utils/internal-pages";

const MAX_SESSIONS = 9;

const getScreenCap = (): number => {
  const h = window.innerHeight;
  if (h < 600) return 3;
  if (h < 800) return 5;
  if (h < 1000) return 7;
  return MAX_SESSIONS;
};

import "./App.css";

const NEWTAB_URL = getDefaultPagePath();

export interface Session {
  id: number;
  url: string;
}

const App = () => {
  useTabCloak();
  const location = useLocation();
  const navigate = useNavigate();
  const activeItem = location.pathname.replace("/", "") || "home";
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [introProgress, setIntroProgress] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);
  const [autoHideSidebar] = useLocalStorage("autoHideSidebar", true);
  const [particles] = useLocalStorage("particles", true);
  const [bgMode] = useLocalStorage("bgMode", "solid");
  const [bgValue] = useLocalStorage("bgValue", "#050312");
  const [autoCapSessions] = useLocalStorage("autoCapSessions", true);
  const [screenCap, setScreenCap] = useState(getScreenCap);
  const maxSessions = autoCapSessions ? Math.min(screenCap, MAX_SESSIONS) : MAX_SESSIONS;

  useEffect(() => {
    if (!autoCapSessions) return;
    const onResize = () => setScreenCap(getScreenCap());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [autoCapSessions]);
  const nextIdRef = useRef(1);
  const carouselRef = useRef<HTMLDivElement>(null);
  const rawSessions = useRef<Session[]>([{ id: 0, url: "" }]);
  const [sessions, setSessions] = useState<Session[]>([{ id: 0, url: "" }]);
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
        proxySetting === "sj" &&
        swConfig[proxySetting] &&
        typeof swConfig[proxySetting].func === "function"
      ) {
        await swConfig[proxySetting].func();
      }

      console.log(swConfig[proxySetting]);

      await proxy.registerSW(swConfig[proxySetting]);
      await proxy.setTransports();

      const transport = await proxy.connection.getTransport();
      if (transport == null) {
        await proxy.setTransports();
      }

      setProxyReady(true);
      console.log("[App] Proxy initialized and ready");
    });
  }, []);

  const navigateSession = useCallback(
    async (sessionId: number, input: string) => {
      const proxy = proxyRef.current;
      if (!proxy || !proxyReady) return;

      const encodedUrl = await proxy.convertURL(proxy.config, proxy.proxySetting, input);

      const idx = rawSessions.current.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        rawSessions.current[idx].url = encodedUrl;
        setSessions([...rawSessions.current]);
      }
    },
    [proxyReady],
  );

  useEffect(() => {
    rawSessions.current = sessions;
  }, [sessions]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "newtab-navigate") return;
      const url = event.data.url;
      if (!url || typeof url !== "string") return;

      const root = carouselRef.current;
      if (!root) return;
      const iframes = root.querySelectorAll<HTMLIFrameElement>("iframe[data-session-uid]");
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

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigateSession, activeSession]);

  useEffect(() => {
    const root = carouselRef.current;
    if (!root) return;
    for (const s of sessions) {
      const iframe = root.querySelector<HTMLIFrameElement>(`iframe[data-session-uid="${s.id}"]`);
      if (!iframe) continue;
      const targetSrc = s.url || NEWTAB_URL;
      if (iframe.getAttribute("src") !== targetSrc) {
        iframe.src = targetSrc;
      }
    }
  }, [sessions]);

  const handleNavClick = (id: string) => {
    navigate(id === "home" ? "/" : `/${id}`);
  };

  const handleAddSession = () => {
    if (rawSessions.current.length >= maxSessions) return;
    const newId = nextIdRef.current++;
    const entry: Session = { id: newId, url: "" };
    rawSessions.current.push(entry);
    setSessions([...rawSessions.current]);
    setActiveSession(newId);
    navigate("/");
  };

  const handleCloseSession = (id: number) => {
    const idx = rawSessions.current.findIndex((s) => s.id === id);
    if (idx === -1) return;
    rawSessions.current.splice(idx, 1);

    if (rawSessions.current.length === 0) {
      const fallbackId = nextIdRef.current++;
      const fallback: Session = {
        id: fallbackId,
        url: "",
      };
      rawSessions.current.push(fallback);
      setActiveSession(fallbackId);
    } else if (activeSession === id) {
      const newActive = rawSessions.current[Math.min(idx, rawSessions.current.length - 1)];
      setActiveSession(newActive.id);
    }

    setSessions([...rawSessions.current]);
  };

  const isSpecialPage =
    activeItem === "games" ||
    activeItem === "apps" ||
    activeItem === "settings" ||
    activeItem === "playback";

  const [switching, setSwitching] = useState(false);
  const [siblingsOpaque, setSiblingsOpaque] = useState(false);
  const [siblingsVisible, setSiblingsVisible] = useState(false);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

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
    const activeIndex = sessions.findIndex((x) => x.id === activeSession);
    const root = carouselRef.current;
    if (!root) return null;
    const containers = root.querySelectorAll(".iframeContainer");
    const container = containers[activeIndex];
    if (!container) return null;
    return container.querySelector("iframe") as HTMLIFrameElement | null;
  }, [sessions, activeSession]);

  const handleIframeBack = useCallback(() => {
    const iframe = getActiveIframe();
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.history.back();
    } catch {}
  }, [getActiveIframe]);

  const handleIframeForward = useCallback(() => {
    const iframe = getActiveIframe();
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.history.forward();
    } catch {}
  }, [getActiveIframe]);

  const handleIframeReload = useCallback(() => {
    const iframe = getActiveIframe();
    if (!iframe) return;

    const activeSessionData = rawSessions.current.find((s) => s.id === activeSession);
    if (!activeSessionData?.url) {
      iframe.src = NEWTAB_URL;
      return;
    }

    if (iframe.contentWindow) {
      try {
        iframe.contentWindow.location.reload();
      } catch {
        const currentSrc = iframe.src;
        iframe.src = "";
        iframe.src = currentSrc;
      }
    }
  }, [getActiveIframe, activeSession]);

  const renderMainContent = () => {
    const isPage = isSpecialPage;
    const activeIndex = sessions.findIndex((x) => x.id === activeSession);

    return (
      <div className="relative w-full h-full">
        <motion.div
          ref={carouselRef}
          initial={false}
          animate={{
            scale: isPage ? 0.94 : switching ? 0.85 : 1,
            opacity: isPage ? 0 : switching ? 0.7 : 1,
            // Note: no `filter` here. When `isPage` is true the carousel
            // is already opacity 0 (page overlay covers it), so blurring an
            // invisible element has no visible effect. Keeping a permanent
            // `filter: blur(0px)` in the animate map creates a filter
            // rendering context that re-rasterizes the nested iframes every
            // frame of the scale animation — visible as side-to-side jitter.
            y: isPage ? -20 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 28,
            mass: 0.6,
          }}
          className="absolute inset-2"
          style={{
            pointerEvents: isPage ? "none" : "auto",
            borderRadius: 12,
            // Promote to its own GPU layer so the nested iframe scales on a
            // composited texture instead of re-rasterizing each frame.
            willChange: "transform, opacity",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <motion.div
            animate={{
              x: `calc(${-activeIndex * (100 / sessions.length)}% - ((${activeIndex}) * 8px))`,
            }}
            transition={{
              type: "spring",
              stiffness: 650,
              damping: 75,
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              display: "flex",
              width: `${sessions.length * 100}%`,
              // Put the carousel on its own layer too so the percentage-based
              // translate doesn't fight sub-pixel rounding when the ancestor
              // scale animates.
              willChange: "transform",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
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
                    height: "100%",
                    flexShrink: 0,
                    pointerEvents: isActive ? "auto" : "none",
                    opacity: isActive ? 1 : siblingsOpaque ? 0.7 : 0,
                    transition: "opacity 0.4s ease",
                    visibility: isActive || siblingsVisible ? "visible" : "hidden",
                    paddingLeft: "0px",
                    marginRight: "8px",
                  }}
                >
                  <iframe
                    src={s.url || NEWTAB_URL}
                    data-session-id={index}
                    data-session-uid={s.id}
                    className="w-full h-full"
                    style={{
                      borderRadius: 12,
                      border: s.url ? "1px solid rgba(255,255,255,0.06)" : "none",
                      background: s.url ? "rgba(24,20,28,0.65)" : "transparent",
                      backdropFilter: s.url ? "blur(4px)" : "none",
                      WebkitBackdropFilter: s.url ? "blur(4px)" : "none",
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
              initial={{ opacity: 0, scale: 0.92, y: 15, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.05, y: -15, filter: "blur(12px)" }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 26,
                mass: 1,
                filter: { duration: 0.2 },
              }}
              className="absolute inset-0"
            >
              <Outlet />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (!showIntro) {
      setIntroDone(true);
    }
  }, [showIntro]);

  const bgStyle = (() => {
    if (particles) return { backgroundColor: "#050312" };
    switch (bgMode) {
      case "image":
        return {
          backgroundColor: "#050312",
          backgroundImage: `url(${bgValue})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        };
      case "solid":
        return { backgroundColor: bgValue || "#050312" };
      default:
        return { backgroundColor: "#050312" };
    }
  })();

  return (
    <div id="app-root" className="h-screen flex flex-col overflow-hidden" style={bgStyle}>
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        {particles && (
          <SpaceStars
            mode="intro"
            skip={isSkipped}
            onIntroComplete={() => setShowIntro(false)}
            onProgress={setIntroProgress}
          />
        )}
      </div>

      {showIntro && (
        <IntroSplash
          progress={introProgress}
          onComplete={() => {
            setIsSkipped(true);
            setShowIntro(false);
          }}
        />
      )}

      <motion.div
        className="relative flex flex-col h-full"
        style={{ zIndex: 1 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: introDone ? 1 : 0 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      >
        {!isSpecialPage && (
          <>
            <div className="shrink-0" style={{ height: "3rem" }} />
            <TopBar
              sessions={sessions}
              activeSession={activeSession}
              carouselRef={carouselRef}
              proxyReady={proxyReady}
              onNavigate={(url) => navigateSession(activeSession, url)}
              onBack={handleIframeBack}
              onForward={handleIframeForward}
              onReload={handleIframeReload}
              onHome={() => {
                const idx = rawSessions.current.findIndex((s) => s.id === activeSession);
                if (idx !== -1) {
                  rawSessions.current[idx].url = "";
                  setSessions([...rawSessions.current]);
                }
              }}
            />
          </>
        )}
        <div className="flex-1 flex overflow-hidden">
          <motion.div
            animate={{
              width: isSpecialPage ? "4rem" : !autoHideSidebar || sidebarHovered ? "4rem" : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="shrink-0"
          />
          <main className="flex-1 relative flex flex-col">{renderMainContent()}</main>
        </div>
        <Sidebar
          activeItem={activeItem}
          onItemClick={handleNavClick}
          onHoverChange={setSidebarHovered}
          sessions={sessions}
          activeSession={activeSession}
          maxSessions={maxSessions}
          onSessionChange={handleSessionSwitch}
          onAddSession={handleAddSession}
          onCloseSession={handleCloseSession}
          alwaysVisible={isSpecialPage || !autoHideSidebar}
        />
      </motion.div>
    </div>
  );
};

export default App;
