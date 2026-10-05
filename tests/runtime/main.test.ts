import { afterEach, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';

const calls = vi.hoisted(() => ({
	select: vi.fn(),
	standalone: vi.fn(),
	render: vi.fn(),
	font: vi.fn(),
	reportSvg: vi.fn(),
	effects: [] as Array<() => void>,
	scripts: [] as string[],
	runtime: {
		mode: 'delegated',
		ready: Promise.resolve(),
		navigate: vi.fn(),
		fetch: vi.fn(),
		dispose: vi.fn()
	}
}));
vi.mock('react', async original => ({
	...(await original<typeof import('react')>()),
	useEffect: (effect: () => void) => calls.effects.push(effect)
}));
vi.mock('../../src/runtime/svg-ready', () => ({
	reportSvgReady: calls.reportSvg
}));
vi.mock('../../src/runtime', () => ({
	selectRuntime: calls.select,
	createStandaloneRuntime: calls.standalone
}));
vi.mock('../../src/App.tsx', () => ({ default: () => null }));
vi.mock('../../srv/vite/font/runtime', () => ({
	installFontRuntime: calls.font
}));
vi.mock('../../src/components/Loading.tsx', () => ({ Loading: () => null }));
vi.mock('react-dom/client', () => ({
	createRoot: () => ({ render: calls.render })
}));
vi.mock('../../src/lib/cloak.ts', () => ({
	launchAboutBlank: vi.fn(),
	launchBlob: vi.fn(),
	applyCloak: vi.fn()
}));
vi.mock('../../src/hooks/useLocalStorage', () => ({
	initSettings: async () => {},
	readSetting: async (_key: string, fallback: unknown) => fallback
}));

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.resetModules();
	vi.clearAllMocks();
	calls.scripts.length = 0;
	calls.effects.length = 0;
});
it('actual main entry selects runtime before scripts, passes games initial route and facade to App', async () => {
	const root = { appendChild: vi.fn() };
	const element = () => ({
		style: {},
		dataset: {},
		appendChild: vi.fn(),
		attachShadow: () => root
	});
	const doc = {
		open() {},
		write() {},
		writeln() {},
		close() {},
		getElementById: () => element(),
		createElement: (tag: string) => {
			const el = element();
			if (tag === 'script') calls.scripts.push(tag);
			return el;
		},
		implementation: { createHTMLDocument: () => ({}) },
		head: { querySelector: () => null, appendChild: vi.fn() }
	};
	const w = {
		location: { search: '?view=games' },
		top: {},
		addEventListener: vi.fn()
	};
	vi.stubGlobal('window', w);
	vi.stubGlobal('document', doc);
	calls.select.mockResolvedValue(calls.runtime);
	calls.font.mockResolvedValue({ dispose: vi.fn() });
	await import('../../src/main');
	for (let i = 0; i < 10; i++) await Promise.resolve();
	expect(calls.select).toHaveBeenCalledOnce();
	expect(calls.standalone).not.toHaveBeenCalled();
	expect(calls.scripts).toEqual(['script']);
	expect(doc.head.appendChild).toHaveBeenCalledOnce();
	expect(doc.head.appendChild.mock.calls[0][0].src).toBe(
		'https://www.googletagmanager.com/gtag/js?id=G-3DTW1KTNCF'
	);
	expect(calls.font).toHaveBeenCalledExactlyOnceWith(root);
	expect(calls.select.mock.invocationCallOrder[0]).toBeLessThan(
		calls.font.mock.invocationCallOrder[0]
	);
	expect(w).toHaveProperty('proxy', calls.runtime);
	expect(w).not.toHaveProperty('doc');
	const tree = calls.render.mock.calls[0][0];
	expect(tree.props.initialEntries).toEqual(['/games']);
	expect(
		tree.props.children[1].props.children.props.element.props.runtime
	).toBe(calls.runtime);
	expect(calls.reportSvg).not.toHaveBeenCalled();
	// The render mock does not commit React. Exercise the readiness component's
	// registered effect independently; real commits are covered in Chromium.
	tree.props.children[0].type();
	expect(calls.reportSvg).not.toHaveBeenCalled();
	expect(calls.effects).toHaveLength(1);
	calls.effects[0]();
	expect(calls.reportSvg).toHaveBeenCalledExactlyOnceWith(w);
});

it('standalone preparation loads only the shared Space proxy configuration script', async () => {
	const root = { appendChild: vi.fn() };
	const element = () => ({
		style: {},
		dataset: {} as Record<string, string>,
		appendChild: vi.fn(),
		attachShadow: () => root
	});
	const doc = {
		open() {},
		write() {},
		writeln() {},
		close() {},
		getElementById: () => element(),
		createElement: (tag: string) => {
			const listeners = new Map<string, Array<() => void>>();
			const el = {
				...element(),
				tagName: tag.toUpperCase(),
				src: '',
				addEventListener: (event: string, listener: () => void) => {
					listeners.set(event, [
						...(listeners.get(event) ?? []),
						listener
					]);
				},
				dispatch: (event: string) => {
					for (const listener of listeners.get(event) ?? [])
						listener();
				}
			};
			return el;
		},
		implementation: { createHTMLDocument: () => ({}) },
		head: {
			querySelector: () => null,
			appendChild: vi.fn(
				(script: {
					src: string;
					dispatch: (event: string) => void;
				}) => {
					calls.scripts.push(script.src);
					script.dispatch('load');
				}
			)
		}
	};
	const w = { location: { search: '' }, top: {}, addEventListener: vi.fn() };
	vi.stubGlobal('window', w);
	vi.stubGlobal('document', doc);
	calls.select.mockImplementation(async (_win, createStandalone) =>
		createStandalone()
	);
	calls.standalone.mockImplementation(
		async (prepareScripts: () => Promise<void>) => {
			await prepareScripts();
			return calls.runtime;
		}
	);
	calls.font.mockResolvedValue({ dispose: vi.fn() });

	await import('../../src/main');
	for (let i = 0; i < 10; i++) await Promise.resolve();

	expect(calls.standalone).toHaveBeenCalledOnce();
	expect(calls.scripts).toEqual([
		'https://www.googletagmanager.com/gtag/js?id=G-3DTW1KTNCF',
		'/space-runtime.js'
	]);
	expect(calls.scripts).not.toContain('/u/config.js');
});

it.each(['image/svg+xml', 'text/html'])(
	'keeps %s document writes in their intended container before and after mounting',
	async contentType => {
		vi.stubEnv('DEV', false);
		const svg = contentType === 'image/svg+xml';
		const dom = new JSDOM(
			svg
				? '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><div id="app-host"></div></body></foreignObject></svg>'
				: '<body><div id="app-host"></div></body>',
			{ contentType }
		);
		const doc = dom.window.document;
		const body = doc.querySelector('body')!;
		// Model the shared SVG polyfill already installed before main captures it.
		// Its parsing/insertion implementation is covered by the coordinator's tests.
		const originalWrite = vi.fn(function (
			this: Document,
			...text: string[]
		) {
			expect(this).toBe(doc);
			body.insertAdjacentHTML('beforeend', text.join(''));
		});
		const originalWriteln = vi.fn(function (
			this: Document,
			...text: string[]
		) {
			expect(this).toBe(doc);
			body.insertAdjacentHTML('beforeend', text.join('') + '\n');
		});
		doc.write = originalWrite;
		doc.writeln = originalWriteln;
		if (svg) {
			// SVG bootstrap also supplies HTML element creation for app startup.
			doc.createElement = ((tag: string) =>
				doc.createElementNS(
					'http://www.w3.org/1999/xhtml',
					tag
				)) as typeof doc.createElement;
		}
		const host = doc.getElementById('app-host')!;
		const attachShadow = vi.spyOn(host, 'attachShadow');
		const w = {
			location: { search: '' },
			top: {},
			addEventListener: vi.fn()
		};
		vi.stubGlobal('window', w);
		vi.stubGlobal('document', doc);
		let resume!: (runtime: typeof calls.runtime) => void;
		calls.select.mockImplementation(
			() =>
				new Promise(resolve => {
					resume = resolve;
				})
		);
		calls.font.mockResolvedValue({ dispose: vi.fn() });

		try {
			await import('../../src/main');
			expect(calls.select).toHaveBeenCalledOnce();
			expect(attachShadow).not.toHaveBeenCalled();
			doc.write('<span id="before-write">', 'before</span>');
			doc.writeln('<span id="before-writeln">', 'before line</span>');
			expect(body.querySelector('#before-write')?.textContent).toBe(
				'before'
			);
			expect(
				body.querySelector('#before-writeln')?.nextSibling?.textContent
			).toBe('\n');
			originalWrite.mockClear();
			originalWriteln.mockClear();

			resume(calls.runtime);
			for (let i = 0; i < 10; i++) await Promise.resolve();
			expect(calls.render).toHaveBeenCalledOnce();
			const shadow = attachShadow.mock.results[0].value as ShadowRoot;
			expect(shadow.mode).toBe('closed');
			doc.write('<span id="after-write">', 'after</span>');
			doc.writeln('<span id="after-writeln">', 'after line</span>');

			const target = svg ? body : shadow;
			const other = svg ? shadow : body;
			expect(target.querySelector('#after-write')?.textContent).toBe(
				'after'
			);
			expect(target.querySelector('#after-writeln')?.textContent).toBe(
				'after line'
			);
			expect(
				target.querySelector('#after-writeln')?.nextSibling?.textContent
			).toBe('\n');
			expect(other.querySelector('#after-write')).toBeNull();
			expect(other.querySelector('#after-writeln')).toBeNull();
			if (svg) {
				expect(originalWrite).toHaveBeenCalledExactlyOnceWith(
					'<span id="after-write">',
					'after</span>'
				);
				expect(originalWriteln).toHaveBeenCalledExactlyOnceWith(
					'<span id="after-writeln">',
					'after line</span>'
				);
			} else {
				expect(originalWrite).not.toHaveBeenCalled();
				expect(originalWriteln).not.toHaveBeenCalled();
			}
		} finally {
			dom.window.close();
		}
	}
);
