import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import './App.css';

const App = () => {
	const [activeItem, setActiveItem] = useState('home');
	const [topBarHovered, setTopBarHovered] = useState(false);
	const [sidebarHovered, setSidebarHovered] = useState(false);

	return (
		<div className="h-screen bg-[#101010] flex flex-col overflow-hidden">
			<motion.div
				animate={{ height: topBarHovered ? 40 : 0 }}
				transition={{ type: 'spring', stiffness: 300, damping: 30 }}
				className="shrink-0"
			/>
			<div className="flex-1 flex overflow-hidden">
				<motion.div
					animate={{ width: sidebarHovered ? 72 : 0 }}
					transition={{ type: 'spring', stiffness: 300, damping: 30 }}
					className="shrink-0"
				/>
				<main className="flex-1 p-2!">
					<iframe
						src="https://example.com"
						className="w-full h-full rounded-2xl border border-[#2d2d3a]/50"
						style={{ background: '#1a1a1a' }}
					/>
				</main>
			</div>
			<Sidebar
				activeItem={activeItem}
				onItemClick={setActiveItem}
				onHoverChange={setSidebarHovered}
			/>
			<TopBar onHoverChange={setTopBarHovered} />
		</div>
	);
};

export default App;
