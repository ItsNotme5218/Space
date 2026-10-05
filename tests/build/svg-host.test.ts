import { expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

async function generator() {
	expect(
		existsSync('srv/vite/svg-host.ts'),
		'Space-owned SVG generator exists'
	).toBe(true);
	return (await import('../../srv/vite/svg-host')).createSvgHost;
}

async function embeddedGenerator() {
	return (await import('../../srv/vite/svg-host')).createEmbeddedSvg;
}

async function launch(
	href = 'https://space.example/mount/index.svg?view=games&q=a%26b#route?x=1'
) {
	const svg = (await generator())();
	const script = svg.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)![1];
	const listeners = new Map<string, (event: any) => void>();
	const child = {};
	const frame = {
		setAttribute: vi.fn(),
		addEventListener: vi.fn(),
		get contentWindow() {
			return child;
		},
		get contentDocument(): never {
			throw Error('No child globals');
		}
	};
	const status = { textContent: '', style: { display: 'flex' } };
	const timeout = vi.fn();
	const clear = vi.fn();
	vm.runInNewContext(script, {
		document: {
			getElementById: (id: string) =>
				id === 'app-frame' ? frame : status
		},
		window: {
			location: new URL(href),
			addEventListener: (name: string, fn: any) =>
				listeners.set(name, fn),
			removeEventListener: vi.fn()
		},
		URL,
		URLSearchParams,
		crypto: { randomUUID: () => 'fresh-id' },
		setTimeout: timeout,
		clearTimeout: clear
	});
	const src = new URL(frame.setAttribute.mock.calls[0][1]);
	return {
		svg,
		frame,
		status,
		timeout,
		clear,
		src,
		message: (source: unknown, data: unknown) =>
			listeners.get('message')!({ source, data }),
		child
	};
}

it('builds an SVG with the app HTML embedded in its foreignObject', async () => {
	const svg = (await embeddedGenerator())(
		'<html><head><title>Space app</title></head><body><main>Space app content</main></body></html>'
	);
	const parsed = spawnSync(
		'python3',
		[
			'-c',
			'import sys,xml.etree.ElementTree as E;r=E.fromstring(sys.stdin.read());assert r.find(".//{http://www.w3.org/1999/xhtml}iframe") is None'
		],
		{ input: svg }
	);
	expect(parsed.status, parsed.stderr.toString()).toBe(0);
	expect(svg).toContain('Space app content');
	expect(svg).toContain('<body');
	expect(svg).not.toContain('<iframe');
	expect(svg).toMatch(/<foreignObject[\s\S]*<\/foreignObject>/);
	expect(svg).toMatch(/<svg[^>]*width="100%"[^>]*height="100%"/);
	expect(svg).not.toMatch(
		/viewBox|createRoot|main\.tsx|contentDocument|setInterval/
	);
});

it('resolves relative HTML at mount and preserves query and fragment state', async () => {
	const { src } = await launch();
	expect(src.pathname).toBe('/mount/index.html');
	expect(src.search).toBe('?view=games&q=a%26b');
	expect(src.hash).toContain('route?x=1');
	expect(src.hash).toContain('space-svg-request=fresh-id');
});

it('preserves repeated ordinary query parameters and their encoding', async () => {
	const { src } = await launch(
		'https://space.example/mount/index.svg?view=games&tag=a&tag=b&q=a%20b#anchor'
	);
	expect(src.search).toBe('?view=games&tag=a&tag=b&q=a%20b');
	expect(src.hash).toContain('anchor&space-svg-request=');
});

it('custom entry is resolved relatively and safely serialized as XML CDATA', async () => {
	const svg = (await generator())('./nested/index.html?text=</script>]]>&');
	const parsed = spawnSync(
		'python3',
		[
			'-c',
			'import sys,xml.etree.ElementTree as E;E.fromstring(sys.stdin.read())'
		],
		{ input: svg }
	);
	expect(parsed.status, parsed.stderr.toString()).toBe(0);
});

it('ignores loads/spoofs and accepts only own child with matching request ID', async () => {
	const p = await launch();
	const ready = { type: 'space-svg-ready', requestId: 'fresh-id' };
	p.message({}, ready);
	p.message(p.child, { ...ready, requestId: 'stale' });
	p.message(p.child, { ...ready, type: 'capabilities' });
	expect(p.status.style.display).toBe('flex');
	expect(p.clear).not.toHaveBeenCalled();
	p.message(p.child, ready);
	expect(p.status.style.display).toBe('none');
	expect(p.clear).toHaveBeenCalledOnce();
});

it('fails at exactly 15000 ms and cannot be revived by a late ready message', async () => {
	const p = await launch();
	expect(p.timeout.mock.calls[0][1]).toBe(15000);
	p.timeout.mock.calls[0][0]();
	expect(p.status.textContent).toMatch(/Unable to load Space/);
	p.message(p.child, { type: 'space-svg-ready', requestId: 'fresh-id' });
	expect(p.status.style.display).toBe('flex');
});

it('child reporter sends correlated application readiness, never capabilities', async () => {
	expect(
		existsSync('src/runtime/svg-ready.ts'),
		'mounted application readiness reporter exists'
	).toBe(true);
	const { reportSvgReady } = await import('../../src/runtime/svg-ready');
	const postMessage = vi.fn();
	const win = {
		location: { hash: '#route?x=1&space-svg-request=abc' },
		parent: { postMessage }
	};
	reportSvgReady(win as unknown as Window);
	expect(postMessage).toHaveBeenCalledExactlyOnceWith(
		{ type: 'space-svg-ready', requestId: 'abc' },
		'*'
	);
	postMessage.mockClear();
	win.location.hash = '#route';
	reportSvgReady(win as unknown as Window);
	expect(postMessage).not.toHaveBeenCalled();
});
