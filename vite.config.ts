import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [react(), tailwindcss()],
	css: {
		transformer: 'lightningcss'
	},
	build: {
		cssCodeSplit: false
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
			'@components': resolve(__dirname, './src/components'),
			'@pages': resolve(__dirname, './src/pages'),
			'@hooks': resolve(__dirname, './src/hooks'),
			'@utils': resolve(__dirname, './src/utils'),
			'@assets': resolve(__dirname, './src/assets')
		}
	}
});
