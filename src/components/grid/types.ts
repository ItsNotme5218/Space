export interface GridItem {
	id: string;
	title: string;
	url?: string;
	image?: string;
	subtitle?: string;
	categories?: string[];
	sourceLabel?: string;
	source?: 'default' | 'saved';
}

export interface GridConfig {
	cols: number;
	rows: number;
	staggerDelay: number;
}

export const defaultGridConfig: GridConfig = {
	cols: 6,
	rows: 6,
	staggerDelay: 0.03
};
