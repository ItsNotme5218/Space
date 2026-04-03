import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { refluxPath } from "@nightnetwork/reflux";
import { enigmaPath } from "@nightnetwork/enigma/path";
import { baremuxPath as bmworkerPath } from "@nightnetwork/bm-plusworker/path";
import path from "path";

export const routePaths = {
  epoxy: "ep",
  scramjet: "s",
  libcurl: "l",
  uv: "u",
  reflux: "r",
  enigma: "en",
  auth: "",
  bmworker: "b",
  plusClient: "p",
};

const authPath = path.resolve("node_modules/@nightnetwork/night-auth/dist/login");
const plusClientPath = path.resolve("node_modules/@nightnetwork/plus-client/dist");

const copyMap = {
  epoxy: {
    path: epoxyPath,
    files: ["*"],
    dest: routePaths.epoxy,
  },
  uv: {
    path: uvPath,
    files: [
      { name: "uv.bundle.js", rename: "bundle.js" },
      { name: "uv.handler.js", rename: "handler.js" },
      { name: "uv.client.js", rename: "client.js" },
      { name: "uv.sw.js", rename: "worker.js" },
    ],
    dest: routePaths.uv,
  },
  scramjet: {
    path: scramjetPath,
    files: [
      { name: "scramjet.all.js", rename: "all.js" },
      { name: "scramjet.sync.js", rename: "sync.js" },
      { name: "scramjet.wasm.wasm", rename: "wasm.wasm" },
    ],
    dest: routePaths.scramjet,
  },
  libcurl: {
    path: libcurlPath,
    files: ["*"],
    dest: routePaths.libcurl,
  },
  reflux: {
    path: refluxPath,
    files: ["*"],
    dest: routePaths.reflux,
  },
  enigma: {
    path: enigmaPath,
    files: ["*"],
    dest: routePaths.enigma,
  },
  auth: {
    path: authPath,
    files: [
      "assets/nightloginflow.css",
      "night-login-frame.umd.js",
      "night-login.umd.js",
      "night-login.es.js.map",
      "vite.svg",
      "nightlogo.png",
      "nightloginflow.css",
      "bg_alt.jpeg",
      "nightplus.png",
      "nightplusheader.png",
      "nightplus_icon.png",
      "night-login-frame.es.js",
      "night-login.umd.js.map",
      "night-login-frame.es.js.map",
      "night-login-frame.umd.js.map",
      "night-login.es.js",
      "bg.png",
      "bg_alt_2.png",
    ],
    dest: routePaths.auth,
  },
  plusClient: {
    path: plusClientPath,
    files: ["*"],
    dest: routePaths.plusClient,
  },
  bmworker: {
    path: bmworkerPath,
    files: ["*"],
    dest: routePaths.bmworker,
  },
};

function normalizePath(p: string) {
  return p.replace(/\\/g, "/");
}

function generateStaticCopyTargets(map: typeof copyMap) {
  const targets: any[] = [];

  for (const key in map) {
    const entry = map[key as keyof typeof copyMap];
    const basePath = normalizePath(entry.path);
    const files = entry.files;

    for (const file of files) {
      if (typeof file === "string") {
        targets.push({
          src: `${basePath}/${file}`,
          dest: entry.dest,
        });
      } else {
        targets.push({
          src: `${basePath}/${file.name}`,
          dest: entry.dest,
          rename: file.rename,
        });
      }
    }
  }

  return targets;
}

export function copyRoutes() {
  return {
    targets: generateStaticCopyTargets(copyMap),
  };
}
