import {
	ArrowLeft,
	RotateCw,
	ArrowRight,
	Home,
	Maximize2,
	MoreVertical
} from 'lucide-react';

export const TopBar = () => {
	return (
		<header className="fixed top-0 left-2 right-2 h-10 flex items-center z-40 mt-2 gap-2">
			<div
				className="flex items-center gap-0.5 h-10 rounded-full p-2!"
				style={{
					background: 'rgba(14, 14, 16, 0.65)',
					border: '1px solid rgba(45, 45, 58, 0.5)',
					boxShadow:
						'0 0 4px 1px rgba(255, 255, 255, 0.05), 0 0 10px 1px rgba(27, 27, 27, 0.5) inset',
					backdropFilter: 'blur(4px)',
					WebkitBackdropFilter: 'blur(4px)',
				}}
			>
				<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
					<ArrowLeft className="w-4 h-4" />
				</button>
				<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
					<RotateCw className="w-4 h-4" />
				</button>
				<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
					<ArrowRight className="w-4 h-4" />
				</button>
				<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
					<Home className="w-4 h-4" />
				</button>
			</div>
			<div
				className="flex-1 h-10 rounded-full"
				style={{
					background: 'rgba(14, 14, 16, 0.65)',
					border: '1px solid rgba(45, 45, 58, 0.5)',
					boxShadow:
						'0 0 4px 1px rgba(255, 255, 255, 0.05), 0 0 10px 1px rgba(27, 27, 27, 0.5) inset',
					backdropFilter: 'blur(4px)',
					WebkitBackdropFilter: 'blur(4px)',
				}}
			/>
			<div
				className="flex items-center gap-0.5 h-10 rounded-full p-2!"
				style={{
					background: 'rgba(14, 14, 16, 0.65)',
					border: '1px solid rgba(45, 45, 58, 0.5)',
					boxShadow:
						'0 0 4px 1px rgba(255, 255, 255, 0.05), 0 0 10px 1px rgba(27, 27, 27, 0.5) inset',
					backdropFilter: 'blur(4px)',
					WebkitBackdropFilter: 'blur(4px)',
				}}
			>
				<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
					<Maximize2 className="w-4 h-4" />
				</button>
				<button className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
					<MoreVertical className="w-4 h-4" />
				</button>
			</div>
		</header>
	);
};
