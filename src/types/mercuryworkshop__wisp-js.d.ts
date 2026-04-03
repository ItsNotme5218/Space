declare module "@mercuryworkshop/wisp-js/server" {
  import { Server } from "node:http";

  export interface WispServer {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    routeRequest: (req: any, socket: any, head: any) => void;
  }

  export interface LoggingOptions {
    level?: "debug" | "info" | "warn" | "error";
  }

  export function server(httpServer: Server): WispServer;
  export const logging: LoggingOptions;
}
