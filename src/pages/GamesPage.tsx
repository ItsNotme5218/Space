import { useMemo } from 'react';
import { ItemGrid, type GridItem } from '../components/grid';

const generateMockGames = (count: number): GridItem[] =>
	Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		title: `Game ${i + 1}`
	}));

export const GamesPage = () => {
	const games = useMemo(() => generateMockGames(80), []);

	return (
		
	<ItemGrid items={games} />
	
);
};
