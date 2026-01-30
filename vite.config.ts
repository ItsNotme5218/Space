import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { allowedHosts } from './srv/vite/hosts';

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		tsconfigPaths({
			ignoreConfigErrors: true,
			projects: ['./tsconfig.json']
		})
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
			'/wisp/': {
				target: 'ws://localhost:8080/wisp/',
				changeOrigin: true,
				ws: true,
				rewrite: path => path.replace(/^\/wisp\//, '')
			},
			'/auth': {
				target: 'http://localhost:8080',
				changeOrigin: true
			}
		}
	}
});
