import { useState } from 'react';
import { motion } from 'framer-motion';
import {
	ArrowLeft,
	RotateCw,
	ArrowRight,
	Home,
	Maximize2,
	MoreVertical
} from 'lucide-react';

interface TopBarProps {
	onHoverChange?: (hovered: boolean) => void;
	alwaysVisible?: boolean;
}

export const TopBar = ({ onHoverChange, alwaysVisible = false }: TopBarProps) => {
	const [hovered, setHovered] = useState(false);

	const handleHover = (isHovered: boolean) => {
		setHovered(isHovered);
		onHoverChange?.(isHovered);
	};

	const isVisible = alwaysVisible || hovered;

	return (
		<div
			className="fixed top-0 left-0 right-0 h-12 z-40"
			onMouseEnter={() => handleHover(true)}
			onMouseLeave={() => handleHover(false)}
		>
			<motion.header
				initial={{ y: -60, opacity: 0 }}
				animate={{ y: isVisible ? 8 : -60, opacity: isVisible ? 1 : 0 }}
				transition={{ type: 'spring', stiffness: 300, damping: 30 }}
				className="fixed top-0 left-2 right-2 h-8 flex items-center"
			>
				<div className="flex items-center gap-0.5 mx-auto h-8 bg-[#1a1a1a] rounded-full border border-[#2d2d3a]/50 p-2!">
					<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
						<ArrowLeft className="w-4 h-4" />
					</button>
					<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
						<RotateCw className="w-4 h-4" />
					</button>
					<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
						<ArrowRight className="w-4 h-4" />
					</button>
					<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
						<Home className="w-4 h-4" />
					</button>
				</div>
				<div className="flex-1 mx-2!">
					<div className="mx-auto h-8 bg-[#1a1a1a] rounded-full border border-[#2d2d3a]/50" />
				</div>
				<div className="flex items-center gap-0.5 mx-auto h-8 bg-[#1a1a1a] rounded-full border border-[#2d2d3a]/50 p-2!">
					<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
						<Maximize2 className="w-4 h-4" />
					</button>
					<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
						<MoreVertical className="w-4 h-4" />
					</button>
				</div>
			</motion.header>
		</div>
	);
};
