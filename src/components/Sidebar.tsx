import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Gamepad2,
  LayoutGrid,
  MonitorPlay,
  History,
  Settings,
  Moon,
} from 'lucide-react';

const navItems = [
  { id: 'home', icon: Flame },
  { id: 'games', icon: Gamepad2 },
  { id: 'apps', icon: LayoutGrid },
  { id: 'movies', icon: MonitorPlay },
  { id: 'history', icon: History },
  { id: 'settings', icon: Settings },
  { id: 'theme', icon: Moon },
];

interface SidebarProps {
  activeItem: string;
  onItemClick: (id: string) => void;
}

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="fixed left-0 top-0 h-full w-16 z-50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        className="fixed left-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-gradient-to-b from-transparent via-violet-500 to-transparent rounded-full"
        animate={{ opacity: hovered ? 0 : 0.6 }}
      />

      <motion.nav
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: hovered ? 12 : -60, opacity: hovered ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-1/2 -translate-y-1/2"
      >
        <div className="flex flex-col items-center gap-1 p-2 bg-[#13131a]/90 backdrop-blur-xl rounded-2xl border border-[#2d2d3a]/50">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <div key={item.id}>
                {index === 1 && <div className="w-6 h-px bg-[#2d2d3a] mx-auto my-1" />}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onItemClick(item.id)}
                  className={`relative p-2.5 rounded-xl transition-colors duration-200 ${isActive ? 'text-violet-400' : 'text-gray-500 hover:text-white'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute inset-0 bg-violet-500/20 rounded-xl"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon className="w-5 h-5 relative z-10" />
                </motion.button>
                {index === 5 && <div className="w-6 h-px bg-[#2d2d3a] mx-auto my-1" />}
              </div>
            );
          })}
          <div className="w-6 h-px bg-[#2d2d3a] mx-auto my-1" />
          <div className="flex flex-col gap-1 py-1">
            <button className="w-6 h-6 rounded text-xs bg-[#1a1a24] text-white flex items-center justify-center">1</button>
            <button className="w-6 h-6 rounded text-xs text-gray-500 hover:text-white flex items-center justify-center">2</button>
            <div className="w-2 h-2 rounded-full bg-violet-500 mx-auto mt-1" />
          </div>
        </div>
      </motion.nav>
    </div>
  );
}
