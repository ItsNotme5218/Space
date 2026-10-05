import { expect, test } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { spaceScrub, scrubText } from '../../srv/vite/scrub';
test('analytics tag ID and gtag literals survive scrubbing', () => {
	const source = `window.dataLayer=window.dataLayer||[];window.gtag('config','G-3DTW1KTNCF');tag.src='/api/tag.js';tag.src='https://www.googletagmanager.com/gtag/js?id=G-3DTW1KTNCF';`;
	const output = scrubText(source, {
		scramjet: 'abcdefgh',
		ultraviolet: 'abcdefghijk',
		libcurl: 'abcdefg',
		epoxy: 'abcde',
		scram: 'abcde',
		bare: 'abcd'
	});
	expect(output).toContain('G-3DTW1KTNCF');
	expect(output).toContain('googletagmanager');
	expect(output).toContain('dataLayer');
});
test('preserves the boolean scramitize flag consumed by WASM', () => {
	const source =
		'const config={flags:{scramitize:false}}; return config.flags;';
	const output = scrubText(source, { scram: 'abcde' });
	expect(new Function(output)()).toEqual({ scramitize: false });
});
test.each(["'", '"', '`'])(
	'keeps settings labels and lookup keys intact with %s strings',
	quote => {
		const source = `const proxies={Scramjet:${quote}sj${quote}};
	const transports={Libcurl:${quote}libcurl${quote},Epoxy:${quote}epoxy${quote}};
	const labels=[${quote}Scramjet${quote},${quote}Libcurl${quote},${quote}Epoxy${quote}];
	const paths=[${quote}/s/scramjet.js${quote},${quote}/l/libcurl.js${quote},${quote}/ep/epoxy.js${quote}];
	return {labels, values:[proxies[labels[0]],transports[labels[1]],transports[labels[2]]],paths};`;
		const output = scrubText(source, {
			scramjet: 'abcdefgh',
			libcurl: 'abcdefg',
			epoxy: 'abcde'
		});
		expect(new Function(output)()).toEqual({
			labels: ['Scramjet', 'Libcurl', 'Epoxy'],
			values: ['sj', 'libcurl', 'epoxy'],
			paths: ['/s/abcdefgh.js', '/l/abcdefg.js', '/ep/abcde.js']
		});
	}
);
test('runtime public property names stay stable while their asset paths change', () => {
	expect(
		scrubText('const config={scramjetPath:"/s/scramjet.js"}', {
			scramjet: 'abcdefgh',
			ultraviolet: 'abcdefghijk',
			libcurl: 'abcdefg',
			epoxy: 'abcde',
			scram: 'abcde',
			bare: 'abcd'
		})
	).toContain('scramjetPath:"/s/abcdefgh.js"');
});
test('saved transport values still address module keys and fallback properties', () => {
	const vocab = {
		scramjet: 'abcdefgh',
		ultraviolet: 'abcdefghijk',
		libcurl: 'abcdefg',
		epoxy: 'abcde',
		scram: 'abcde',
		bare: 'abcd'
	};
	const source = `const modules={libcurl:'/l/libcurl.js',epoxy:'/ep/epoxy.js'}; const saved='libcurl'; modules[saved]||modules.libcurl;`;
	const result = scrubText(source, vocab);
	expect(result).toContain('modules.libcurl');
	expect(result).toContain("libcurl:'/l/abcdefg.js'");
	expect(result).toContain("epoxy:'/ep/abcde.js'");
});
test('dynamic external URL expressions rename identifiers but not remote path literals', () => {
	const result = scrubText(
		'const bareHost="test"; const url=`https://${bareHost}/scramjet.js`;',
		{
			scramjet: 'abcdefgh',
			ultraviolet: 'abcdefghijk',
			libcurl: 'abcdefg',
			epoxy: 'abcde',
			scram: 'abcde',
			bare: 'abcd'
		}
	);
	expect(result).toContain('https://${abcdHost}/scramjet.js');
});
test('renames local references while protecting remote literals, wire and binary payloads', async () => {
	const dir = await mkdtemp('/tmp/opencode/space-scrub-');
	await mkdir(`${dir}/scramjet`);
	const payload = Buffer.from('bare'.repeat(100)).toString('base64');
	const values = [
		'https://bare.example/scramjet.js',
		'https://epoxy.example',
		'proxy-context-v1',
		'document-fetch',
		'wss://a.nightwisp.me/wisp/',
		payload
	];
	await writeFile(
		`${dir}/main.js`,
		`const scramjet=${JSON.stringify(values)}; import('./scramjet/bare.js');`
	);
	await writeFile(`${dir}/scramjet/bare.js`, 'export const bare=1;');
	const binary = Buffer.from('bare scramjet epoxy');
	await writeFile(`${dir}/picture.png`, binary);
	const result = await spaceScrub(dir, 'test-seed');
	const output = await readFile(`${dir}/main.js`, 'utf8');
	for (const value of values) expect(output).toContain(value);
	expect(output).toContain(
		`./${result.vocabulary.scramjet}/${result.vocabulary.bare}.js`
	);
	expect(await readdir(`${dir}/${result.vocabulary.scramjet}`)).toContain(
		`${result.vocabulary.bare}.js`
	);
	expect(await readFile(`${dir}/picture.png`)).toEqual(binary);
});
