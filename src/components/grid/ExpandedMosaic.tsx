import { motion } from "framer-motion";
import { Star } from "lucide-react";

export const ExpandedMosaic = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="absolute inset-0 flex gap-3"
    >
      <div className="flex flex-col gap-3 w-1/2">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: [0, -3, 0] }}
          transition={{
            opacity: { delay: 0.35 },
            scale: { delay: 0.35, type: "spring" },
            y: { repeat: Infinity, duration: 4, ease: "easeInOut" },
          }}
          className="flex-[1.2] rounded-2xl"
          style={{
            background: "rgba(20, 10, 30, 0.45)",
            border: "1px solid rgba(203, 166, 247, 0.3)",
            boxShadow: "0 0 20px 2px rgba(139, 92, 246, 0.15)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: [0, 3, 0] }}
          transition={{
            opacity: { delay: 0.45 },
            scale: { delay: 0.45, type: "spring" },
            y: { repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 },
          }}
          className="flex-1 rounded-2xl p-3 grid grid-cols-2 grid-rows-2 gap-2"
          style={{
            background: "rgba(20, 10, 30, 0.45)",
            boxShadow:
              "0px 0px 12px rgba(139, 92, 246, 0.2), 0px 0px 8px 2px rgba(203, 166, 247, 0.1) inset",
            border: "1px solid rgba(203, 166, 247, 0.3)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-white/60 text-sm">stat</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="flex flex-col gap-3 w-1/2">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="h-16 rounded-2xl flex items-center justify-center px-4"
          style={{
            background: "rgba(20, 10, 30, 0.45)",
            boxShadow:
              "0px 0px 12px rgba(139, 92, 246, 0.2), 0px 0px 8px 2px rgba(203, 166, 247, 0.1) inset",
            border: "1px solid rgba(203, 166, 247, 0.3)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="h-5 w-3/4 rounded-md"
            style={{ background: "rgba(255, 255, 255, 0.3)" }}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="flex-1 rounded-2xl flex items-start justify-start p-4"
          style={{
            background: "rgba(20, 10, 30, 0.45)",
            boxShadow:
              "0px 0px 12px rgba(139, 92, 246, 0.2), 0px 0px 8px 2px rgba(203, 166, 247, 0.1) inset",
            border: "1px solid rgba(203, 166, 247, 0.3)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <p className="text-white/50 text-sm leading-relaxed">No description available.</p>
        </motion.div>
        <div className="flex gap-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{
              scale: 1.05,
              boxShadow: "0px 0px 15px rgba(203, 166, 247, 0.8), 0px 0px 10px 3px #CBA6F7 inset",
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ opacity: { delay: 0.55 }, scale: { type: "spring" } }}
            className="h-14 rounded-2xl flex items-center justify-center grow cursor-pointer font-medium"
            style={{
              background: "rgba(203, 166, 247, 0.15)",
              boxShadow:
                "0px 0px 8px rgba(203, 166, 247, 0.40), 0px 0px 8px 2px rgba(203, 166, 247, 0.3) inset",
              border: "1px #CBA6F7 solid",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            Launch Game
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{
              scale: 1.1,
              rotate: 180,
              boxShadow:
                "0px 0px 15px rgba(139, 92, 246, 0.6), 0px 0px 10px 3px rgba(139, 92, 246, 0.4) inset",
            }}
            whileTap={{ scale: 0.9 }}
            transition={{
              opacity: { delay: 0.6 },
              scale: { type: "spring" },
              rotate: { type: "spring" },
            }}
            className="h-14 w-14 rounded-2xl flex items-center justify-center cursor-pointer text-violet-300 hover:text-white"
            style={{
              background: "rgba(20, 10, 30, 0.45)",
              boxShadow:
                "0px 0px 8px rgba(139, 92, 246, 0.3), 0px 0px 8px 2px rgba(139, 92, 246, 0.3) inset",
              border: "1px solid rgba(139, 92, 246, 0.5)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <Star className="h-6 w-6" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
