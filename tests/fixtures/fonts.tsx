import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom';

const root = document
	.getElementById('app-host')!
	.attachShadow({ mode: 'open' });
const mount = document.createElement('div');
root.append(mount);
const decorationStyle = document.createElement('style');
decorationStyle.textContent = `
#decorated::before { content: "*"; }
#responsive-size, #responsive-hidden, #media-size { font-size: 16px; display: block; }
@media (min-width: 900px) {
  #responsive-size { font-size: 32px; }
  #responsive-hidden { display: none; }
}
@media (prefers-reduced-motion: reduce) { #media-size { font-size: 28px; } }
`;
root.append(decorationStyle);
localStorage.setItem(
	'font-fixture',
	JSON.stringify({
		url: 'https://example.org/game?q=hello',
		label: 'Saved Game'
	})
);
function Fixture() {
	const [count, setCount] = useState(0);
	const [size, setSize] = useState(16);
	return (
		<MemoryRouter initialEntries={['/games']}>
			<nav>
				<Link to="/games">Games</Link>{' '}
				<Link to="/settings">Settings</Link>
			</nav>
			<button onClick={() => setCount(n => n + 1)}>Update</button>
			<button onClick={() => setSize(n => (n === 16 ? 24 : 16))}>
				Resize
			</button>
			<span id="label" style={{ fontSize: size }}>
				{count % 2 ? 'Play Again' : 'Play Game'}
			</span>
			<input
				aria-label="URL input"
				defaultValue="https://example.org/game?q=hello"
				placeholder="Game URL"
			/>
			<textarea defaultValue="User text" />
			<a id="url" href="https://example.org/game?q=hello">
				https://example.org/game?q=hello
			</a>
			<pre>proxy-context-v1</pre>
			<span data-no-obfuscate>Saved Game</span>
			<span id="uppercase" style={{ textTransform: 'uppercase' }}>
				Styled Label
			</span>
			<span id="decorated">Decorated Label</span>
			<span id="responsive-size">Responsive Size</span>
			<span id="responsive-hidden">Responsive Visibility</span>
			<span id="media-size">Media Preference</span>
			<Routes>
				<Route path="/games" element={<h1>Games catalog</h1>} />
				<Route path="/settings" element={<h1>Settings panel</h1>} />
			</Routes>
		</MemoryRouter>
	);
}
createRoot(mount).render(<Fixture />);
// Dynamic import makes the RED fixture boot with readable React text even before tooling exists.
const runtimeUrl = '/srv/vite/font/runtime.ts';
import(/* @vite-ignore */ runtimeUrl)
	.then(async ({ installFontRuntime }) => {
		const runtime = await installFontRuntime(root);
		(window as unknown as { disposeFonts: () => void }).disposeFonts =
			runtime.dispose;
		document.body.dataset.fontSettled = 'true';
	})
	.catch(() => {
		document.body.dataset.fontSettled = 'missing';
	});
