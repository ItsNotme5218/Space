export interface GridItem {
	id: string;
	title: string;
}

export interface GridConfig {
	cols: number;
	rows: number;
	staggerDelay: number;
}

export const defaultGridConfig: GridConfig = {
	cols: 4,
	rows: 5,
	staggerDelay: 0.1
};
