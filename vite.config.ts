import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { allowedHosts } from './srv/vite/hosts';
import { viteStaticCopy} from 'vite-plugin-static-copy';
import { copyRoutes } from './srv/vite/copy';

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
		cssCodeSplit: false
	},
	server: {
		allowedHosts: allowedHosts,
		watch: {
			ignored: ['**/.github/**']
		},
		proxy: {
			'/api': {
				target: 'http://localhost:8080',
				changeOrigin: true
			},
			'/w/': {
				target: 'ws://localhost:8080/w/',
				changeOrigin: true,
				ws: true,
				rewrite: path => path.replace(/^\/w\//, '')
			},
			'/auth': {
				target: 'http://localhost:8080',
				changeOrigin: true
			}
		}
	}
});
