import * as BareMux from "@mercuryworkshop/bare-mux";
import { SettingsAPI } from "@utils/settings";

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
  registerSW(swConfig: any): Promise<void>;
  updateSW(): void;
  uninstallSW(): void;
  redirect(swConfig: Record<any, any>, proxySetting: string, url: string): Promise<void>;
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

  constructor() {
    this.connection = new BareMux.BareMuxConnection("/b/worker.js");

    this.settings = new SettingsAPI();

    this.ready = (async () => {
      this.scramConfig = {
        prefix: "/s/res/",
        files: {
          wasm: "/s/wasm.wasm",
          all: "/s/all.js",
          sync: "/s/sync.js",
        },
        siteFlags: {
          "https://discord.com/.*": {
            naiiveRewriter: false,
          },
        },
        flags: {
          captureErrors: false,
          cleanErrors: true,
          naiiveRewriter: false,
          rewriterLogs: false,
          scramitize: false,
          serviceworkers: false,
          sourcemaps: true,
          strictRewrites: true,
          syncxhr: false,
        },
        codec: {
          encode: (url) => {
            if (!url) return url;
            return encodeURIComponent(
              url
                .toString()
                .split("")
                .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 3) : char))
                .join(""),
            );
          },

          decode: (url) => {
            if (!url) return url;
            let [input, ...search] = url.split("?");

            return (
              decodeURIComponent(input)
                .split("")
                .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 3) : char))
                .join("") + (search.length ? "?" + search.join("?") : "")
            );
          },
        },
      };

      this.swConfigSettings = {};
      this.config = {
        uv: {
          type: "sw",
          file: "/sw.js",
          config: window.__uv$config,
          func: null,
        },
        sj: {
          type: "sw",
          file: "/sw.js",
          config: this.scramConfig,
          func: async () => {
            // @ts-ignore
            const { ScramjetController } = $scramjetLoadController();
            const scramjet = new ScramjetController(this.scramConfig);
            scramjet.init().then(async () => {
              await this.setTransports();
            });
            console.log("Scramjet Service Worker registered.");
          },
        },
      };
      this.proxySetting = (await this.settings.getItem("proxy")) ?? "sj";

      this.searchVar =
        (await this.settings.getItem("search")) || "https://www.duckduckgo.com/?q=%s";
      this.transportVar = (await this.settings.getItem("transports")) || "libcurl";
      this.wispUrl =
        (await this.settings.getItem("wisp")) ||
        (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/w/";
    })();
  }

  async setTransports() {
    console.log("[Proxy] setTransports() called");
    const transports = this.transportVar || "libcurl";
    const transportMap: Record<any, string> = {
      epoxy: "/ep/index.mjs",
      libcurl: "/l/index.mjs",
    };

    const transportFile = transportMap[transports] || "/l/index.mjs";

		/*const wispUrl =
			this.wispUrl ||
			(location.protocol === 'https:' ? 'wss' : 'ws') +
			'://' +
			location.host +
			'/w/';*/
		
		const wispUrl = "wss://daydreamx.pro/wisp/";

    const transportOptions: Record<string, any> = {
      wisp: wispUrl,
    };

    const remoteProxyServer = await this.getRemoteProxyServer();
    if (
      remoteProxyServer &&
      remoteProxyServer !== "undefined" &&
      remoteProxyServer !== "null" &&
      remoteProxyServer !== "disabled" &&
      remoteProxyServer !== "false" &&
      transportFile === "/l/index.mjs"
    ) {
      transportOptions.proxy = remoteProxyServer;
    }

    await this.connection.setTransport(transportFile, [{ ...transportOptions }]);

    /*await this.connection.setTransport(transportFile, [
	  { ...transportOptions },
	]);*/ // debug function

    console.log("[Proxy] Transport set with options:", transportOptions);
  }

  async getTransports() {
    const transport = await this.connection.getTransport();
    return transport;
  }

  search(input: string) {
    input = input.trim();
    const searchTemplate = this.searchVar || "https://www.duckduckgo.com/?q=%s";

    if (input.includes(".") && input.includes(" ")) {
      return searchTemplate.replace("%s", encodeURIComponent(input));
    }

    try {
      return new URL(input).toString();
    } catch (err) {
      try {
        const url = new URL(`http://${input}`);
        if (url.hostname.includes(".")) {
          return url.toString();
        }
        throw new Error("Invalid hostname");
      } catch (err) {
        return searchTemplate.replace("%s", encodeURIComponent(input));
      }
    }
  }

  async registerSW(swConfig: Record<any, any>) {
    console.log("[Proxy] registerSW() called with type:", swConfig.type, "file:", swConfig.file);
    switch (swConfig.type) {
      case "sw":
        if ("serviceWorker" in navigator) {
          const scpe: string = swConfig.config.prefix.match(/^\/[^/]+\//)?.[0] || "";
          console.log("[Proxy] Registering service worker with scope:", scpe);
          await navigator.serviceWorker.register(swConfig.file, {
            scope: scpe,
          });

          navigator.serviceWorker.ready.then(async () => {
            console.log("[Proxy] Service worker ready, setting up transports");
            await this.setTransports().then(async () => {
              const transport = await this.connection.getTransport();
              if (transport == null) {
                console.log("[Proxy] Transport null, retrying setTransports");
                this.setTransports();
              }
            });
            this.updateSW();
          });
        }
        break;
      case "iframe":
        console.log("iframe proxy selected");
        break;
      case "multi":
        console.log("multi proxy selected");
        break;
    }
  }

  updateSW() {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.update();
      });
    });
  }

  uninstallSW() {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
  }

  async redirect(swConfig: Record<any, any>, proxySetting: string, url: any) {
    console.log("[Proxy] redirect() called with url:", url, "proxySetting:", proxySetting);
    let swConfigSettings: Record<any, any> | null = null;
    swConfigSettings = swConfig[proxySetting];

    if (!swConfigSettings) {
      console.log("[Proxy] No swConfigSettings found, returning");
      return;
    }

    await this.registerSW(swConfigSettings);
    await this.setTransports();

    const activeIframe: HTMLIFrameElement | null = document.querySelector("iframe.active");
    if (!activeIframe) {
      console.log("[Proxy] No active iframe found");
      return;
    }

    switch (swConfigSettings.type) {
      case "sw": {
        let encodedUrl: string;
        encodedUrl =
          swConfigSettings.config.prefix + window.__uv$config.encodeUrl(this.search(url));
        console.log("[Proxy] Redirecting iframe to:", encodedUrl);
        activeIframe.src = encodedUrl;
        break;
      }
    }
  }

  async convertURL(swConfig: Record<any, any>, proxySetting: string, url: string) {
    console.log("[Proxy] convertURL() called with url:", url, "proxySetting:", proxySetting);
    let swConfigSettings: Record<any, any> | null = null;
    swConfigSettings = swConfig[proxySetting];

    if (!swConfigSettings) {
      console.log("[Proxy] No swConfigSettings, returning search url");
      return this.search(url);
    }

    await this.registerSW(swConfigSettings);
    await this.setTransports();

    let encodedUrl: string =
      swConfigSettings.config.prefix + window.__uv$config.encodeUrl(this.search(url));
    console.log("[Proxy] Converted URL to:", encodedUrl);
    return encodedUrl;
  }

	async fetch(url: string, params?: any): Promise<string> {
		await this.setTransports();
		const client = new BareMux.BareClient();
		let response: Response;

    if (params) {
      response = await client.fetch(url, params);
    } else {
      response = await client.fetch(url);
    }

    return await response.text();
  }

  async ping(server: string): Promise<{ online: boolean; ping: number | string }> {
    return new Promise((resolve) => {
      const websocket = new WebSocket(server);
      const startTime = Date.now();
      websocket.addEventListener("open", () => {
        const pingTime = Date.now() - startTime;
        websocket.close();
        resolve({ online: true, ping: pingTime });
      });
      websocket.addEventListener("message", () => {
        const pingTime = Date.now() - startTime;
        websocket.close();
        resolve({ online: true, ping: pingTime });
      });
      websocket.addEventListener("error", () => {
        websocket.close();
        resolve({ online: false, ping: "N/A" });
      });
      setTimeout(() => {
        websocket.close();
        resolve({ online: false, ping: "N/A" });
      }, 5000);
    });
  }

  async setRemoteProxyServer(server: string) {
    await this.settings.setItem("proxyServer", server);
  }

  async getRemoteProxyServer(): Promise<string> {
    return await this.settings.getItem("proxyServer");
  }

  async disableReflux() {
    await this.settings.setItem("RefluxStatus", "false");
  }

  async enableReflux() {
    await this.settings.setItem("RefluxStatus", "true");
  }

  async getRefluxStatus(): Promise<boolean> {
    const status = await this.settings.getItem("RefluxStatus");
    return status !== "false";
  }

  async getAuthUrl(): Promise<string> {
    try {
      const productionAuthUrl = await this.settings.getItem("production_auth_url");
      if (productionAuthUrl && typeof productionAuthUrl === "string") {
        return productionAuthUrl;
      }
      //return "https://demoplussrv.night-x.com/auth" CORS is a bitch
      return (location.protocol === "https:" ? "https://" : "http://") + location.host + "/auth";
    } catch (error) {
      console.error("[Proxy] Error determining auth URL:", error);
      return "https://demoplussrv.night-x.com/auth";
    }
  }

  async checkAuthentication(): Promise<boolean> {
    try {
      const module = await import(window.location.origin + "/p/index.mjs");
      const PlusClient = module.default;
      const client = new PlusClient();
      const sessionToken = await client.getSessionToken();
      return sessionToken !== null;
    } catch (error) {
      console.error("[Proxy] Error checking authentication:", error);
      return false;
    }
  }
}

export { Proxy };
