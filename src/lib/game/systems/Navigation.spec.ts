import { expect, it } from 'vitest';
import { Navigation } from './Navigation';

it('routes a zombie out of a blocked rounded cell around an armory', () => {
	const navigation = new Navigation([{ minX: 18.3, maxX: 19.1, minZ: -14.9, maxZ: -11.1 }]);
	const enemy = { x: 19.49, z: -13 };
	const player = { x: 17, z: -13 };
	navigation.rebuild(player.x, player.z);
	for (let step = 0; step < 600; step++) {
		const direction = navigation.direction(enemy.x, enemy.z, player.x, player.z);
		navigation.move(enemy, direction.x * 0.04, direction.z * 0.04);
	}
	expect(Math.hypot(enemy.x - player.x, enemy.z - player.z)).toBeLessThan(0.2);
});

it('pursues directly across open ground instead of steering through grid centers', () => {
	const navigation = new Navigation([]);
	navigation.rebuild(8, 3);
	const direction = navigation.direction(0, 0, 8, 3);
	expect(direction.x).toBeCloseTo(8 / Math.hypot(8, 3));
	expect(direction.z).toBeCloseTo(3 / Math.hypot(8, 3));
});

it('keeps direct pursuit behind a closed gate and takes the opening when unlocked', () => {
	const navigation = new Navigation([{ minX: -2, maxX: 2, minZ: 2, maxZ: 2.2, gate: true }]);
	navigation.rebuild(0, 6);
	const closed = navigation.direction(0, 1, 0, 6);
	expect(Math.abs(closed.x)).toBeGreaterThan(0.1);
	navigation.gateOpen = true;
	navigation.rebuild(0, 6);
	const open = navigation.direction(0, 1, 0, 6);
	expect(open.x).toBeCloseTo(0);
	expect(open.z).toBeCloseTo(1);
});
