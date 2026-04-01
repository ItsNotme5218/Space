import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { allowedHosts } from './srv/vite/hosts';
import { viteStaticCopy} from 'vite-plugin-static-copy';
import { copyRoutes } from './srv/vite/copy';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		tsconfigPaths({
			ignoreConfigErrors: true,
			projects: ['./tsconfig.json']
		}),
		viteStaticCopy(copyRoutes())
	],
	css: {
		transformer: 'lightningcss'
	},
	build: {
		cssCodeSplit: true,
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				newtab: resolve(__dirname, 'newtab.html')
			}
		}
	},
	server: {
		allowedHosts: allowedHosts,
		watch: {
			ignored: ['**/.github/**']
		},
		proxy: {
			'/api': {
				target: 'http://localhost:6060',
				changeOrigin: true
			},
			'/w/': {
				target: 'ws://localhost:6060/w/',
				changeOrigin: true,
				ws: true,
				rewrite: path => path.replace(/^\/w\//, '')
			},
			'/auth': {
				target: 'http://localhost:6060',
				changeOrigin: true
			}
		}
	}
});
