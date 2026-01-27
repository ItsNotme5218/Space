import { motion } from 'framer-motion';

interface CollapsedCardProps {
	isHovered: boolean;
	itemName?: string;
}

export const CollapsedCard = ({ isHovered, itemName }: CollapsedCardProps) => {
	return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 0 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    y: isHovered ? 12 : 0
                }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 right-0 top-full text-center pointer-events-none"
            >
            </motion.div>
            <motion.span
                initial={{ opacity: 0, y: 165 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    y: isHovered ? 145 : 165
                }}
                className="text-md font-medium text-white/90 drop-shadow-md">
                    {itemName || 'uhhhsdafh'}
            </motion.span>
        </>
	);
};
