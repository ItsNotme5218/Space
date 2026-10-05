import { describe, expect, it } from 'vitest';
import { isMessage } from '../../src/bridge/protocol';

const base = { protocol: 'proxy-context-v1', version: 1, requestId: 'request' };
describe('wire validation', () => {
	it.each([
		{ ...base, type: 'discover' },
		{
			...base,
			type: 'capabilities',
			sessionId: 'session',
			capabilities: ['nested-iframe-navigation', 'document-fetch']
		},
		...['check', 'ready', 'unavailable'].map(type => ({
			...base,
			type,
			sessionId: 'session'
		}))
	])('accepts a complete envelope: $type', message =>
		expect(isMessage(message)).toBe(true)
	);
	it.each([
		null,
		[],
		{},
		{ ...base, type: 'discover', extra: true },
		{ ...base, type: 'discover', version: 2 },
		{ ...base, type: 'discover', requestId: '' },
		{ ...base, type: 'ready' },
		{ ...base, type: 'ready', sessionId: '' },
		{ ...base, type: { toString: () => 'check' }, sessionId: 'session' },
		{
			...base,
			type: 'capabilities',
			sessionId: 'session',
			capabilities: ['document-fetch']
		},
		{
			...base,
			type: 'capabilities',
			sessionId: 'session',
			capabilities: ['nested-iframe-navigation', 'document-fetch', 1]
		},
		{ ...base, type: 'unknown' }
	])('rejects malformed envelopes %#', message =>
		expect(isMessage(message)).toBe(false)
	);
});
