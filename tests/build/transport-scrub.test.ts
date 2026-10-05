import { expect, test } from 'vitest';
import { scrubText } from '../../srv/vite/scrub';
test('transport binding and member references remain coherent after final scrub', () => {
	const text = scrubText(
		'var libcurl={ready:true}; var epoxy={ready:true}; return libcurl.ready && epoxy.ready;',
		{ libcurl: 'changed', epoxy: 'other' }
	);
	expect(new Function(text)()).toBe(true);
});
