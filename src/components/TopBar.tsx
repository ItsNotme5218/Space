import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  RotateCw,
  ArrowRight,
  Home,
  Maximize2,
  MoreVertical,
} from 'lucide-react';

export function TopBar() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-8 z-40"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: hovered ? 0 : -50, opacity: hovered ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 h-10 bg-[#101010] border-b border-[#2d2d3a]/50 flex items-center px-4"
      >
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <RotateCw className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <Home className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 mx-4">
          <div className="max-w-2xl mx-auto h-7 bg-[#1a1a1a] rounded-full border border-[#2d2d3a]/50" />
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </motion.header>
    </div>
  );
}
