import type { Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convertHtmlToSvg } from './svg';

// Adapted from Nebula's build/svgHost.ts (AGPL-3.0, see LICENSE).
// Readiness is application-owned and is not a proxy capability assertion.
export function createSvgHost(entry = './index.html'): string {
	const literal = JSON.stringify(entry).replace(
		/[<>&]/g,
		c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
	);
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <foreignObject x="0" y="0" width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:100%;height:100%;margin:0;overflow:hidden;background:#101018;color:white;font:16px sans-serif;">
      <iframe id="app-frame" title="Space" style="display:block;border:0;width:100%;height:100%"></iframe>
      <div id="status" role="status" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;">Loading Space…</div>
    </div>
  </foreignObject>
  <script><![CDATA[
    (function () {
      var frame = document.getElementById('app-frame');
      var status = document.getElementById('status');
      var requestId = crypto.randomUUID();
      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        window.removeEventListener('message', ready);
        status.textContent = ok ? '' : 'Unable to load Space. Please reload this page.';
        status.style.display = ok ? 'none' : 'flex';
      }
      function ready(event) {
        var data = event.data;
        // Only inspect the WindowProxy on receipt, never during child bootstrap.
        if (data && data.type === 'space-svg-ready' && data.requestId === requestId && event.source === frame.contentWindow) finish(true);
      }
      window.addEventListener('message', ready);
      var deadline = setTimeout(function () { finish(false); }, 15000);
      frame.addEventListener('error', function () { finish(false); });
      var url = new URL(${literal}, window.location.href);
      var current = new URL(window.location.href);
      if (current.search) url.search = current.search;
      url.hash = (current.hash || url.hash) + '&space-svg-request=' + encodeURIComponent(requestId);
      frame.setAttribute('src', url.href);
    })();
  ]]></script>
</svg>`;
}

export function createEmbeddedSvg(html: string): string {
	return convertHtmlToSvg(html);
}

export function svgHostPlugin(): Plugin {
	let outDir = '';
	return {
		name: 'space-svg-host',
		generateBundle() {
			this.emitFile({
				type: 'asset',
				fileName: 'index.svg',
				source: createSvgHost()
			});
		},
		configResolved(config) {
			outDir = resolve(config.root, config.build.outDir);
		},
		closeBundle() {
			const htmlPath = resolve(outDir, 'index.html');
			try {
				writeFileSync(
					resolve(outDir, 'index.svg'),
					createEmbeddedSvg(readFileSync(htmlPath, 'utf8')),
					'utf8'
				);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
					throw error;
			}
		},
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url?.split('?')[0] !== '/index.svg') return next();
				res.setHeader('Content-Type', 'image/svg+xml');
				res.end(createSvgHost());
			});
		}
	};
}
