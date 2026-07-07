export interface GridItem {
	id: string;
	title: string;
	url?: string;
	image?: string;
	subtitle?: string;
	description?: string;
	category?: string;
	source?: 'default' | 'saved';
	/** Proxy-support confidence 0-100. Undefined for manually added apps (N/A). */
	confidence?: number;
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
