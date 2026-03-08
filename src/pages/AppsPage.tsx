import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ItemGrid, type GridItem } from '../components/grid';

const generateMockApps = (count: number): GridItem[] =>
	Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		title: `App ${i + 1}`
	}));

export const AppsPage = () => {
	const apps = useMemo(() => generateMockApps(60), []);

	return (
		<ItemGrid
			items={apps}
			header={
				<motion.div
					initial={{ opacity: 0, y: -8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.22 }}
				>
					<h1 className="text-2xl font-bold text-white/92 tracking-tight">
						Apps
					</h1>
				</motion.div>
			}
		/>
	);
};
