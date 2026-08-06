import * as BareMux from '@mercuryworkshop/bare-mux';
import {
	BareCompatibleClient,
	type ProxyTransport
} from '@mercuryworkshop/proxy-transports';
import { SettingsAPI } from '@utils/settings';

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
	connection: BareMux.BareMuxConnection;
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
	connection!: BareMux.BareMuxConnection;
	searchVar!: string;
	transportVar!: string;
	wispUrl!: string;
	settings!: SettingsAPI;
	config!: Record<string, any>;
	swConfigSettings!: Record<string, any>;
	proxySetting!: string;
	isStaticBuild: boolean = false;
	ready: Promise<void>;
	scramConfig!: SJConfig;

	private controller: ScramjetControllerInstance | null = null;
	private frames = new WeakMap<HTMLIFrameElement, ScramjetFrameInstance>();
	private transport: ProxyTransportInstance | null = null;
	private registration: Promise<ServiceWorker> | null = null;
	private controllerBoot: Promise<void> | null = null;
	private keepalive: ReturnType<typeof setInterval> | null = null;

	constructor() {
		this.connection = new BareMux.BareMuxConnection('/b/worker.js');

		this.settings = new SettingsAPI();

		this.ready = (async () => {
			this.scramConfig = {
				prefix: '/s/res/',
				scramjetPath: '/s/scramjet.js',
				wasmPath: '/s/scramjet.wasm',
				injectPath: '/c/controller.inject.js',
				codec: {
					encode: url => {
						if (!url) return url;
						return encodeURIComponent(
							url
								.toString()
								.split('')
								.map((char, ind) =>
									ind % 2
										? String.fromCharCode(
												char.charCodeAt(0) ^ 3
											)
										: char
								)
								.join('')
						);
					},

					decode: url => {
						if (!url) return url;
						let [input, ...search] = url.split('?');

						return (
							decodeURIComponent(input)
								.split('')
								.map((char, ind) =>
									ind % 2
										? String.fromCharCode(
												char.charCodeAt(0) ^ 3
											)
										: char
								)
								.join('') +
							(search.length ? '?' + search.join('?') : '')
						);
					}
				}
			};

			this.swConfigSettings = {};
			this.config = {
				uv: {
					type: 'sw',
					file: '/sw.js',
					config: window.__uv$config,
					func: null
				},
				sj: {
					type: 'sw',
					file: '/sw.js',
					config: this.scramConfig,
					func: async () => {
						await this.bootController();
					}
				}
			};
			this.proxySetting = (await this.settings.getItem('proxy')) ?? 'sj';

			this.searchVar =
				(await this.settings.getItem('search')) ||
				'https://search.brave.com/search?q=%s';
			this.transportVar =
				(await this.settings.getItem('transports')) || 'libcurl';
			this.wispUrl =
				(await this.settings.getItem('wisp')) ||
				(location.protocol === 'https:' ? 'wss' : 'ws') +
					'://' +
					location.host +
					'/w/';
		})();
	}

	private async transportOptions(): Promise<Record<string, any>> {
		const wispUrl =
			this.wispUrl ||
			(location.protocol === 'https:' ? 'wss' : 'ws') +
				'://' +
				location.host +
				'/w/';

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

	private async createTransport(): Promise<ProxyTransportInstance> {
		const transportFile =
			TRANSPORT_MODULES[this.transportVar] || TRANSPORT_MODULES.libcurl;

		const module = await import(/* @vite-ignore */ transportFile);
		const TransportClass: ProxyTransportConstructor =
			module.default ?? module.LibcurlClient ?? module.EpoxyTransport;

		if (typeof TransportClass !== 'function') {
			throw new Error(
				`No transport constructor exported by ${transportFile}`
			);
		}

		const transport = new TransportClass(await this.transportOptions());
		if (!transport.ready && typeof transport.init === 'function') {
			await transport.init();
		}

		return transport;
	}

	private async bootController(): Promise<void> {
		if (this.controllerBoot) return this.controllerBoot;

		this.controllerBoot = (async () => {
			const serviceworker = await this.registerSW(this.config.sj);

			for (const src of SCRAMJET_SCRIPTS) {
				await loadScript(src);
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
		} catch (error) {
			this.controllerBoot = null;
			throw error;
		}
	}

	async setTransports() {
		const transportFile =
			TRANSPORT_MODULES[this.transportVar] || TRANSPORT_MODULES.libcurl;
		const options = await this.transportOptions();

		await this.connection.setTransport(transportFile, [{ ...options }]);

		if (this.controller) {
			this.transport = await this.createTransport();
			this.controller.setTransport(this.transport);
		}

		console.log('[Proxy] Transport set with options:', options);
	}

	async swapWispServer(url: string) {
		this.wispUrl = url;
		await this.settings.setItem('wisp', url);
		await this.setTransports();
	}

	async getTransports() {
		const transport = await this.connection.getTransport();
		return transport;
	}

	search(input: string) {
		input = input.trim();
		const searchTemplate =
			this.searchVar || 'https://search.brave.com/search?q=%s';

		if (input.includes('.') && input.includes(' ')) {
			return searchTemplate.replace('%s', encodeURIComponent(input));
		}

		try {
			return new URL(input).toString();
		} catch (err) {
			try {
				const url = new URL(`http://${input}`);
				if (url.hostname.includes('.')) {
					return url.toString();
				}
				throw new Error('Invalid hostname');
			} catch (err) {
				return searchTemplate.replace('%s', encodeURIComponent(input));
			}
		}
	}

	async attachFrame(
		iframe: HTMLIFrameElement
	): Promise<ScramjetFrameInstance> {
		await this.bootController();

		const existing = this.frames.get(iframe);
		if (existing) return existing;

		const frame = this.controller!.createFrame(iframe);
		this.frames.set(iframe, frame);

		return frame;
	}

	async navigate(iframe: HTMLIFrameElement, url: string): Promise<void> {
		const target = this.search(url);

		switch (this.proxySetting) {
			case 'sj': {
				const frame = await this.attachFrame(iframe);
				frame.go(target);
				break;
			}
			default: {
				await this.registerSW(this.config.uv);
				await this.setTransports();

				const uvConfig = window.__uv$config;
				if (!uvConfig?.encodeUrl) {
					throw new Error('[Proxy] Ultraviolet config is not loaded');
				}

				iframe.src = uvConfig.prefix + uvConfig.encodeUrl(target);
			}
		}
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

		if (this.registration) return this.registration;

		this.registration = (async () => {
			const registration = await navigator.serviceWorker.register(
				swConfig.file,
				{ scope: '/', updateViaCache: 'none' }
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
			return await this.registration;
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

		const activeIframe: HTMLIFrameElement | null =
			document.querySelector('iframe.active');
		if (!activeIframe) {
			console.log('[Proxy] No active iframe found');
			return;
		}

		activeIframe.src = encodedUrl;
	}

	async convertURL(
		swConfig: Record<any, any>,
		proxySetting: string,
		url: string
	) {
		const swConfigSettings: Record<any, any> | null =
			swConfig[proxySetting] ?? null;

		if (!swConfigSettings) {
			return this.search(url);
		}

		const target = this.search(url);

		switch (proxySetting) {
			case 'sj': {
				await this.bootController();
				const prefix =
					this.controller?.prefix ?? this.scramConfig.prefix;
				return prefix + this.scramConfig.codec!.encode(target);
			}
			default: {
				await this.registerSW(swConfigSettings);
				await this.setTransports();

				const uvConfig = window.__uv$config;
				if (!uvConfig?.encodeUrl) {
					throw new Error('[Proxy] Ultraviolet config is not loaded');
				}

				return uvConfig.prefix + uvConfig.encodeUrl(target);
			}
		}
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

	async disableReflux() {
		await this.settings.setItem('RefluxStatus', 'false');
	}

	async enableReflux() {
		await this.settings.setItem('RefluxStatus', 'true');
	}

	async getRefluxStatus(): Promise<boolean> {
		const status = await this.settings.getItem('RefluxStatus');
		return status !== 'false';
	}

	async getAuthUrl(): Promise<string> {
		try {
			const productionAuthUrl = await this.settings.getItem(
				'production_auth_url'
			);
			if (productionAuthUrl && typeof productionAuthUrl === 'string') {
				return productionAuthUrl;
			}
			//return "https://demoplussrv.night-x.com/auth" CORS is a bitch
			return (
				(location.protocol === 'https:' ? 'https://' : 'http://') +
				location.host +
				'/auth'
			);
		} catch (error) {
			console.error('[Proxy] Error determining auth URL:', error);
			return 'https://demoplussrv.night-x.com/auth';
		}
	}

	async checkAuthentication(): Promise<boolean> {
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
