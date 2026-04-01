import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  ArrowLeft,
  RotateCw,
  ArrowRight,
  Home,
  Maximize2,
  Minimize2,
  MoreVertical,
  Search,
} from "lucide-react";
import { useLocalStorage, writeSetting } from "../hooks/useLocalStorage";
import { useClickOutside } from "../hooks/useClickOutside";
import { SPC_PROTOCOL } from "../utils/internal-pages";
import type { Session } from "../App";

const ENGINE_ORDER = ["DuckDuckGo", "Google", "Bing", "Brave", "Yahoo!"] as const;

const SEARCH_ENGINES: Record<
  string,
  { label: string; short: string; color: string; letterColors?: string[] }
> = {
  DuckDuckGo: { label: "DuckDuckGo", short: "ddg", color: "#DE5833" },
  Google: {
    label: "Google",
    short: "ggl",
    color: "#4285F4",
    letterColors: ["#EA4335", "#FBBC05", "#34A853"],
  },
  Bing: { label: "Bing", short: "bng", color: "#00809D" },
  Brave: { label: "Brave", short: "brv", color: "#FB542B" },
  "Yahoo!": { label: "Yahoo!", short: "yho", color: "#A24EDE" },
};

const pillStyle = {
  background: "rgba(14, 14, 16, 0.65)",
  border: "1px solid rgba(45, 45, 58, 0.5)",
  boxShadow: "0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  pointerEvents: "auto" as const,
};

interface TopBarProps {
  sessions: Session[];
  activeSession: number;
  carouselRef: React.RefObject<HTMLDivElement | null>;
  proxyReady: boolean;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome: () => void;
}

export const TopBar = ({
  sessions,
  activeSession,
  carouselRef,
  proxyReady,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onHome,
}: TopBarProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputHovered, setInputHovered] = useState(false);
  const [displayUrl, setDisplayUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchEngine, setSearchEngine] = useLocalStorage("searchEngine", "DuckDuckGo");
  const reloadControls = useAnimation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setIsMenuOpen(false));

  const engine = SEARCH_ENGINES[searchEngine] || SEARCH_ENGINES.DuckDuckGo;

  const hexToGlowRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };
  const glowRgb = hexToGlowRgb(engine.color);

  const isGoogle = searchEngine === "Google";
  const headerGradient = isGoogle
    ? "linear-gradient(135deg, rgba(66, 133, 244, 0.08) 0%, transparent 15%, rgba(234, 67, 53, 0.07) 30%, rgba(251, 188, 5, 0.04) 60%, rgba(52, 168, 83, 0.09) 100%)"
    : `linear-gradient(135deg, rgba(${glowRgb}, 0.06) 0%, transparent 60%, rgba(${glowRgb}, 0.02) 100%)`;

  const shiftColor = (hex: string, hueShift: number, lighten: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(255, r + lighten)}, ${Math.min(255, g + lighten + hueShift)}, ${Math.min(255, b + lighten - hueShift)})`;
  };
  const textGradient = `linear-gradient(135deg, ${engine.color}, ${shiftColor(engine.color, 15, 30)})`;

  const activeSessionData = sessions.find((s) => s.id === activeSession);
  const isOnNewTab = !activeSessionData?.url;

  const decodeProxyUrl = useCallback((proxyUrl: string): string => {
    if (!proxyUrl) return "";

    let path = proxyUrl;
    try {
      const u = new URL(proxyUrl, window.location.origin);
      path = u.pathname + u.search + u.hash;
    } catch {}

    const uvPrefix = window.__uv$config?.prefix || "/u/res/";
    const sjPrefix = window.proxy?.scramConfig?.prefix || "/s/res/";

    try {
      let encoded: string | null = null;

      if (path.startsWith(uvPrefix)) {
        encoded = path.slice(uvPrefix.length);
      } else if (path.startsWith(sjPrefix)) {
        encoded = path.slice(sjPrefix.length);
      }

      if (encoded !== null && window.__uv$config?.decodeUrl) {
        return window.__uv$config.decodeUrl(encoded);
      }
    } catch {}
    return proxyUrl;
  }, []);

  useEffect(() => {
    let timer: number | undefined;

    if (isOnNewTab) {
      timer = window.setTimeout(() => {
        setDisplayUrl("");
        if (!inputFocused) setInputValue("");
      }, 0);

      return () => {
        if (timer !== undefined) clearTimeout(timer);
      };
    }

    const url = activeSessionData?.url || "";
    const decoded = decodeProxyUrl(url);

    timer = window.setTimeout(() => {
      setDisplayUrl(decoded);
      if (!inputFocused) setInputValue(stripProtocol(decoded));
    }, 0);

    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [activeSessionData?.url, isOnNewTab, inputFocused, decodeProxyUrl]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (interval) return;
      if (isOnNewTab) return;

      interval = setInterval(() => {
        const activeIndex = sessions.findIndex((s) => s.id === activeSession);
        const root = carouselRef.current;
        if (!root) return;
        const containers = root.querySelectorAll(".iframeContainer");
        const container = containers[activeIndex];
        if (!container) return;
        const iframe = container.querySelector("iframe") as HTMLIFrameElement | null;
        if (!iframe) return;

        try {
          const iframeSrc = iframe.contentWindow?.location.href;
          if (iframeSrc && iframeSrc !== "about:blank") {
            const decoded = decodeProxyUrl(iframeSrc);
            if (decoded !== displayUrl) {
              setDisplayUrl(decoded);
              if (!inputFocused) setInputValue(stripProtocol(decoded));
            }
          }
        } catch {
          const src = iframe.getAttribute("src") || "";
          const decoded = decodeProxyUrl(src);
          if (decoded !== displayUrl) {
            setDisplayUrl(decoded);
            if (!inputFocused) setInputValue(stripProtocol(decoded));
          }
        }
      }, 1000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [sessions, activeSession, isOnNewTab, carouselRef, displayUrl, inputFocused, decodeProxyUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleHome = () => {
    onHome();
    setInputValue("");
    setDisplayUrl("");
  };

  const SEARCH_ENGINE_URLS: Record<string, string> = {
    DuckDuckGo: "https://www.duckduckgo.com/?q=%s",
    Google: "https://www.google.com/search?q=%s",
    Bing: "https://www.bing.com/search?q=%s",
    Brave: "https://search.brave.com/search?q=%s",
    "Yahoo!": "https://search.yahoo.com/search?p=%s",
  };

  const cycleEngine = () => {
    const idx = ENGINE_ORDER.indexOf(searchEngine as (typeof ENGINE_ORDER)[number]);
    const next = ENGINE_ORDER[(idx + 1) % ENGINE_ORDER.length];
    setSearchEngine(next);
    const url = SEARCH_ENGINE_URLS[next];
    if (url) {
      writeSetting("search", url);
      if (window.proxy) window.proxy.searchVar = url;
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      const activeIndex = sessions.findIndex((s) => s.id === activeSession);
      const root = carouselRef.current;
      const containers = root
        ? root.querySelectorAll(".iframeContainer")
        : document.querySelectorAll(".iframeContainer");
      const target =
        (containers[activeIndex] as HTMLElement) ??
        document.getElementById("app-root") ??
        document.documentElement;

      await target.requestFullscreen();
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    }
  };

  const handleReloadClick = async () => {
    await reloadControls.start({
      rotate: 360,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
    });
    reloadControls.set({ rotate: 0 });
    onReload();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    if (!proxyReady) {
      console.warn("[TopBar] Proxy not ready yet");
      return;
    }

    onNavigate(query);
    inputRef.current?.blur();
  };

  const getProtocolDisplay = (): string => {
    if (isOnNewTab) return SPC_PROTOCOL;
    if (displayUrl.startsWith("https://")) return "https://";
    if (displayUrl.startsWith("http://")) return "http://";
    return "https://";
  };

  const stripProtocol = (url: string): string => {
    if (url.startsWith("https://")) return url.slice(8);
    if (url.startsWith("http://")) return url.slice(7);
    return url;
  };

  const iconButtonClass =
    "p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer";

  return (
    <header
      className="fixed top-0 left-2 right-2 h-10 flex items-center z-40 mt-2 gap-2 pointer-events-none"
      style={{ position: "fixed" }}
    >
      <motion.div
        className="engineBg"
        animate={{
          opacity: inputFocused ? [0.6, 0.9, 0.6] : [0.2, 0.4, 0.2],
          scale: inputFocused ? [0.99, 1.01, 0.99] : 1,
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "-0.25rem",
          borderRadius: 20,
          background: headerGradient,
          pointerEvents: "none",
          transition: "background 0.4s ease",
          zIndex: 999,
          filter: "blur(5px)",
        }}
      />
      <motion.div
        whileHover={{
          scale: 1.01,
          y: -1,
          boxShadow: `0 0 15px rgba(${glowRgb}, 0.2), inset 0 0 8px rgba(255,255,255,0.05)`,
        }}
        transition={{ type: "spring", stiffness: 340, damping: 24 }}
        className="flex items-center gap-0.5 h-10 rounded-full p-2!"
        style={pillStyle}
      >
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onBack}
          className={iconButtonClass}
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08, rotate: 30 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleReloadClick}
          className={iconButtonClass}
          title="Reload"
        >
          <motion.div animate={reloadControls}>
            <RotateCw className="w-4 h-4" />
          </motion.div>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onForward}
          className={iconButtonClass}
          title="Forward"
        >
          <ArrowRight className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleHome}
          className={iconButtonClass}
          title="Home"
        >
          <Home className="w-4 h-4" />
        </motion.button>
      </motion.div>

      <motion.div
        className="flex-1 h-10 rounded-full cursor-text"
        onClick={() => inputRef.current?.focus()}
        onMouseEnter={() => setInputHovered(true)}
        onMouseLeave={() => setInputHovered(false)}
        animate={{
          scale: inputFocused ? 1.005 : 1,
          borderColor: inputFocused
            ? `rgba(${glowRgb}, 0.4)`
            : inputHovered
              ? `rgba(${glowRgb}, 0.2)`
              : "rgba(45, 45, 58, 0.5)",
          boxShadow: inputFocused
            ? `0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset, 0 0 25px rgba(${glowRgb}, 0.2), inset 0 0 15px rgba(${glowRgb}, 0.1)`
            : inputHovered
              ? `0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset, 0 0 15px rgba(${glowRgb}, 0.1)`
              : "0 0 8px 1px rgba(255, 255, 255, 0.04), 0 0 12px 1px rgba(27, 27, 27, 0.65) inset",
        }}
        transition={{ type: "spring", stiffness: 350, damping: 30, mass: 1 }}
        style={{
          background: "rgba(14, 14, 16, 0.65)",
          border: "1px solid rgba(45, 45, 58, 0.5)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          pointerEvents: "auto",
        }}
      >
        <form onSubmit={handleSubmit} className="h-full rounded-full px-4 flex items-center gap-3">
          <motion.button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              cycleEngine();
            }}
            className="flex items-center gap-1.5 shrink-0 select-none cursor-pointer rounded-md px-1.5 py-0.5"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            animate={{
              opacity: inputFocused ? 1 : 0.65,
            }}
            transition={{ duration: 0.15 }}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
            }}
            title={`Search with ${engine.label} — click to switch`}
          >
            <Search
              className="shrink-0"
              style={{
                width: 13,
                height: 13,
                color: inputFocused ? engine.color : "rgba(255, 255, 255, 0.3)",
                transition: "color 0.2s",
              }}
            />
            <AnimatePresence mode="wait">
              <motion.span
                key={engine.short}
                initial={{
                  opacity: 0,
                  y: 4,
                  filter: "blur(4px)",
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  y: -4,
                  filter: "blur(4px)",
                }}
                transition={{ duration: 0.15 }}
                className="text-[10px] font-semibold tracking-wider uppercase"
                style={{
                  background: inputFocused && !engine.letterColors ? textGradient : "none",
                  backgroundClip: inputFocused && !engine.letterColors ? "text" : undefined,
                  WebkitBackgroundClip: inputFocused && !engine.letterColors ? "text" : undefined,
                  WebkitTextFillColor:
                    inputFocused && !engine.letterColors ? "transparent" : undefined,
                  color: inputFocused ? engine.color : "rgba(255, 255, 255, 0.25)",
                  transition: "color 0.2s",
                  fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
                }}
              >
                {engine.letterColors
                  ? engine.short.split("").map((ch, i) => (
                      <span
                        key={i}
                        style={{
                          color: inputFocused
                            ? engine.letterColors![i % engine.letterColors!.length]
                            : "rgba(255, 255, 255, 0.25)",
                          transition: "color 0.2s",
                          fontWeight: 800,
                        }}
                      >
                        {ch}
                      </span>
                    ))
                  : engine.short}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <div
            className="w-px h-4 shrink-0"
            style={{
              background: inputFocused ? `rgba(${glowRgb}, 0.25)` : "rgba(255, 255, 255, 0.06)",
              transition: "background 0.2s",
            }}
          />

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              setInputFocused(true);
              if (displayUrl) setInputValue(displayUrl);
            }}
            onBlur={() => {
              setInputFocused(false);
              if (!inputValue.trim() && displayUrl) {
                setInputValue(displayUrl);
              }
            }}
            placeholder={
              inputFocused ? `Search with ${engine.label} or enter URL` : "Search or enter URL"
            }
            spellCheck={false}
            className="flex-1 bg-transparent border-none outline-none min-w-0"
            style={{
              fontSize: 13,
              fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
              letterSpacing: "0.01em",
              color: "rgba(255, 255, 255, 0.75)",
              caretColor: engine.color,
            }}
          />

          <span
            className="text-[11px] font-mono shrink-0 select-none"
            style={{
              color: inputFocused ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.2)",
              transition: "color 0.2s",
              letterSpacing: "0.02em",
            }}
          >
            {getProtocolDisplay()}
          </span>
        </form>
      </motion.div>

      <motion.div
        whileHover={{
          scale: 1.01,
          y: -1,
          boxShadow: `0 0 15px rgba(${glowRgb}, 0.2), inset 0 0 8px rgba(255,255,255,0.05)`,
        }}
        transition={{ type: "spring", stiffness: 340, damping: 24 }}
        className="flex items-center gap-0.5 h-10 rounded-full p-2! relative"
        style={pillStyle}
        ref={menuRef}
      >
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleFullscreen}
          className={iconButtonClass}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={iconButtonClass}
        >
          <MoreVertical className="w-4 h-4" />
        </motion.button>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -15, filter: "blur(12px)", rotateX: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)", rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10, filter: "blur(10px)", rotateX: -10 }}
              transition={{ type: "spring", stiffness: 450, damping: 25, mass: 1 }}
              className="absolute right-0 top-full mt-3 w-48 rounded-2xl p-2 flex flex-col gap-1 z-50 pointer-events-auto"
              style={{
                background: "rgba(14, 14, 16, 0.75)",
                border: "1px solid rgba(203, 166, 247, 0.3)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 0 15px rgba(203, 166, 247, 0.1)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                transformOrigin: "top right",
              }}
            >
              {["Settings", "Extensions", "History", "Downloads"].map((item, i) => (
                <motion.button
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: i * 0.05 + 0.1,
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  }}
                  whileHover={{
                    scale: 1.02,
                    x: 4,
                    background: "rgba(203, 166, 247, 0.15)",
                    boxShadow: "inset 0 0 8px rgba(203, 166, 247, 0.2)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-2 text-sm text-left text-white/80 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  {item}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
};
