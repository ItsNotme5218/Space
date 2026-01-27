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
  ArrowLeft,
  RotateCw,
  ArrowRight,
  Home,
  Maximize2,
  MoreVertical,
} from 'lucide-react';
import './App.css';

const navItems = [
  { id: 'home', icon: Flame },
  { id: 'games', icon: Gamepad2 },
  { id: 'apps', icon: LayoutGrid },
  { id: 'movies', icon: MonitorPlay },
  { id: 'history', icon: History },
  { id: 'settings', icon: Settings },
  { id: 'theme', icon: Moon },
];

function App() {
  const [activeItem, setActiveItem] = useState('home');
  const [sideHovered, setSideHovered] = useState(false);
  const [topHovered, setTopHovered] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px]" />
      </div>

      <div
        className="fixed left-0 top-0 h-full w-16 z-50"
        onMouseEnter={() => setSideHovered(true)}
        onMouseLeave={() => setSideHovered(false)}
      >
        <motion.div
          className="fixed left-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-gradient-to-b from-transparent via-violet-500 to-transparent rounded-full opacity-60"
          animate={{ opacity: sideHovered ? 0 : 0.6 }}
        />

        <motion.nav
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: sideHovered ? 12 : -60, opacity: sideHovered ? 1 : 0 }}
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
                    onClick={() => setActiveItem(item.id)}
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

      <div
        className="fixed top-0 left-0 right-0 h-8 z-40"
        onMouseEnter={() => setTopHovered(true)}
        onMouseLeave={() => setTopHovered(false)}
      >
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: topHovered ? 0 : -50, opacity: topHovered ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 h-10 bg-[#0a0a0f] border-b border-[#2d2d3a]/50 flex items-center px-4"
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
            <div className="max-w-2xl mx-auto h-7 bg-[#13131a] rounded-full border border-[#2d2d3a]/50" />
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

      <main className="min-h-screen" />
    </div>
  );
}

export default App;
