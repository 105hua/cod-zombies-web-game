import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	// Prebundle lazy game dependencies before browser tests start; late discovery reloads the page.
	optimizeDeps: {
		include: [
			'@babylonjs/core/Cameras/universalCamera',
			'@babylonjs/core/Culling/ray',
			'@babylonjs/core/Lights/directionalLight',
			'@babylonjs/core/Lights/pointLight',
			'@babylonjs/core/Lights/Shadows/shadowGenerator',
			'@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent',
			'@babylonjs/core/Materials/imageProcessingConfiguration',
			'@babylonjs/core/Materials/Textures/rawTexture',
			'@babylonjs/core/Materials/Textures/dynamicTexture',
			'@babylonjs/core/Meshes/mesh',
			'@babylonjs/core/Meshes/transformNode'
		]
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
