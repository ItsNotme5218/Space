import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NewTab } from './components/NewTab';
import './index.css';

const rootElement = document.getElementById('newtab-root');
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<NewTab />
		</StrictMode>
	);
}
