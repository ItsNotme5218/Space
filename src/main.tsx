import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import indexStyles from './index.css?inline';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppsPage } from './pages/AppsPage.tsx';
import { GamesPage } from './pages/GamesPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { PlaybackPage } from './pages/PlaybackPage.tsx';
import { launchAboutBlank, launchBlob, applyCloak } from './lib/cloak.ts';

(() => {
	if (window !== window.top) return;
	const params = new URLSearchParams(window.location.search);
	if (params.has('redirect')) return;

	const readLocal = <T,>(key: string, fallback: T): T => {
		try {
			return JSON.parse(
				localStorage.getItem(key) || JSON.stringify(fallback)
			);
		} catch {
			return fallback;
		}
	};

	const tabCloak = readLocal('tabCloak', 'None');
	const autoBlank = readLocal('autoAboutBlank', false);
	const autoBlob = readLocal('autoBlob', false);

	applyCloak(tabCloak);

	if (autoBlank) {
		launchAboutBlank(tabCloak);
		return;
	}
	if (autoBlob) {
		launchBlob(tabCloak);
		return;
	}
})();

const originalDocumentOpen = document.open.bind(document);
const originalDocumentWrite = document.write.bind(document);
const originalDocumentWriteln = document.writeln.bind(document);
const originalDocumentClose = document.close.bind(document);

let shadowRoot: ShadowRoot | null = null;
let shadowDocument: Document | null = null;

const patchDocument = () => {
	Object.defineProperty(document, 'open', {
		value: (...args: Parameters<typeof document.open>) => {
			if (shadowDocument) {
				return shadowDocument;
			}
			return originalDocumentOpen(...args);
		},
		writable: true,
		configurable: true
	});

	Object.defineProperty(document, 'write', {
		value: (text: string) => {
			if (shadowRoot) {
				const temp = document.createElement('div');
				temp.innerHTML = text;
				while (temp.firstChild) {
					shadowRoot.appendChild(temp.firstChild);
				}
				return;
			}
			return originalDocumentWrite(text);
		},
		writable: true,
		configurable: true
	});

	Object.defineProperty(document, 'writeln', {
		value: (text: string) => {
			if (shadowRoot) {
				const temp = document.createElement('div');
				temp.innerHTML = text + '\n';
				while (temp.firstChild) {
					shadowRoot.appendChild(temp.firstChild);
				}
				return;
			}
			return originalDocumentWriteln(text);
		},
		writable: true,
		configurable: true
	});

	Object.defineProperty(document, 'close', {
		value: () => {
			if (shadowRoot) {
				return;
			}
			return originalDocumentClose();
		},
		writable: true,
		configurable: true
	});
};

const initShadowApp = () => {
	const staticShell = document.getElementById('static-shell');
	if (staticShell) {
		staticShell.style.display = 'none';
	}

	const appHost = document.getElementById('app-host')!;
	shadowRoot = appHost.attachShadow({ mode: 'open' });

	const styleSheet = document.createElement('style');
	styleSheet.textContent = indexStyles;
	shadowRoot.appendChild(styleSheet);

	const uConfig = document.createElement('script');
	uConfig.src = '/u/config.js';
	uConfig.defer = true;
	document.head.appendChild(uConfig);
	const sConfig = document.createElement('script');
	sConfig.src = '/s/config.js';
	sConfig.defer = true;
	document.head.appendChild(sConfig);
	const sBundle = document.createElement('script');
	sBundle.src = '/s/all.js';
	sBundle.defer = true;
	document.head.appendChild(sBundle);

	const root = document.createElement('div');
	root.id = 'root';
	root.style.width = '100%';
	root.style.height = '100%';
	root.style.position = 'fixed';
	root.style.inset = '0';
	shadowRoot.appendChild(root);

	shadowDocument = document.implementation.createHTMLDocument('');

	patchDocument();
	window.doc = shadowRoot;

	createRoot(root).render(
		<StrictMode>
			<MemoryRouter initialEntries={['/']}>
				<Routes>
					<Route path="/" element={<App />}>
						<Route path="apps" element={<AppsPage />} />
						<Route path="games" element={<GamesPage />} />
						<Route path="settings" element={<SettingsPage />} />
						<Route path="playback" element={<PlaybackPage />} />
					</Route>
				</Routes>
			</MemoryRouter>
		</StrictMode>
	);
};

initShadowApp();
