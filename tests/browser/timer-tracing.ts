import type { Page } from '@playwright/test';

export async function traceReadinessTimers(page: Page) {
	await page.addInitScript(() => {
		const set = window.setTimeout as (
			callback: TimerHandler,
			delay?: number,
			...args: any[]
		) => number;
		const clear = window.clearTimeout as (id?: number) => void;
		const timers = new Set<number>();
		const record = (event: string, details: object) =>
			console.debug(
				'SPACE_PROTOCOL_TRACE ' +
					JSON.stringify({
						event,
						time: performance.now(),
						origin: performance.timeOrigin,
						document: location.href,
						...details
					})
			);
		window.setTimeout = function (
			this: Window,
			callback: TimerHandler,
			delay?: number,
			...args: any[]
		) {
			if (delay !== 1000 || typeof callback !== 'function')
				return set.call(this, callback, delay, ...args);
			const stack = new Error().stack;
			const id = set.call(
				this,
				function (this: unknown, ...callbackArgs: any[]) {
					timers.delete(id);
					record('timer-fire', { id, delay, stack });
					return callback.apply(this, callbackArgs);
				},
				delay,
				...args
			);
			timers.add(id);
			record('timer-arm', { id, delay, stack });
			return id;
		} as typeof window.setTimeout;
		window.clearTimeout = function (this: Window, id?: number) {
			if (id !== undefined && timers.delete(id))
				record('timer-clear', { id });
			return clear.call(this, id);
		} as typeof window.clearTimeout;
	});
}
