import { expect, it, vi } from 'vitest';
import { Engine } from '@babylonjs/core/Engines/engine';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Game } from './Game';
import type { HudSnapshot } from '../types';

it('keeps firing when a different touch pointer is released', async () => {
	const canvas = document.createElement('canvas');
	document.body.append(canvas);
	let latest: HudSnapshot | undefined;
	const game = new Game(canvas, (state) => {
		latest = state;
	});
	try {
		await game.start();
		game.begin(true);
		game.setFiring(true);
		await expect.poll(() => latest?.magazine).toBeLessThan(8);
		window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', button: 0 }));
		const afterRelease = latest!.magazine;
		await expect.poll(() => latest?.magazine).toBeLessThan(afterRelease);
	} finally {
		game.dispose();
		canvas.remove();
	}
});

it('blocks the player from walking through a living zombie', async () => {
	const canvas = document.createElement('canvas');
	document.body.append(canvas);
	let latest: HudSnapshot | undefined;
	const game = new Game(canvas, (state) => {
		latest = state;
	});
	try {
		await game.start();
		game.begin(true);
		const scene = Engine.LastCreatedEngine!.scenes[0];
		const camera = scene.activeCamera!;
		await expect
			.poll(() => scene.getTransformNodeByName('zombie-0'), { timeout: 10000 })
			.not.toBeNull();
		const enemy = scene.getTransformNodeByName('zombie-0')!;
		enemy.position.set(0, 0, -11.9);
		const start = latest!.elapsed;
		game.setTouchMove(0, 1);
		await expect.poll(() => latest!.elapsed).toBeGreaterThan(start + 0.6);
		game.setTouchMove(0, 0);
		expect(camera.position.z).toBeLessThan(enemy.position.z - 0.6);
	} finally {
		game.dispose();
		canvas.remove();
	}
}, 15000);

it('completes reloads and presents shot flashes at low render rates', async () => {
	const canvas = document.createElement('canvas');
	document.body.append(canvas);
	let latest: HudSnapshot | undefined;
	const game = new Game(canvas, (state) => {
		latest = state;
	});
	try {
		await game.start();
		game.begin(true);
		const engine = Engine.LastCreatedEngine!;
		const render = engine.activeRenderLoops[0];
		engine.stopRenderLoop();
		vi.spyOn(engine, 'getDeltaTime').mockReturnValue(250);
		const flash = engine.scenes[0].getMeshByName('muzzle-flash')!;
		game.setFiring(true);
		render();
		expect(latest!.elapsed).toBeCloseTo(0.25);
		expect(latest!.magazine).toBe(7);
		expect(flash.isEnabled()).toBe(true);
		game.setFiring(false);
		window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
		render();
		expect(flash.isEnabled()).toBe(false);
		for (let i = 0; i < 6; i++) render();
		expect(latest!.magazine).toBe(8);
		expect(latest!.reserve).toBe(79);
	} finally {
		vi.restoreAllMocks();
		game.dispose();
		canvas.remove();
	}
});

it.each([false, true])(
	'auto-reloads an empty magazine with the trigger held: %s',
	async (keepFiring) => {
		const canvas = document.createElement('canvas');
		document.body.append(canvas);
		let latest: HudSnapshot | undefined;
		const game = new Game(canvas, (state) => {
			latest = state;
		});
		try {
			await game.start();
			game.begin(true);
			const engine = Engine.LastCreatedEngine!;
			const render = engine.activeRenderLoops[0];
			engine.stopRenderLoop();
			vi.spyOn(engine, 'getDeltaTime').mockReturnValue(250);
			game.setFiring(true);
			for (let frame = 0; frame < 12 && latest!.magazine > 0; frame++) render();
			game.setFiring(keepFiring);

			expect(latest!.magazine).toBe(0);
			expect(latest!.reloading).toBeGreaterThan(0);
			expect(latest!.reserve).toBe(80);
			render();
			expect(latest!.magazine).toBe(0);
			expect(latest!.reserve).toBe(80);
			for (let frame = 0; frame < 5; frame++) render();

			expect(latest!.reloading).toBe(0);
			expect(latest!.reserve).toBe(72);
			if (keepFiring) {
				expect(latest!.magazine).toBeGreaterThan(0);
				expect(latest!.magazine).toBeLessThan(8);
			} else {
				expect(latest!.magazine).toBe(8);
			}
		} finally {
			vi.restoreAllMocks();
			game.dispose();
			canvas.remove();
		}
	}
);

it.each(['fire', 'aim'] as const)(
	'keeps mouse look and both buttons independent when holding %s first',
	async (first) => {
		const canvas = document.createElement('canvas');
		document.body.append(canvas);
		let latest: HudSnapshot | undefined;
		const game = new Game(canvas, (state) => {
			latest = state;
		});
		try {
			await game.start();
			game.begin(true);
			vi.spyOn(document, 'pointerLockElement', 'get').mockReturnValue(canvas);
			const engine = Engine.LastCreatedEngine!;
			const camera = engine.scenes[0].activeCamera as UniversalCamera;
			const render = engine.activeRenderLoops[0];
			engine.stopRenderLoop();
			vi.spyOn(engine, 'getDeltaTime').mockReturnValue(250);
			const pointer = (type: string, buttons: number, button: number, movementX = 0) =>
				canvas.dispatchEvent(
					new PointerEvent(type, {
						bubbles: true,
						pointerType: 'mouse',
						buttons,
						button,
						movementX
					})
				);

			pointer('pointerdown', first === 'fire' ? 1 : 2, first === 'fire' ? 0 : 2);
			const yaw = camera.rotation.y;
			pointer('pointermove', first === 'fire' ? 1 : 2, -1, 40);
			expect(camera.rotation.y).toBeGreaterThan(yaw);

			// Chorded mouse presses/releases arrive as pointermove, not pointerdown/up.
			pointer('pointermove', 3, first === 'fire' ? 2 : 0);
			render();
			expect(latest!.magazine).toBeLessThan(8);
			expect(camera.fov).toBeLessThan(1);

			// Releasing fire must stop shots without leaving aim.
			pointer('pointermove', 2, 0);
			const magazine = latest!.magazine;
			render();
			render();
			expect(latest!.magazine).toBe(magazine);
			expect(camera.fov).toBeLessThan(1);

			pointer('pointermove', 3, 0);
			// Releasing aim must restore hip fire without stopping shots.
			pointer('pointermove', 1, 2);
			render();
			expect(latest!.magazine).toBeLessThan(magazine);
			expect(camera.fov).toBeGreaterThan(1);

			pointer('pointerup', 0, 0);
			const afterRelease = latest!.magazine;
			render();
			render();
			expect(latest!.magazine).toBe(afterRelease);
		} finally {
			vi.restoreAllMocks();
			game.dispose();
			canvas.remove();
		}
	}
);
