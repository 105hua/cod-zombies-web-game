import { afterEach, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Horde } from './Horde';
import { Navigation } from '../systems/Navigation';

let engine: NullEngine | undefined;
afterEach(() => engine?.dispose());

function createHorde() {
	engine = new NullEngine();
	const scene = new Scene(engine);
	const horde = new Horde(scene);
	horde.spawn(0, 0, 1);
	return { scene, horde };
}

it('allows a player to evade a committed attack before contact', () => {
	const { horde } = createHorde();
	const navigation = new Navigation([]);
	const player = { x: 0, z: 0.9 };
	let hits = 0;
	const hit = () => hits++;
	horde.update(0.05, 0.05, player, navigation, hit);
	expect(hits).toBe(0);
	player.z = 3;
	for (let step = 0; step < 8; step++)
		horde.update(0.05, 0.1 + step * 0.05, player, navigation, hit);
	expect(hits).toBe(0);
	player.z = 0.9;
	for (let step = 0; step < 40; step++)
		horde.update(0.05, 0.5 + step * 0.05, player, navigation, hit);
	expect(hits).toBeGreaterThan(0);
});

it('does not damage a nearby player through solid cover', () => {
	const { horde } = createHorde();
	const navigation = new Navigation([{ minX: -2, maxX: 2, minZ: 0.4, maxZ: 0.5 }]);
	const player = { x: 0, z: 0.9 };
	let hits = 0;
	for (let step = 0; step < 60; step++)
		horde.update(0.05, step * 0.05, player, navigation, () => hits++);
	expect(hits).toBe(0);
});

it('routes around thin nearby cover instead of stopping within attack distance', () => {
	const { horde } = createHorde();
	const navigation = new Navigation([{ minX: -0.4, maxX: 0.4, minZ: 0.4, maxZ: 0.5 }]);
	const player = { x: 0, z: 0.9 };
	navigation.rebuild(player.x, player.z);
	let hits = 0;
	for (let step = 0; step < 160; step++) {
		horde.update(0.05, step * 0.05, player, navigation, () => hits++);
	}
	expect(hits).toBeGreaterThan(0);
});

it('removes dead enemies from shots immediately and expires their visual remains', () => {
	const { scene, horde } = createHorde();
	const enemy = horde.enemies[0];
	const ray = new Ray(new Vector3(0, 1.15, -3), Vector3.Forward(), 6);
	for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
	expect(scene.pickWithRay(ray)?.hit).toBe(true);
	horde.remove(enemy);
	horde.remove(enemy);
	expect(horde.enemies).toHaveLength(0);
	expect(scene.pickWithRay(ray)?.hit).toBe(false);
	expect(enemy.root.isDisposed()).toBe(false);
	const navigation = new Navigation([]);
	for (let step = 0; step < 80; step++)
		horde.update(0.05, step * 0.05, { x: 0, z: -3 }, navigation, () => {});
	expect(enemy.root.isDisposed()).toBe(true);
});
