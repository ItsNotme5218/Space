/** Called by the mounted React shell, after runtime selection. Not a capability. */
export function reportSvgReady(win: Window): void {
	const match = win.location.hash
		.match(/(?:^#|&)space-svg-request=([^&]+)/g)
		?.at(-1);
	if (!match || win.parent === win) return;
	const requestId = new URLSearchParams(match.replace(/^[#&]/, '')).get(
		'space-svg-request'
	);
	if (requestId)
		win.parent.postMessage({ type: 'space-svg-ready', requestId }, '*');
}
