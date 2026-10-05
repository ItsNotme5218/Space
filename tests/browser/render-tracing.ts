import type { Page } from '@playwright/test';

// Attribution only; the native callback and scheduling are left unchanged.
export async function traceRendering(page: Page) {
	await page.addInitScript(() => {
		const NativeObserver = window.MutationObserver;
		let reads = 0,
			writes = 0;
		const computed = window.getComputedStyle;
		window.getComputedStyle = function (...args) {
			reads++;
			return computed.apply(this, args);
		};
		const write = CSSStyleDeclaration.prototype.setProperty;
		CSSStyleDeclaration.prototype.setProperty = function (
			name,
			value,
			priority
		) {
			if (name.startsWith('--space-font-')) writes++;
			return write.call(this, name, value, priority);
		};
		const frame = window.requestAnimationFrame;
		window.requestAnimationFrame = function (callback) {
			const owner = new Error().stack;
			return frame.call(this, time => {
				const start = performance.now(),
					beforeReads = reads,
					beforeWrites = writes;
				try {
					callback(time);
				} finally {
					const duration = performance.now() - start;
					if (duration > 5)
						console.debug(
							'SPACE_PROTOCOL_TRACE ' +
								JSON.stringify({
									event: 'frame-work',
									origin: performance.timeOrigin,
									time: performance.now(),
									document: location.href,
									start,
									duration,
									reads: reads - beforeReads,
									writes: writes - beforeWrites,
									owner
								})
						);
				}
			});
		};
		window.MutationObserver = class extends NativeObserver {
			constructor(callback: MutationCallback) {
				const owner = new Error().stack;
				super((records, observer) => {
					const start = performance.now(),
						beforeReads = reads,
						beforeWrites = writes;
					const mutations = records.slice(0, 6).map(r => ({
						type: r.type,
						attribute: r.attributeName,
						tag: (r.target as Element).tagName,
						style: (r.target as Element).getAttribute?.('style')
					}));
					try {
						callback(records, observer);
					} finally {
						const duration = performance.now() - start;
						if (duration > 5)
							console.debug(
								'SPACE_PROTOCOL_TRACE ' +
									JSON.stringify({
										event: 'observer-work',
										origin: performance.timeOrigin,
										time: performance.now(),
										document: location.href,
										start,
										duration,
										reads: reads - beforeReads,
										writes: writes - beforeWrites,
										records: records.length,
										mutations,
										owner
									})
							);
					}
				});
			}
		};
	});
}
