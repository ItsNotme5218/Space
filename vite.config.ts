import { defineConfig, loadEnv } from 'vite';
import { runtimeConfigPlugin } from './srv/vite/runtime-config';
import { fontObfuscationPlugin } from './srv/vite/font';
import { svgHostPlugin } from './srv/vite/svg-host';
import { analyticsInlinePlugin } from './srv/vite/analytics-inline';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { allowedHosts } from './srv/vite/hosts.ts';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { copyRoutes } from './srv/vite/copy.ts';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => ({
	// Views use MemoryRouter; only real HTML documents should resolve over HTTP.
	appType: 'mpa',
	base: process.env.SPACE_BUILD_MODE === 'static' ? './' : '/',
	plugins: [
		runtimeConfigPlugin({
			...loadEnv(mode, process.cwd(), 'SPACE_'),
			...process.env
		}),
		fontObfuscationPlugin(),
		// Bakes the analytics fallback before the SVG host embeds index.html.
		analyticsInlinePlugin('G-3DTW1KTNCF', { htmlEntries: ['index.html'] }),
		svgHostPlugin(),
		react(),
		tailwindcss(),
		viteStaticCopy(copyRoutes())
	],
	resolve: {
		tsconfigPaths: true,
		alias: {
			'@': resolve(__dirname, 'src'),
			'@components': resolve(__dirname, 'src/components'),
			'@pages': resolve(__dirname, 'src/pages'),
			'@hooks': resolve(__dirname, 'src/hooks'),
			'@utils': resolve(__dirname, 'src/utils'),
			'@assets': resolve(__dirname, 'src/assets'),
			'@json': resolve(__dirname, 'src/json')
		}
	},
	css: {
		transformer: 'lightningcss'
	},
	build: {
		target: 'esnext',
		cssCodeSplit: true,
		cssMinify: 'lightningcss',
		assetsInlineLimit: 4096,
		chunkSizeWarningLimit: 1000,
		reportCompressedSize: false,
		rolldownOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				newtab: resolve(__dirname, 'newtab.html')
			},
			output: {
				codeSplitting: {
					minSize: 10000,
					groups: [
						{
							name: 'vendor-react',
							test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
							priority: 20
						},
						{
							name: 'vendor-motion',
							test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
							priority: 20
						},
						{
							name: 'vendor-lucide',
							test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
							priority: 20
						},
						{
							name: 'vendor-utils',
							test: /[\\/]node_modules[\\/](axios|localforage|chalk)[\\/]/,
							priority: 20
						}
					]
				}
			}
		}
	},
	server: {
		allowedHosts: allowedHosts,
		warmup: {
			clientFiles: ['./src/main.tsx', './src/App.tsx', './src/index.css']
		},
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
}));
