declare global {
	interface Window {
		__uv$config: UVConfig;
		__scramjet$config: SJConfig;
		settings: SettingsAPI;
		eventsAPI: EventSystem;
		proxy: Proxy;
		logging: Logger;
		SWconfig: any;
		SWSettings: any;
		ProxySettings: string;
		doc: ShadowRoot;
	}

	interface UVConfig {
		prefix: string;
		encodeUrl: Function;
		decodeUrl: Function;
		handler: string;
		client: string;
		bundle: string;
		config: string;
		sw: string;
	}

	interface SWConfig {
		type: string;
		file: string;
		config: any;
		func: Function;
	}

	interface SJOptions {
		prefix: string;
		globals?: {
			wrapfn: string;
			wrapthisfn: string;
			trysetfn: string;
			importfn: string;
			rewritefn: string;
			metafn: string;
			setrealmfn: string;
			pushsourcemapfn: string;
		};
		files: {
			wasm: string;
			shared: string;
			worker: string;
			client: string;
			sync: string;
		};
		flags?: {
			serviceworkers?: boolean;
			syncxhr?: boolean;
			naiiveRewriter?: boolean;
			strictRewrites?: boolean;
			rewriterLogs?: boolean;
			captureErrors?: boolean;
			cleanErrors?: boolean;
			scramitize?: boolean;
			sourcemaps?: boolean;
		};
		siteFlags?: {};
		codec?: {
			encode: string;
			decode: string;
		};
	}

	declare class ScramjetController {
		constructor(opts: SJOptions);
		init(path?: string): Promise<void>;
		encodeUrl(term: string): string;
	}
}

export {};
