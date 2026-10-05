import { expect, test } from 'vitest';
import { base32Encode, base32Decode } from '../../src/runtime/codec';
import { proxyRuntimeSource } from '../../srv/vite/runtime-config';
import { runInNewContext } from 'node:vm';
test('UTF-8 URLs round trip after independent serialization', () => {
	const encode = new Function(`return (${base32Encode.toString()})`)();
	const decode = new Function(`return (${base32Decode.toString()})`)();
	for (const url of [
		'',
		'https://test/雪/😀?q=a%20b&x=é#fragment',
		'https://test/?a=1&a=2#?'
	]) {
		expect(decode(encode(url))).toBe(url);
		expect(encode(url)).toMatch(/^[A-Z2-7]*$/);
	}
	expect(() => decode('!')).toThrow();
});
test('page and worker share emitted prefix and codec', () => {
	const page: any = { TextEncoder, TextDecoder },
		worker: any = { TextEncoder, TextDecoder };
	runInNewContext(proxyRuntimeSource(), page);
	runInNewContext(proxyRuntimeSource(), worker);
	expect(page.__SPACE_PROXY_CONFIG__.prefix).toBe('/s/res/');
	const url = 'https://test/é?q=1#two';
	expect(
		worker.__SPACE_PROXY_CONFIG__.codec.decode(
			page.__SPACE_PROXY_CONFIG__.codec.encode(url)
		)
	).toBe(url);
});

test('emitted proxy runtime carries the deployment build ID into the worker cache namespace', () => {
	const worker: any = { TextEncoder, TextDecoder };
	runInNewContext(proxyRuntimeSource('cache-build-17'), worker);
	expect(worker.__SPACE_PROXY_CONFIG__.buildId).toBe('cache-build-17');
});
