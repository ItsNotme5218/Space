import { readSetting } from "../hooks/useLocalStorage";

export interface CloakPreset {
  title: string;
  favicon: string;
  redirect: string;
}

export const CLOAK_PRESETS: Record<string, CloakPreset> = {
  None: {
    title: "space",
    favicon: "/favicon.ico",
    redirect: "https://google.com",
  },
  Desmos: {
    title: "Desmos | Graphing Calculator",
    favicon: "https://www.desmos.com/assets/img/apps/graphing/favicon.ico",
    redirect: "https://www.desmos.com/calculator",
  },
  "Google Classroom": {
    title: "Google Classroom",
    favicon: "https://www.gstatic.com/classroom/favicon.png",
    redirect: "https://classroom.google.com",
  },
  "Google Drive": {
    title: "My Drive - Google Drive",
    favicon: "https://ssl.gstatic.com/images/branding/product/2x/hh_drive_36dp.png",
    redirect: "https://drive.google.com",
  },
  "Khan Academy": {
    title: "Khan Academy",
    favicon: "https://www.khanacademy.org/favicon.ico",
    redirect: "https://www.khanacademy.org",
  },
};

const URL_RE = /^(https?:\/\/)?[^\s/$.?#].[^\s]*\.[^\s]{2,}$/i;

export const normalizeUrl = (raw: string): string =>
  /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

const readLocal = async (key: string): Promise<string> => {
  return readSetting(key, "");
};

export const resolveCloak = async (
  preset: string,
): Promise<{ title: string; favicon: string; redirect: string } | null> => {
  switch (preset) {
    case "None":
      return null;

    case "Custom": {
      const rawFavicon = await readLocal("customCloakFavicon");
      const rawTitle = await readLocal("customCloakTitle");

      let favicon = "/favicon.ico";
      if (rawFavicon && URL_RE.test(rawFavicon)) {
        favicon = normalizeUrl(rawFavicon);
      }

      let title = "space";
      if (rawTitle) {
        title = URL_RE.test(rawTitle)
          ? (() => {
              try {
                return new URL(normalizeUrl(rawTitle)).hostname;
              } catch {
                return rawTitle;
              }
            })()
          : rawTitle;
      }

      return { title, favicon, redirect: "https://google.com" };
    }

    default:
      return CLOAK_PRESETS[preset] || null;
  }
};

const setFavicon = (doc: Document, href: string) => {
  let link = doc.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = doc.createElement("link");
    doc.head.appendChild(link);
  }
  link.type = "image/x-icon";
  link.rel = "shortcut icon";
  link.href = href;

  const img = new Image();
  img.onload = () => {
    link!.href = href;
  };
  img.onerror = () => {
    try {
      const fallback = new URL(href).origin + "/favicon.ico";
      if (fallback !== href) {
        link!.href = fallback;
      }
    } catch {}
  };
  img.src = href;
};

const applyToParent = (title: string, favicon: string) => {
  try {
    if (window.parent && window.parent.document !== document) {
      window.parent.document.title = title;
      setFavicon(window.parent.document, favicon);
    }
  } catch {}
};

export const applyCloak = async (preset: string) => {
  const cloak = await resolveCloak(preset);
  if (!cloak) {
    document.title = "space";
    setFavicon(document, "/favicon.ico");
    applyToParent("space", "/favicon.ico");
    return;
  }

  document.title = cloak.title;
  setFavicon(document, cloak.favicon);
  applyToParent(cloak.title, cloak.favicon);
};

export const launchAboutBlank = async (preset: string) => {
  const cloak = await resolveCloak(preset);
  const redirect = cloak?.redirect ?? "https://google.com";

  const win = window.open("", "_blank");
  if (!win) return;

  const iframe = win.document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:100vw;height:100vh;border:none;margin:0;padding:0;";
  iframe.src = window.location.href;

  win.document.body.style.margin = "0";
  win.document.body.style.overflow = "hidden";
  win.document.body.appendChild(iframe);

  if (cloak) {
    win.document.title = cloak.title;
    const link = win.document.createElement("link");
    link.rel = "shortcut icon";
    link.type = "image/x-icon";
    link.href = cloak.favicon;
    win.document.head.appendChild(link);
  }

  window.location.href = redirect;
};

export const launchBlob = async (preset: string) => {
  const cloak = await resolveCloak(preset);
  const redirect = cloak?.redirect ?? "https://google.com";
  const title = cloak?.title ?? "space";
  const favicon = cloak?.favicon ?? "/favicon.ico";

  const html = `<!DOCTYPE html>
<html>
<head>
<title>${title}</title>
<link rel="shortcut icon" type="image/x-icon" href="${favicon}">
<style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden}iframe{position:fixed;top:0;left:0;width:100%;height:100%;border:none}</style>
</head>
<body><iframe src="${window.location.href}"></iframe></body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url);

  if (win) {
    win.onload = () => {
      win.document.title = title;
    };
    window.location.href = redirect;
  }
};
