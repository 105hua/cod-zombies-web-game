import { Engine } from '@babylonjs/core/Engines/engine';
import { page } from 'vitest/browser';
import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GameCanvas from './GameCanvas.svelte';

it('releases the real renderer and scene when leaving the game', async () => {
	const initialEngines = Engine.Instances.length;
	const view = render(GameCanvas);
	let mounted = true;
	try {
		await expect.element(page.getByRole('button', { name: 'BEGIN SURVIVAL' })).toBeEnabled();
		const engine = Engine.Instances[initialEngines];
		const scene = engine.scenes[0];
		expect(engine.getRenderWidth()).toBeGreaterThan(0);
		await view.unmount();
		mounted = false;
		expect(scene.isDisposed).toBe(true);
		expect(Engine.Instances).toHaveLength(initialEngines);
	} finally {
		if (mounted) await view.unmount();
	}
});

it('can unmount during lazy loading without leaving a renderer behind', async () => {
	const initialEngines = Engine.Instances.length;
	const view = render(GameCanvas);
	await view.unmount();
	await import('$lib/game/core/Game');
	expect(Engine.Instances).toHaveLength(initialEngines);
});
