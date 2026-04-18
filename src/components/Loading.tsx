import React from 'react';
import { motion } from 'framer-motion';

export const Loading: React.FC = () => {
	return (
		<div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none z-50">
			<motion.div
				animate={{
					scale: [1, 1.1, 1],
					opacity: [0.6, 1, 0.6],
					rotate: [0, 180, 360]
				}}
				transition={{
					duration: 3,
					ease: 'easeInOut',
					times: [0, 0.5, 1],
					repeat: Infinity
				}}
				className="w-14 h-14 rounded-full border-[3px] border-transparent"
				style={{
					borderTopColor: 'rgba(139, 92, 246, 0.9)',
					borderRightColor: 'rgba(203, 166, 247, 0.6)',
					boxShadow:
						'0 0 20px 2px rgba(139, 92, 246, 0.3), inset 0 0 10px rgba(203, 166, 247, 0.2)'
				}}
			/>
		</div>
	);
};
