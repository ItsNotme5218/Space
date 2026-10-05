import { afterEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { selectRuntime, type SpaceRuntime } from '../../src/runtime';
import App from '../../src/App';

const h = vi.hoisted(() => ({
	states: [] as any[],
	refs: [] as any[],
	effects: [] as (() => void)[],
	index: 0,
	refIndex: 0,
	ready: vi.fn(),
	setting: vi.fn(async (_key: string, fallback: unknown) => fallback)
}));
vi.mock('../../src/bridge/client', () => ({
	discoverProxyContext: async () => ({
		assertReady: h.ready,
		dispose: vi.fn()
	})
}));
vi.mock('react', async original => ({
	...(await original<typeof import('react')>()),
	useState: (initial: any) => {
		const index = h.index++;
		if (!(index in h.states))
			h.states[index] =
				typeof initial === 'function' ? initial() : initial;
		return [
			h.states[index],
			(next: any) => {
				h.states[index] =
					typeof next === 'function' ? next(h.states[index]) : next;
			}
		];
	},
	useRef: (initial: any) => {
		const index = h.refIndex++;
		return (h.refs[index] ??= { current: initial });
	},
	useEffect: (effect: () => void) => {
		h.effects.push(effect);
	},
	useCallback: (callback: unknown) => callback
}));
vi.mock('react-router-dom', () => ({
	useLocation: () => ({ pathname: '/' }),
	useNavigate: () => vi.fn(),
	Outlet: () => null
}));
vi.mock('../../src/hooks/useTabCloak', () => ({ useTabCloak: () => {} }));
vi.mock('../../src/hooks/useLocalStorage', () => ({
	useLocalStorage: (_key: string, initial: unknown) => [initial, vi.fn()],
	readSetting: h.setting
}));
vi.mock('../../src/components/Sidebar', () => ({ Sidebar: 'sidebar' }));
vi.mock('../../src/components/TopBar', () => ({ TopBar: 'topbar' }));
vi.mock('../../src/components/SpaceStars', () => ({ SpaceStars: 'stars' }));
vi.mock('../../src/components/SessionOverlay', () => ({
	SessionOverlay: 'overlay'
}));
vi.mock('framer-motion', () => ({ motion: { div: 'motion-div' } }));
vi.mock('../../src/utils/proxy', () => ({
	Proxy: class {
		constructor() {
			throw new Error('App must not construct Proxy');
		}
	}
}));

function find(tree: any, predicate: (node: any) => boolean): any {
	if (!tree || typeof tree !== 'object') return;
	if (predicate(tree)) return tree;
	for (const child of [tree.props?.children].flat(Infinity)) {
		const found = find(child, predicate);
		if (found) return found;
	}
}
function render(runtime: SpaceRuntime) {
	h.index = 0;
	h.refIndex = 0;
	h.effects = [];
	return App({ runtime }) as ReactElement;
}

it('startup unavailable is visible with explicit reload recovery', () => {
	vi.stubGlobal('window', { innerHeight: 900 });
	const runtime = {
		mode: 'unavailable',
		ready: Promise.resolve(),
		navigate: vi.fn(),
		fetch: vi.fn(),
		dispose: vi.fn()
	} as SpaceRuntime;
	const tree = render(runtime);
	expect(
		find(tree, node => node.props?.role === 'alert').props.children
	).toContain('Reload');
});
afterEach(() => {
	h.setting
		.mockReset()
		.mockImplementation(
			async (_key: string, fallback: unknown) => fallback
		);
	h.states = [];
	h.refs = [];
	h.effects = [];
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

it('an old document observation during Back cannot truncate the forward entry', async () => {
	vi.useFakeTimers();
	vi.stubGlobal('window', {
		innerHeight: 900,
		location: { origin: 'https://space.test' }
	});
	const runtime = {
		mode: 'delegated',
		ready: Promise.resolve(),
		navigate: vi.fn(),
		fetch: vi.fn(),
		dispose: vi.fn()
	} as SpaceRuntime;
	const flush = async () => {
		for (let i = 0; i < 8; i++) await Promise.resolve();
	};
	let tree = render(runtime);
	find(tree, n => n.type === 'topbar').props.onNavigate(
		'https://game.test/first'
	);
	await flush();
	tree = render(runtime);
	find(tree, n => n.type === 'iframe').props.onLoad();
	tree = render(runtime);
	find(tree, n => n.type === 'topbar').props.onNavigate(
		'https://game.test/second'
	);
	await flush();
	tree = render(runtime);
	find(tree, n => n.type === 'iframe').props.onLoad();
	tree = render(runtime);
	find(tree, n => n.type === 'topbar').props.onBack();
	await flush();
	tree = render(runtime);
	expect(find(tree, n => n.type === 'topbar').props.canGoForward).toBe(true);
	find(tree, n => n.type === 'topbar').props.onLocationChange(
		0,
		'https://game.test/second',
		'Old document'
	);
	tree = render(runtime);
	expect(find(tree, n => n.type === 'topbar').props.canGoForward).toBe(true);
});

it('Back owns history before delayed settings preparation and ignores old loads', async () => {
	vi.useFakeTimers();
	vi.stubGlobal('window', {
		innerHeight: 900,
		location: { origin: 'https://space.test' }
	});
	const runtime = {
		mode: 'delegated',
		ready: Promise.resolve(),
		navigate: vi.fn(),
		fetch: vi.fn(),
		dispose: vi.fn()
	} as SpaceRuntime;
	const flush = async () => {
		for (let i = 0; i < 8; i++) await Promise.resolve();
	};
	let tree = render(runtime);
	for (const url of ['https://game.test/first', 'https://game.test/second']) {
		await find(tree, n => n.type === 'topbar').props.onNavigate(url);
		tree = render(runtime);
		find(tree, n => n.type === 'iframe').props.onLoad();
		tree = render(runtime);
	}
	let release!: (value: unknown) => void;
	h.setting.mockImplementationOnce(
		() =>
			new Promise(resolve => {
				release = resolve;
			})
	);
	find(tree, n => n.type === 'topbar').props.onBack();
	await flush();
	tree = render(runtime);
	find(tree, n => n.type === 'iframe').props.onLoad();
	find(tree, n => n.type === 'topbar').props.onLocationChange(
		0,
		'https://game.test/second',
		'Old document'
	);
	tree = render(runtime);
	expect(find(tree, n => n.type === 'topbar').props.canGoForward).toBe(true);
	release('https://search.test/?q=%s');
	await flush();
	tree = render(runtime);
	expect(find(tree, n => n.type === 'topbar').props.canGoForward).toBe(true);
});

it('superseded preparation cannot overwrite or fail a newer navigation', async () => {
	vi.useFakeTimers();
	vi.stubGlobal('window', {
		innerHeight: 900,
		location: { origin: 'https://space.test' }
	});
	const runtime = {
		mode: 'delegated',
		ready: Promise.resolve(),
		navigate: vi.fn(),
		fetch: vi.fn(),
		dispose: vi.fn()
	} as SpaceRuntime;
	const flush = async () => {
		for (let i = 0; i < 8; i++) await Promise.resolve();
	};
	let release!: (value: unknown) => void;
	h.setting.mockImplementationOnce(
		() =>
			new Promise(resolve => {
				release = resolve;
			})
	);
	let tree = render(runtime);
	const old = find(tree, n => n.type === 'topbar').props.onNavigate(
		'https://game.test/old'
	);
	await flush();
	await find(tree, n => n.type === 'topbar').props.onNavigate(
		'https://game.test/new'
	);
	release('https://search.test/?q=%s');
	await old;
	tree = render(runtime);
	expect(find(tree, n => n.type === 'topbar').props.sessions[0].url).toBe(
		'https://game.test/new'
	);
});

it('failed preparation releases ownership so later document feedback is accepted', async () => {
	vi.useFakeTimers();
	vi.stubGlobal('window', {
		innerHeight: 900,
		location: { origin: 'https://space.test' }
	});
	const runtime = {
		mode: 'delegated',
		ready: Promise.resolve(),
		navigate: vi.fn(),
		fetch: vi.fn(),
		dispose: vi.fn()
	} as SpaceRuntime;
	const error = vi.spyOn(console, 'error').mockImplementation(() => {});
	let tree = render(runtime);
	h.setting.mockRejectedValueOnce(new Error('settings unavailable'));
	await find(tree, n => n.type === 'topbar').props.onNavigate(
		'https://game.test/failed'
	);
	tree = render(runtime);
	find(tree, n => n.type === 'topbar').props.onLocationChange(
		0,
		'https://game.test/observed',
		'Observed'
	);
	tree = render(runtime);
	expect(find(tree, n => n.type === 'topbar').props.canGoBack).toBe(true);
	error.mockRestore();
});

it('actual App grid/custom/search/history/restored state/reload/retry use the runtime, never direct reload', async () => {
	vi.useFakeTimers();
	const win = Object.assign(new EventTarget(), {
		innerHeight: 900,
		location: { origin: 'https://space.test', href: 'https://space.test/' }
	});
	vi.stubGlobal('window', win);
	const navigate = vi.fn().mockResolvedValue(undefined);
	const runtime = {
		mode: 'delegated',
		ready: Promise.resolve(),
		navigate,
		fetch: vi.fn(),
		dispose: vi.fn()
	} as SpaceRuntime;
	const iframe = {
		src: '',
		dataset: {},
		getAttribute: () => '/newtab.html',
		contentWindow: { location: { reload: vi.fn() } }
	};
	const carousel = {
		querySelector: () => iframe,
		querySelectorAll: () => [{ querySelector: () => iframe }]
	};
	let tree = render(runtime);
	find(tree, n => n.props?.ref && n.type === 'motion-div').props.ref.current =
		carousel;
	const cleanups = h.effects.map(effect => effect());
	for (let i = 0; i < 6; i++) await Promise.resolve();
	const event = new Event('space:navigate');
	Object.assign(event, {
		detail: {
			url: 'https://game.test/play',
			kind: 'game',
			librarySource: 'custom',
			engine: 'iframe'
		}
	});
	win.dispatchEvent(event);
	for (let i = 0; i < 6; i++) await Promise.resolve();
	tree = render(runtime);
	h.effects.forEach(effect => effect());
	expect(navigate).toHaveBeenCalledWith(iframe, 'https://game.test/play');
	const top = find(tree, n => n.type === 'topbar').props;
	await top.onNavigate('two words');
	tree = render(runtime);
	h.effects.forEach(effect => effect());
	expect(navigate).toHaveBeenLastCalledWith(
		iframe,
		'https://search.brave.com/search?q=two%20words'
	);
	find(tree, n => n.type === 'topbar').props.onBack();
	for (let i = 0; i < 6; i++) await Promise.resolve();
	tree = render(runtime);
	h.effects.forEach(effect => effect());
	expect(navigate).toHaveBeenLastCalledWith(iframe, 'https://game.test/play');
	find(tree, n => n.type === 'topbar').props.onReload();
	expect(navigate).toHaveBeenLastCalledWith(iframe, 'https://game.test/play');
	expect(iframe.contentWindow.location.reload).not.toHaveBeenCalled();
	find(tree, n => n.type === 'overlay').props.onRetry();
	expect(navigate).toHaveBeenLastCalledWith(iframe, 'https://game.test/play');
	// A restored session URL still goes through the effect's facade.
	iframe.dataset = {};
	tree = render(runtime);
	h.effects.forEach(effect => effect());
	expect(navigate).toHaveBeenLastCalledWith(iframe, 'https://game.test/play');
	find(tree, n => n.type === 'iframe').props.onLoad();
	tree = render(runtime);
	find(tree, n => n.type === 'topbar').props.onLocationChange(
		0,
		'https://game.test/level-b',
		'Level B'
	);
	tree = render(runtime);
	find(tree, n => n.type === 'topbar').props.onReload();
	expect(navigate).toHaveBeenLastCalledWith(
		iframe,
		'https://game.test/level-b'
	);
	await find(tree, n => n.type === 'topbar').props.onNavigate('');
	tree = render(runtime);
	h.effects.forEach(effect => effect());
	expect(navigate).toHaveBeenLastCalledWith(iframe, '/newtab.html');
	cleanups.forEach(cleanup => {
		if (typeof cleanup === 'function') cleanup();
	});
});

it('actual App reload of location B remains readiness guarded and rejects executable history targets', async () => {
	vi.useFakeTimers();
	const win = Object.assign(new EventTarget(), {
		innerHeight: 900,
		location: { origin: 'https://space.test' }
	});
	vi.stubGlobal('window', win);
	h.ready.mockResolvedValue(undefined);
	const runtime = await selectRuntime(win as unknown as Window, vi.fn());
	const iframe = { src: '', dataset: {} };
	const carousel = {
		querySelector: () => iframe,
		querySelectorAll: () => [{ querySelector: () => iframe }]
	};
	let tree = render(runtime);
	find(tree, n => n.props?.ref && n.type === 'motion-div').props.ref.current =
		carousel;
	const cleanups = h.effects.map(effect => effect());
	await find(tree, n => n.type === 'topbar').props.onNavigate(
		'https://game.test/a'
	);
	tree = render(runtime);
	h.effects.forEach(effect => effect());
	for (let i = 0; i < 6; i++) await Promise.resolve();
	expect(win.location.href).toBe('https://game.test/a');
	find(tree, n => n.type === 'iframe').props.onLoad();
	tree = render(runtime);
	find(tree, n => n.type === 'topbar').props.onLocationChange(
		0,
		'https://game.test/b#level',
		'Level B'
	);
	tree = render(runtime);
	let release!: () => void;
	h.ready.mockImplementationOnce(
		() =>
			new Promise<void>(resolve => {
				release = resolve;
			})
	);
	find(tree, n => n.type === 'topbar').props.onReload();
	expect(win.location.href).toBe('https://game.test/a');
	release();
	for (let i = 0; i < 6; i++) await Promise.resolve();
	expect(win.location.href).toBe('https://game.test/b#level');
	find(tree, n => n.type === 'iframe').props.onLoad();
	tree = render(runtime);
	find(tree, n => n.type === 'topbar').props.onLocationChange(
		0,
		'javascript:alert(1)',
		'Unsafe'
	);
	tree = render(runtime);
	const checks = h.ready.mock.calls.length;
	find(tree, n => n.type === 'topbar').props.onReload();
	for (let i = 0; i < 6; i++) await Promise.resolve();
	expect(win.location.href).toBe('https://game.test/b#level');
	expect(h.ready).toHaveBeenCalledTimes(checks);
	tree = render(runtime);
	expect(find(tree, n => n.type === 'overlay').props.status).toBe('error');
	runtime.dispose();
	cleanups.forEach(cleanup => {
		if (typeof cleanup === 'function') cleanup();
	});
});
