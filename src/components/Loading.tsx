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
					borderTopColor: 'var(--color-primary)',
					borderRightColor: 'var(--color-border)'
				}}
			/>
		</div>
	);
};
