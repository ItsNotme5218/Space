export function initialView(search: string): '/' | '/games' {
	const values = new URLSearchParams(search).getAll('view');
	return values.length === 1 && values[0] === 'games' ? '/games' : '/';
}
