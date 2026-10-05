// Read the Playwright JSON reporter, including body-only success attachments.
import { readFile } from 'node:fs/promises';
const report = JSON.parse(await readFile(process.argv[2], 'utf8'));
const summaries = [];
function visit(suite) {
	for (const spec of suite.specs || [])
		for (const test of spec.tests)
			for (const result of test.results) {
				const attachment = result.attachments.find(
					a => a.name === 'protocol-boundaries'
				);
				if (!attachment) continue;
				const events = JSON.parse(
					attachment.body
						? Buffer.from(attachment.body, 'base64').toString()
						: awaitBody(attachment)
				);
				const checks = new Map();
				for (const e of events) {
					const m = e.message;
					if (
						!m ||
						!['check', 'ready', 'unavailable'].includes(m.type)
					)
						continue;
					const key = `${e.origin}/${m.sessionId}/${m.requestId}`;
					if (!checks.has(key))
						checks.set(key, {
							requestId: m.requestId,
							sessionId: m.sessionId,
							origin: e.origin,
							document: e.document,
							events: []
						});
					checks.get(key).events.push({
						event: e.event,
						type: m.type,
						time: e.time,
						state: e.state,
						mode: e.mode,
						stack: e.stack
					});
				}
				const correlations = [...checks.values()].map(c => {
					const check = c.events.find(
						e => e.type === 'check' && e.event === 'send'
					);
					const reply = c.events.find(
						e => e.type !== 'check' && e.event === 'send'
					);
					const received = c.events.find(
						e => e.type !== 'check' && e.event === 'receive'
					);
					return {
						...c,
						replyMs:
							check && reply ? reply.time - check.time : null,
						receivedMs:
							check && received
								? received.time - check.time
								: null
					};
				});
				summaries.push({
					title: spec.title,
					status: result.status,
					errors: result.errors,
					correlations,
					longtasks: events.filter(e => e.event === 'longtask'),
					observerWork: events.filter(
						e => e.event === 'observer-work'
					),
					frameWork: events.filter(e => e.event === 'frame-work'),
					timers: events.filter(e => e.event.startsWith('timer-')),
					lifecycle: events.filter(e =>
						['pagehide', 'pageshow'].includes(e.event)
					),
					unavailable: events.filter(e => e.mode === 'unavailable')
				});
			}
	for (const child of suite.suites || []) visit(child);
}
function awaitBody(attachment) {
	throw new Error(`Expected body attachment, got ${attachment.path}`);
}
for (const suite of report.suites) visit(suite);
console.log(JSON.stringify(summaries, null, 2));
