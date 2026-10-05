declare global {
  interface Window {
    $scramjetController: ScramjetControllerAPI;
    settings: SettingsAPI;
    eventsAPI: EventSystem;
    proxy: import("./runtime").SpaceRuntime;
    logging: Logger;
    SWconfig: any;
    SWSettings: any;
    ProxySettings: string;
    doc: ShadowRoot;
  }

  interface SWConfig {
    type: string;
    file: string;
    config: any;
    func: Function;
  }

  /**
   * Scramjet 2.0.67+ controller config. The old `files.all` / `files.sync`
   * bundle layout is gone; the engine, wasm and inject script are each
   * addressed by path.
   */
  interface SJConfig {
    prefix: string;
    scramjetPath: string;
    wasmPath: string;
    injectPath: string;
    virtualWasmPath?: string;
    codec?: {
      encode: (url: string) => string;
      decode: (url: string) => string;
    };
  }

  interface ScramjetControllerInit {
    serviceworker: ServiceWorker;
    transport: unknown;
    config?: Partial<SJConfig>;
    scramjetConfig?: Record<string, any>;
  }

  interface ScramjetFrameInstance {
    element: HTMLIFrameElement;
    prefix: string;
    back(): void;
    forward(): void;
    reload(): void;
    go(url: string): void;
  }

  interface ScramjetControllerInstance {
    prefix: string;
    config: SJConfig;
    frames: ScramjetFrameInstance[];
    isReady: boolean;
    wait(): Promise<void>;
    setTransport(transport: unknown): void;
    createFrame(element?: HTMLIFrameElement, options?: Record<string, any>): ScramjetFrameInstance;
  }

  interface ScramjetControllerAPI {
    Controller: new (init: ScramjetControllerInit) => ScramjetControllerInstance;
    Frame: new (...args: any[]) => ScramjetFrameInstance;
    config: SJConfig;
    VERSION: string;
    assertRuntimeScramjetVersion(): void;
  }
}

export {};
