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
