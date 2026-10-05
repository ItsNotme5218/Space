import { afterEach, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { Sidebar } from '../../src/components/Sidebar';
import { Search, X } from 'lucide-react';
import { Sessions } from '../../src/components/Sessions';

const hover = vi.hoisted(() => ({ session: null as number | null }));

vi.mock('@assets/logo.webp', () => ({ default: 'logo.webp' }));
vi.mock('@utils/nightplus', () => ({ openNightPlusLogin: vi.fn() }));

vi.mock('react', async original => ({
	...(await original<typeof import('react')>()),
	useState: (value: unknown) => [
		value === null ? hover.session : value,
		vi.fn()
	],
	useRef: (current: unknown) => ({ current }),
	useEffect: () => {},
	useCallback: (callback: unknown) => callback
}));

function find(
	tree: any,
	predicate = (node: any) => node.key === 'discord' && node.props?.onClick
): any {
	if (!tree || typeof tree !== 'object') return;
	if (predicate(tree)) return tree;
	for (const child of [tree.props?.children].flat(Infinity)) {
		const result = find(child, predicate);
		if (result) return result;
	}
}

afterEach(() => {
	hover.session = null;
	vi.unstubAllGlobals();
});

it('keeps the hovered active session close action on the home page', () => {
	hover.session = 0;
	const onCloseSession = vi.fn();
	const onSessionChange = vi.fn();
	const tree = Sidebar({
		activeItem: 'home',
		onItemClick: vi.fn(),
		sessions: [{ id: 0, url: '' }],
		activeSession: 0,
		maxSessions: 3,
		onCloseSession,
		onSessionChange,
		onAddSession: vi.fn()
	});
	const sessionList = find(tree, node => node.type === Sessions);
	const sessions = Sessions(sessionList.props);
	expect(find(sessions, node => node.type === X)).toBeDefined();
	find(sessions, node => node.key === '0').props.onClick();
	expect(onCloseSession).toHaveBeenCalledWith(0);
	expect(onSessionChange).not.toHaveBeenCalled();
});

it('shows Search, Games, Playback, Settings, then Discord', () => {
	const tree = Sidebar({ activeItem: 'home', onItemClick: vi.fn() });
	const container = find(tree, node =>
		[node.props?.children]
			.flat(Infinity)
			.some((child: any) => child?.key === 'games')
	);
	const keys = [container.props.children]
		.flat(Infinity)
		.filter((child: any) => child?.props?.onClick && child?.key)
		.map((child: any) => child.key);
	expect(keys).toEqual(['home', 'games', 'playback', 'settings', 'discord']);
});

it('Search uses the same home action as the Space logo', () => {
	const onItemClick = vi.fn();
	const tree = Sidebar({ activeItem: 'home', onItemClick });
	const search = find(tree, node => node.key === 'home');
	expect(search).toBeDefined();
	expect(search.props.children.type).toBe(Search);
	const logo = find(
		tree,
		node =>
			node.props?.onClick &&
			!node.key &&
			node.props?.children?.type?.name === 'LogoImage'
	);
	search.props.onClick();
	logo.props.onClick();
	expect(onItemClick.mock.calls).toEqual([[''], ['']]);
});

it('has no divider between Games and Playback', () => {
	const tree = Sidebar({ activeItem: 'games', onItemClick: vi.fn() });
	const container = find(tree, node =>
		[node.props?.children]
			.flat(Infinity)
			.some((child: any) => child?.key === 'games')
	);
	const children = [container.props.children].flat(Infinity).filter(Boolean);
	const index = children.findIndex((child: any) => child.key === 'games');
	expect(children[index + 1].key).toBe('playback');
});

it('opens Discord through the active proxy session without leaving the shell', () => {
	const dom = new JSDOM('', { url: 'https://space.example/index.svg' });
	vi.stubGlobal('window', dom.window);
	vi.stubGlobal('CustomEvent', dom.window.CustomEvent);
	const navigate = vi.fn();
	dom.window.addEventListener('space:navigate', navigate);
	const onItemClick = vi.fn();
	const tree = Sidebar({ activeItem: 'home', onItemClick });
	find(tree).props.onClick();
	expect(navigate).toHaveBeenCalledTimes(1);
	expect(navigate.mock.calls[0][0].detail).toEqual({
		url: 'https://discord.night-x.com',
		target: 'active'
	});
	expect(onItemClick).not.toHaveBeenCalled();
	expect(dom.window.location.href).toBe('https://space.example/index.svg');
	dom.window.close();
});
