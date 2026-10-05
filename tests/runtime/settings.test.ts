import { afterEach, expect, it, vi } from 'vitest';
import { SettingsPage } from '../../src/pages/SettingsPage';

const writes = vi.hoisted(() => ({
	stored: vi.fn(),
	display: vi.fn(),
	effects: [] as Array<() => void | (() => void)>
}));
vi.mock('react', async original => ({
	...(await original<typeof import('react')>()),
	useState: (initial: unknown) => [
		initial === 'cloak' ? 'proxy' : initial,
		vi.fn()
	],
	useEffect: (effect: () => void | (() => void)) => {
		writes.effects.push(effect);
	}
}));
vi.mock('../../src/hooks/useLocalStorage', () => ({
	useLocalStorage: (key: string, initial: unknown) => [
		key === 'proxyDisplay' ? 'Ultraviolet' : initial,
		writes.display
	],
	writeSetting: writes.stored
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
	vi.unstubAllGlobals();
	vi.clearAllMocks();
	writes.effects.length = 0;
});
it('delegated settings hide local controls and stale standalone handlers cannot mutate settings', () => {
	const local = {
		proxySetting: 'sj',
		transportVar: 'libcurl',
		setTransports: vi.fn()
	};
	const runtime = { mode: 'standalone', local };
	vi.stubGlobal('window', { proxy: runtime });
	const page = SettingsPage();
	const panel = find(page, n => n.type?.name === 'ProxyPanel').type;
	const standalone = panel();
	const backend = find(standalone, n => n.props?.label === 'Proxy Backend');
	const transport = find(standalone, n => n.props?.label === 'Transport');
	expect(backend.props.children.props.value).toBe('Scramjet');
	expect(backend.props.children.props.options).toEqual(['Scramjet']);
	expect(writes.display).not.toHaveBeenCalled();
	for (const effect of writes.effects) effect();
	expect(writes.display).toHaveBeenCalledWith('Scramjet');
	vi.clearAllMocks();
	runtime.mode = 'delegated';
	backend.props.children.props.onChange('Ultraviolet');
	transport.props.children.props.onChange('Epoxy');
	expect(writes.stored).not.toHaveBeenCalled();
	expect(writes.display).not.toHaveBeenCalled();
	expect(local.proxySetting).toBe('sj');
	expect(local.transportVar).toBe('libcurl');
	expect(local.setTransports).not.toHaveBeenCalled();
	const delegated = panel();
	expect(
		find(delegated, n => n.props?.label === 'Proxy Backend')
	).toBeUndefined();
	expect(
		find(delegated, n =>
			String(n.props?.children).includes('surrounding proxy')
		)
	).toBeTruthy();
});

it('transport settings update an active Scramjet controller directly', async () => {
	const firstTransport = { id: 'initial' };
	const secondTransport = { id: 'updated' };
	const proxy = {
		transport: firstTransport,
		controller: { setTransport: vi.fn() },
		transportOptions: vi.fn(),
		createTransport: vi.fn().mockResolvedValue(secondTransport)
	};

	const { Proxy } = await import('../../src/utils/proxy');
	await Proxy.prototype.setTransports.call(proxy);

	expect(proxy.createTransport).toHaveBeenCalledOnce();
	expect(proxy.transport).toBe(secondTransport);
	expect(proxy.controller.setTransport).toHaveBeenCalledWith(secondTransport);
});
