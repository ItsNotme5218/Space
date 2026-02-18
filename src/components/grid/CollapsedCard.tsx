import { motion } from 'framer-motion';

interface CollapsedCardProps {
	isHovered: boolean;
	itemName?: string;
}

export const CollapsedCard = ({ isHovered, itemName }: CollapsedCardProps) => {
	return (
		<motion.span
			initial={{ opacity: 0, y: 0 }}
			animate={{
				opacity: isHovered ? 1 : 0,
				y: isHovered ? -24 : 0
			}}
			transition={{ duration: 0.2 }}
			className="absolute top-full text-md font-medium text-white/90 drop-shadow-md pointer-events-none text-center w-full"
		>
			{itemName || ''}
		</motion.span>
	);
};
