import { afterEach, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Horde } from './Horde';
import { Navigation } from '../systems/Navigation';

let engine: NullEngine | undefined;
afterEach(() => engine?.dispose());

function createHorde(round = 1) {
	engine = new NullEngine();
	const scene = new Scene(engine);
	const horde = new Horde(scene);
	horde.spawn(0, 0, round);
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

it('turns toward a reversed target before advancing instead of skating backwards', () => {
	const { horde } = createHorde();
	const navigation = new Navigation([]);
	const player = { x: 0, z: 10 };
	navigation.rebuild(player.x, player.z);
	for (let frame = 0; frame < 60; frame++)
		horde.update(1 / 60, frame / 60, player, navigation, () => {});
	const enemy = horde.enemies[0];
	player.z = -10;
	navigation.rebuild(player.x, player.z);
	const before = enemy.root.position.clone();
	horde.update(1 / 60, 1, player, navigation, () => {});
	const dx = enemy.root.position.x - before.x;
	const dz = enemy.root.position.z - before.z;
	const forward = dx * Math.sin(enemy.root.rotation.y) + dz * Math.cos(enemy.root.rotation.y);
	expect(forward).toBeGreaterThanOrEqual(0);
	for (let frame = 0; frame < 240; frame++)
		horde.update(1 / 60, 1 + frame / 60, player, navigation, () => {});
	expect(enemy.root.position.z).toBeLessThan(before.z - 1);
});

it('builds momentum from rest rather than starting at cruising speed', () => {
	const { horde } = createHorde();
	const navigation = new Navigation([]);
	const player = { x: 0, z: 20 };
	navigation.rebuild(player.x, player.z);
	const enemy = horde.enemies[0];
	horde.update(1 / 60, 0, player, navigation, () => {});
	const firstStep = enemy.root.position.z;
	for (let frame = 0; frame < 90; frame++)
		horde.update(1 / 60, frame / 60, player, navigation, () => {});
	const before = enemy.root.position.z;
	horde.update(1 / 60, 2, player, navigation, () => {});
	expect(firstStep).toBeGreaterThan(0);
	expect(firstStep).toBeLessThan((enemy.root.position.z - before) * 0.4);
});

it('separates crowded attackers at close range and continues attacking', () => {
	const { horde } = createHorde();
	horde.enemies[0].root.position.x = -0.2;
	horde.spawn(0.2, 0, 1);
	const navigation = new Navigation([]);
	const player = { x: 0, z: 0.8 };
	navigation.rebuild(player.x, player.z);
	let laterHits = 0;
	for (let frame = 0; frame < 600; frame++) {
		horde.update(1 / 60, frame / 60, player, navigation, () => {
			if (frame > 300) laterHits++;
		});
	}
	expect(
		Vector3.Distance(horde.enemies[0].root.position, horde.enemies[1].root.position)
	).toBeGreaterThan(0.6);
	expect(laterHits).toBeGreaterThan(0);
});

it.each([1, 18])('keeps a supporting boot on the floor throughout the round %s gait', (round) => {
	const { scene, horde } = createHorde(round);
	const navigation = new Navigation([]);
	const player = { x: 0, z: 20 };
	navigation.rebuild(player.x, player.z);
	const soles = scene.meshes.filter((mesh) => mesh.name.startsWith('boot-sole'));
	const point = new Vector3();
	let lowest = Infinity;
	let highest = -Infinity;
	for (let frame = 0; frame < 180; frame++) {
		horde.update(1 / 60, frame / 60, player, navigation, () => {});
		let support = Infinity;
		for (const sole of soles) {
			const world = sole.computeWorldMatrix(true);
			const positions = sole.getVerticesData('position')!;
			for (let vertex = 0; vertex < positions.length; vertex += 3) {
				Vector3.TransformCoordinatesFromFloatsToRef(
					positions[vertex],
					positions[vertex + 1],
					positions[vertex + 2],
					world,
					point
				);
				support = Math.min(support, point.y);
			}
		}
		lowest = Math.min(lowest, support);
		highest = Math.max(highest, support);
	}
	expect(lowest).toBeGreaterThan(-0.01);
	expect(highest).toBeLessThan(0.01);
});
