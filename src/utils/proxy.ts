import {
	BareCompatibleClient,
	type ProxyTransport
} from '@mercuryworkshop/proxy-transports';
import { SettingsAPI } from '@utils/settings';
import { formatInput } from '../runtime/navigation';
import { getSpaceConfig, getWispDomains } from '../runtime/config';
import { generateWisp, probeWisp, resolveWisp } from '../runtime/wisp';
import { apiUrl } from '../runtime/api';
import { normalizeProxyEngine } from '../runtime/proxy-settings';
import type { createProxyConfig } from '../runtime/codec';
import { verifyBootstrapContext } from '../runtime/bootstrap';
import { assetUrl, resolveAssetConfig } from '../runtime/asset-url';

type ProxyTransportInstance = Partial<ProxyTransport>;

type ProxyTransportConstructor = new (
	opts: Record<string, any>
) => ProxyTransportInstance;

const TRANSPORT_MODULES: Record<string, string> = {
	epoxy: '/ep/index.mjs',
	libcurl: '/l/index.mjs'
};

const SCRAMJET_SCRIPTS = [
	'/s/scramjet.js',
	'/c/controller.api.js',
	'/ut/scramjet-utils.js'
];

const KEEPALIVE_INTERVAL = 15000;
const CONTROLLER_TIMEOUT = 5000;

const loadScript = (src: string) =>
	new Promise<void>((resolve, reject) => {
		const existing = document.querySelector<HTMLScriptElement>(
			`script[data-proxy-src="${src}"]`
		);
		if (existing) {
			resolve();
			return;
		}
		const script = document.createElement('script');
		script.src = src;
		script.dataset.proxySrc = src;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error(`Failed to load ${src}`));
		document.head.append(script);
	});

interface ProxyInterface {
	searchVar: string;
	transportVar: string;
	wispUrl: string;
	settings: SettingsAPI;
	config: Record<string, any>;
	swConfigSettings: Record<string, any>;
	proxySetting: string;
	setTransports(): Promise<void>;
	search(input: string): string;
	registerSW(swConfig: any): Promise<ServiceWorker>;
	updateSW(): void;
	uninstallSW(): void;
	redirect(
		swConfig: Record<any, any>,
		proxySetting: string,
		url: string
	): Promise<void>;
	fetch(url: string, params?: any): Promise<string>;
}

class Proxy implements ProxyInterface {
	searchVar!: string;
	transportVar!: string;
	wispUrl!: string;
	settings!: SettingsAPI;
	config!: Record<string, any>;
	swConfigSettings!: Record<string, any>;
	proxySetting!: string;
	ready: Promise<void>;
	scramConfig!: SJConfig;

	private controller: ScramjetControllerInstance | null = null;
	private frames = new WeakMap<HTMLIFrameElement, ScramjetFrameInstance>();
	private imageFrame: ScramjetFrameInstance | null = null;
	private imageWorker: ServiceWorker | null = null;
	private imagesDisposed = false;
	private transport: ProxyTransportInstance | null = null;
	private registration: Promise<ServiceWorker> | null = null;
	private controllerBoot: Promise<void> | null = null;
	private keepalive: ReturnType<typeof setInterval> | null = null;
	private bootstrap = verifyBootstrapContext(
		window,
		getSpaceConfig().buildId
	);

	constructor() {
		this.settings = new SettingsAPI();

		this.ready = (async () => {
			// Consume ownership failure immediately, before asynchronous settings work.
			// A rejected handshake must remain fatal, never become standalone absence.
			const bootstrap = await this.bootstrap;
			// prepareRuntimeScripts loads the same authoritative classic script that
			// sw.js imports. Never independently derive a worker prefix or codec.
			const shared = (
				globalThis as typeof globalThis & {
					__SPACE_PROXY_CONFIG__?: ReturnType<
						typeof createProxyConfig
					>;
				}
			).__SPACE_PROXY_CONFIG__;
			if (!shared)
				throw new Error('Space proxy configuration was not loaded');
			this.scramConfig = resolveAssetConfig(shared) as SJConfig;

			this.swConfigSettings = {};
			this.config = {
				sj: {
					type: 'sw',
					file: assetUrl('/sw.js'),
					config: this.scramConfig,
					func: async () => {
						await this.bootController();
					}
				}
			};
			const storedProxySetting = await this.settings.getItem('proxy');
			this.proxySetting = normalizeProxyEngine(storedProxySetting);
			if (storedProxySetting !== this.proxySetting) {
				await this.settings.setItem('proxy', this.proxySetting);
			}

			this.searchVar =
				(await this.settings.getItem('search')) ||
				'https://search.brave.com/search?q=%s';
			this.transportVar =
				(await this.settings.getItem('transports')) || 'libcurl';
			this.wispUrl =
				bootstrap?.wispUrl ??
				(await resolveWisp(
					getSpaceConfig(),
					await this.settings.getItem('wisp'),
					{
						ping: probeWisp,
						generate: () => generateWisp(getWispDomains())
					}
				));
		})();
	}

	private async transportOptions(): Promise<Record<string, any>> {
		await this.ready;
		const wispUrl = this.wispUrl;

		const options: Record<string, any> = { wisp: wispUrl };

		const remoteProxyServer = await this.getRemoteProxyServer();
		if (
			remoteProxyServer &&
			remoteProxyServer !== 'undefined' &&
			remoteProxyServer !== 'null' &&
			remoteProxyServer !== 'disabled' &&
			remoteProxyServer !== 'false' &&
			(this.transportVar || 'libcurl') === 'libcurl'
		) {
			options.proxy = remoteProxyServer;
		}

		return options;
	}

	private async createTransport(
		options?: Record<string, any>
	): Promise<ProxyTransportInstance> {
		const transportFile =
			TRANSPORT_MODULES[this.transportVar] || TRANSPORT_MODULES.libcurl;

		const module = await import(/* @vite-ignore */ assetUrl(transportFile));
		const TransportClass: ProxyTransportConstructor =
			module.default ?? module.LibcurlClient ?? module.EpoxyTransport;

		if (typeof TransportClass !== 'function') {
			throw new Error(
				`No transport constructor exported by ${transportFile}`
			);
		}

		const transport = new TransportClass(
			options ?? (await this.transportOptions())
		);
		if (!transport.ready && typeof transport.init === 'function') {
			await transport.init();
		}

		return transport;
	}

	private async bootController(): Promise<void> {
		await this.assertBootstrapOwnership();
		if (this.controllerBoot) return this.controllerBoot;

		this.controllerBoot = (async () => {
			const serviceworker = await this.registerSW(this.config.sj);

			for (const src of SCRAMJET_SCRIPTS) {
				await loadScript(assetUrl(src));
			}

			const api = window.$scramjetController;
			if (!api?.Controller) {
				throw new Error('Scramjet controller failed to load');
			}

			this.transport = await this.createTransport();

			this.controller = new api.Controller({
				serviceworker,
				transport: this.transport,
				config: {
					prefix: this.scramConfig.prefix,
					scramjetPath: this.scramConfig.scramjetPath,
					wasmPath: this.scramConfig.wasmPath,
					injectPath: this.scramConfig.injectPath,
					codec: this.scramConfig.codec
				}
			});

			await this.controller.wait();
			this.imageWorker = serviceworker;

			if (this.keepalive === null) {
				this.keepalive = setInterval(() => {
					navigator.serviceWorker.controller?.postMessage(
						'keepalive'
					);
				}, KEEPALIVE_INTERVAL);
			}

			console.log('[Proxy] Scramjet controller ready');
		})();

		try {
			await this.controllerBoot;
			await this.assertBootstrapOwnership();
		} catch (error) {
			this.controllerBoot = null;
			throw error;
		}
	}

	async setTransports() {
		const options = await this.transportOptions();
		const transport = await this.createTransport(options);
		this.transport = transport;

		if (this.controller) {
			this.controller.setTransport(transport);
		}

		console.log('[Proxy] Transport set with options:', options);
	}

	async swapWispServer(url: string) {
		this.wispUrl = url;
		await this.settings.setItem('wisp', url);
		await this.setTransports();
	}

	search(input: string) {
		return formatInput(input, this.searchVar);
	}

	dispose() {
		this.imagesDisposed = true;
		if (this.imageFrame && this.controller) {
			const index = this.controller.frames.indexOf(this.imageFrame);
			if (index !== -1) this.controller.frames.splice(index, 1);
			this.imageFrame.element.remove();
			this.imageFrame = null;
		}
		if (this.keepalive !== null) clearInterval(this.keepalive);
		this.keepalive = null;
	}

	/** One detached, registered frame owns all image requests for this runtime. */
	imageUrl(url: string): string {
		if (this.imagesDisposed || !this.controller || !this.scramConfig.codec)
			return '';
		if (
			this.imageWorker &&
			navigator.serviceWorker.controller !== this.imageWorker
		)
			return '';
		// createStandaloneRuntime has awaited controller.wait() before exposing us.
		// Never navigate or mount this iframe: only its registered request context is needed.
		this.imageFrame ??= this.controller.createFrame();
		return new URL(
			this.imageFrame.prefix + this.scramConfig.codec.encode(url),
			window.location.href
		).href;
	}

	async attachFrame(
		iframe: HTMLIFrameElement
	): Promise<ScramjetFrameInstance> {
		await this.bootController();
		await this.assertBootstrapOwnership();

		const existing = this.frames.get(iframe);
		if (existing) return existing;

		const frame = this.controller!.createFrame(iframe);
		this.frames.set(iframe, frame);

		return frame;
	}

	async navigate(
		iframe: HTMLIFrameElement,
		url: string,
		current: () => boolean = () => true
	): Promise<void> {
		const target = this.search(url);

		const frame = await this.attachFrame(iframe);
		await this.assertBootstrapOwnership();
		// Preparation may outlive this iframe's navigation generation.
		if (!current()) return;
		frame.go(target);
	}

	private async assertBootstrapOwnership() {
		const bootstrap = await this.bootstrap;
		if (
			bootstrap &&
			navigator.serviceWorker.controller !== bootstrap.worker
		) {
			throw new Error('Bootstrap worker control was lost');
		}
		return bootstrap;
	}

	async registerSW(swConfig: Record<any, any>): Promise<ServiceWorker> {
		if (swConfig?.type !== 'sw') {
			throw new Error(
				`Unsupported proxy backend type: ${swConfig?.type}`
			);
		}

		if (!('serviceWorker' in navigator)) {
			throw new Error('Service workers are unavailable in this browser');
		}

		const bootstrap = await this.assertBootstrapOwnership();
		if (this.registration) {
			const worker = await this.registration;
			await this.assertBootstrapOwnership();
			return worker;
		}

		this.registration = (async () => {
			if (bootstrap) {
				return bootstrap.worker;
			}
			const registration = await navigator.serviceWorker.register(
				swConfig.file,
				{
					scope: new URL(
						assetUrl('/'),
						globalThis.location?.href || 'http://localhost/'
					).pathname,
					updateViaCache: 'none'
				}
			);

			try {
				await registration.update();
			} catch (error) {
				console.warn(
					'[Proxy] Service worker update check failed',
					error
				);
			}

			await navigator.serviceWorker.ready;

			if (!navigator.serviceWorker.controller) {
				await new Promise<void>(resolve => {
					const done = () => {
						window.clearTimeout(timer);
						navigator.serviceWorker.removeEventListener(
							'controllerchange',
							done
						);
						resolve();
					};
					const timer = window.setTimeout(done, CONTROLLER_TIMEOUT);
					navigator.serviceWorker.addEventListener(
						'controllerchange',
						done
					);
				});
			}

			const serviceworker =
				navigator.serviceWorker.controller ??
				registration.active ??
				registration.waiting;
			if (!serviceworker) {
				throw new Error('The service worker did not become active');
			}

			return serviceworker;
		})();

		try {
			const worker = await this.registration;
			await this.assertBootstrapOwnership();
			return worker;
		} catch (error) {
			this.registration = null;
			throw error;
		}
	}

	updateSW() {
		navigator.serviceWorker.getRegistrations().then(registrations => {
			registrations.forEach(registration => {
				registration.update();
			});
		});
	}

	uninstallSW() {
		navigator.serviceWorker.getRegistrations().then(registrations => {
			registrations.forEach(registration => {
				registration.unregister();
			});
		});
	}

	async redirect(swConfig: Record<any, any>, proxySetting: string, url: any) {
		const encodedUrl = await this.convertURL(swConfig, proxySetting, url);
		await this.assertBootstrapOwnership();

		const activeIframe: HTMLIFrameElement | null =
			document.querySelector('iframe.active');
		if (!activeIframe) {
			console.log('[Proxy] No active iframe found');
			return;
		}

		activeIframe.src = encodedUrl;
	}

	async convertURL(
		_swConfig: Record<any, any>,
		_proxySetting: string,
		url: string
	) {
		const target = this.search(url);
		await this.bootController();
		const prefix = this.controller?.prefix ?? this.scramConfig.prefix;
		return prefix + this.scramConfig.codec!.encode(target);
	}

	async fetch(url: string, params?: any): Promise<string> {
		const transport = this.transport ?? (await this.createTransport());
		this.transport = transport;

		const headers: [string, string][] = [];
		if (params?.headers) {
			const source = params.headers;
			if (typeof source[Symbol.iterator] === 'function') {
				for (const [key, value] of source as Iterable<
					[string, string]
				>) {
					headers.push([key, String(value)]);
				}
			} else {
				for (const [key, value] of Object.entries(
					source as Record<string, string>
				)) {
					headers.push([key, String(value)]);
				}
			}
		}

		const client = new BareCompatibleClient(transport as ProxyTransport);
		const response = await client.fetch(url, {
			method: params?.method ?? 'GET',
			body: params?.body ?? null,
			headers
		});

		return await response.text();
	}

	async ping(
		server: string
	): Promise<{ online: boolean; ping: number | string }> {
		return new Promise(resolve => {
			const websocket = new WebSocket(server);
			const startTime = Date.now();
			websocket.addEventListener('open', () => {
				const pingTime = Date.now() - startTime;
				websocket.close();
				resolve({ online: true, ping: pingTime });
			});
			websocket.addEventListener('message', () => {
				const pingTime = Date.now() - startTime;
				websocket.close();
				resolve({ online: true, ping: pingTime });
			});
			websocket.addEventListener('error', () => {
				websocket.close();
				resolve({ online: false, ping: 'N/A' });
			});
			setTimeout(() => {
				websocket.close();
				resolve({ online: false, ping: 'N/A' });
			}, 5000);
		});
	}

	async setRemoteProxyServer(server: string) {
		await this.settings.setItem('proxyServer', server);
	}

	async getRemoteProxyServer(): Promise<string> {
		return await this.settings.getItem('proxyServer');
	}

	async getAuthUrl(): Promise<string> {
		const config = getSpaceConfig();
		const configured = apiUrl('/auth', config);
		if (configured === null)
			throw new Error('Account APIs are unavailable in this deployment');
		if (config.apiOrigin) return configured;
		try {
			const productionAuthUrl = await this.settings.getItem(
				'production_auth_url'
			);
			if (productionAuthUrl && typeof productionAuthUrl === 'string') {
				return productionAuthUrl;
			}
			return new URL(configured, location.origin).href;
		} catch (error) {
			console.error('[Proxy] Error determining auth URL:', error);
			throw error;
		}
	}

	async checkAuthentication(): Promise<boolean> {
		if (apiUrl('/auth', getSpaceConfig()) === null) return false;
		try {
			const module = await import(
				/* @vite-ignore */
				window.location.origin + '/p/index.mjs'
			);
			const PlusClient = module.default;
			const client = new PlusClient();
			const sessionToken = await client.getSessionToken();
			return sessionToken !== null;
		} catch (error) {
			console.error('[Proxy] Error checking authentication:', error);
			return false;
		}
	}
}

export { Proxy };
