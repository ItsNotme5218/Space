import { motion } from 'framer-motion';

interface CollapsedCardProps {
	isHovered: boolean;
}

export const CollapsedCard = ({ isHovered }: CollapsedCardProps) => {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="absolute inset-0 flex flex-col"
		>
			<div className="flex-1" />
			<motion.div
				initial={{ height: 0, opacity: 0 }}
				animate={{
					height: isHovered ? 32 : 0,
					opacity: isHovered ? 1 : 0
				}}
				transition={{ duration: 0.2 }}
				className="px-3 flex items-center"
				style={{ background: 'rgba(20, 10, 30, 0.95)' }}
			>
				<div
					className="h-3 w-16 rounded-sm"
					style={{ background: 'rgba(255, 255, 255, 0.3)' }}
				/>
			</motion.div>
		</motion.div>
	);
};
