import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { readSetting, writeSetting } from "../hooks/useLocalStorage";

interface IntroSplashProps {
  progress: number;
  onComplete: () => void;
}

export const IntroSplash = ({ progress, onComplete }: IntroSplashProps) => {
  const [fading, setFading] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);

  useEffect(() => {
    readSetting("hasSeenIntro", false).then((seen) => {
      setHasSeenIntro(seen);
    });
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!fading && (
        <motion.div
          key="intro-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 20,
              bottom: "25px",
              overflow: "hidden",
              zIndex: 9999,
              pointerEvents: "auto",
            }}
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: hasSeenIntro ? 0.5 : 0.35 }}
              whileHover={{
                opacity: 1,
                scale: 1.05,
                boxShadow: "0 0 10px rgba(255,255,255,0.2)",
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={() => {
                writeSetting("hasSeenIntro", true);
                setFading(true);
                onComplete();
              }}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                padding: "6px 16px",
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: 13,
                cursor: "pointer",
                backdropFilter: "blur(8px)",
                letterSpacing: "0.02em",
              }}
            >
              skip
            </motion.button>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 5,
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
              zIndex: 9999,
              filter: "blur(2px)",
            }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress }}
              transition={{ duration: 0.15, ease: "linear" }}
              className="z-9999"
              style={{
                height: "100%",
                width: "100%",
                transformOrigin: "left center",
                background: "linear-gradient(90deg, rgba(139,92,246,0.6), rgba(167,139,250,0.8))",
                boxShadow: "0 0 12px rgba(139,92,246,0.4)",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
