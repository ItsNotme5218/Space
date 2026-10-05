// No closure dependencies: controllers serialize these functions into workers.
export function base32Encode(url: string): string {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = 0,
		value = 0,
		output = '';
	for (const byte of new TextEncoder().encode(url)) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			output += alphabet[(value >>> bits) & 31];
		}
		value &= (1 << bits) - 1;
	}
	if (bits) output += alphabet[(value << (5 - bits)) & 31];
	return output;
}
export function base32Decode(encoded: string): string {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = 0,
		value = 0;
	const bytes: number[] = [];
	for (const char of encoded) {
		const digit = alphabet.indexOf(char);
		if (digit < 0) throw new Error('Invalid Base32 URL');
		value = (value << 5) | digit;
		bits += 5;
		if (bits >= 8) {
			bits -= 8;
			bytes.push((value >>> bits) & 255);
		}
		value &= (1 << bits) - 1;
	}
	if (value || [1, 3, 6].includes(encoded.length % 8))
		throw new Error('Invalid Base32 padding');
	return new TextDecoder('utf-8', { fatal: true }).decode(
		new Uint8Array(bytes)
	);
}
export function createProxyConfig() {
	return {
		prefix: '/s/res/',
		scramjetPath: '/s/scramjet.js',
		wasmPath: '/s/scramjet.wasm',
		injectPath: '/c/controller.inject.js',
		codec: { encode: base32Encode, decode: base32Decode }
	};
}
