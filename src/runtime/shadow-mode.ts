export function shadowMode(isDevelopment: boolean): 'open' | 'closed' {
	return isDevelopment ? 'open' : 'closed';
}
