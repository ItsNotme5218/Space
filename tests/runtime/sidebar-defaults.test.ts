import { afterEach, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { SettingsPage } from '../../src/pages/SettingsPage';
import { cache, initSettings } from '../../src/hooks/useLocalStorage';
import type { SpaceRuntime } from '../../src/runtime';

const persisted = vi.hoisted(() => new Map<string, unknown>());
const setItem = vi.hoisted(() => vi.fn());
const settingsPanel = vi.hoisted(() => ({ value: 'appear' }));
vi.mock('localforage', () => ({
	default: {
		createInstance: () => ({
			getItem: async (key: string) => persisted.get(key) ?? null,
			setItem,
			iterate: async (visit: (value: unknown, key: string) => void) => {
				persisted.forEach((value, key) => visit(value, key));
			}
		})
	}
}));
vi.mock('react', async original => ({
	...(await original<typeof import('react')>()),
	useState: (initial: unknown) => [
		typeof initial === 'function'
			? initial()
			: initial === 'cloak'
				? settingsPanel.value
				: initial,
		vi.fn()
	],
	useRef: (current: unknown) => ({ current }),
	useEffect: () => {},
	useCallback: (callback: unknown) => callback
}));
vi.mock('react-router-dom', () => ({
	useLocation: () => ({ pathname: '/' }),
	useNavigate: () => vi.fn(),
	Outlet: () => null
}));
vi.mock('../../src/hooks/useTabCloak', () => ({ useTabCloak: () => {} }));
vi.mock('../../src/components/Sidebar', () => ({ Sidebar: 'sidebar' }));
vi.mock('../../src/components/TopBar', () => ({ TopBar: 'topbar' }));
vi.mock('../../src/components/SpaceStars', () => ({ SpaceStars: 'stars' }));
vi.mock('../../src/components/SessionOverlay', () => ({
	SessionOverlay: 'overlay'
}));
vi.mock('@mercuryworkshop/proxy-transports', () => ({
	BareCompatibleClient: class {}
}));
vi.mock('@utils/settings', () => ({ SettingsAPI: class {} }));

function find(tree: any, predicate: (node: any) => boolean): any {
	if (!tree || typeof tree !== 'object') return;
	if (predicate(tree)) return tree;
	for (const child of [tree.props?.children].flat(Infinity)) {
		const found = find(child, predicate);
		if (found) return found;
	}
}

afterEach(() => {
	persisted.clear();
	cache.clear();
	setItem.mockClear();
	settingsPanel.value = 'appear';
	vi.unstubAllGlobals();
});

it('ends About with plain-text credits for only the active game sources', () => {
	vi.stubGlobal('window', { innerHeight: 900, localStorage: { length: 0 } });
	settingsPanel.value = 'about';
	const about = find(
		SettingsPage(),
		node => node.type?.name === 'AboutPanel'
	).type();
	const sections = [about.props.children].flat(Infinity).filter(Boolean);
	const credits = sections.at(-1);
	expect(credits.props.title).toBe('Credits');
	const list = find(credits, node => node.type === 'ul');
	expect(list.props.children.map((item: any) => item.props.children)).toEqual(
		['Truffled', 'gn-math', 'Selenite', 'Velara']
	);
	expect(
		find(
			credits,
			node => node.type === 'a' || node.props?.href || node.props?.onClick
		)
	).toBeUndefined();
});

it('session iframes have rounded corners without a border', async () => {
	vi.stubGlobal('window', { innerHeight: 900, localStorage: { length: 0 } });
	await initSettings();
	const runtime = {
		mode: 'unavailable',
		ready: Promise.resolve(),
		navigate: vi.fn(),
		fetch: vi.fn(),
		dispose: vi.fn()
	} as SpaceRuntime;
	const iframe = find(App({ runtime }), node => node.type === 'iframe');
	expect(iframe.props.style.border).toBe('none');
	expect(iframe.props.style.borderRadius).toBe(12);
});

it.each([undefined, true, false])(
	'App and Settings honor autoHideSidebar=%s without overwriting preferences',
	async saved => {
		vi.stubGlobal('window', {
			innerHeight: 900,
			localStorage: { length: 0 }
		});
		if (saved !== undefined) persisted.set('autoHideSidebar', saved);
		await initSettings();
		const runtime = {
			mode: 'unavailable',
			ready: Promise.resolve(),
			navigate: vi.fn(),
			fetch: vi.fn(),
			dispose: vi.fn()
		} as SpaceRuntime;
		const app = App({ runtime });
		const autoHide = saved ?? false;
		expect
			.soft(
				find(app, node => node.type === 'sidebar').props.alwaysVisible
			)
			.toBe(!autoHide);
		expect
			.soft(
				find(app, node => node.props?.animate?.width !== undefined)
					.props.animate.width
			)
			.toBe(autoHide ? 0 : '4rem');
		const settings = SettingsPage();
		const appearance = find(
			settings,
			node => node.type?.name === 'AppearPanel'
		).type();
		const row = find(
			appearance,
			node => node.props?.label === 'Auto-hide Sidebar'
		);
		expect.soft(row.props.children.props.on).toBe(autoHide);
		expect(persisted.get('autoHideSidebar')).toBe(saved);
		expect(setItem).not.toHaveBeenCalled();
	}
);
