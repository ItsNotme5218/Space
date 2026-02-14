import { useMemo } from 'react';
import { ItemGrid, type GridItem } from '../components/grid';
import { PageAnimation } from '@/components/PageTransition';

const generateMockApps = (count: number): GridItem[] =>
	Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		title: `App ${i + 1}`
	}));

export const AppsPage = () => {
	const apps = useMemo(() => generateMockApps(60), []);

	return <PageAnimation>
		<ItemGrid items={apps} />
		</PageAnimation>;
};
