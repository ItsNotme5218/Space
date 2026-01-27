export interface GridItem {
	id: number;
	title: string;
}

export interface GridConfig {
	cols: number;
	rows: number;
	staggerDelay: number;
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
	cols: 4,
	rows: 5,
	staggerDelay: 0.1
};
