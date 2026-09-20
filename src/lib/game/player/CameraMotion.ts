import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';

/** Distance-driven presentation; never changes horizontal position or the player's aim. */
export class CameraMotion {
	private readonly eyeHeight: number;
	private gait = 0;
	private moving = 0;
	private ads = 0;
	private sprint = 0;

	constructor(private readonly camera: UniversalCamera) {
		this.eyeHeight = camera.position.y;
	}

	get phase(): number {
		return this.gait;
	}

	get movement(): number {
		return this.moving;
	}

	update(
		dt: number,
		distance: number,
		strafeSpeed: number,
		sprinting: boolean,
		aiming: boolean
	): void {
		if (dt <= 0) return;
		const response = 1 - Math.exp(-14 * dt);
		this.moving += (Math.min(1, distance / (4.2 * dt)) - this.moving) * response;
		this.ads += (Number(aiming) - this.ads) * response;
		this.sprint += (Number(sprinting) - this.sprint) * (1 - Math.exp(-9 * dt));
		// One full left/right stride spans 3.6 metres. Blocked movement cannot advance it.
		this.gait = (this.gait + (distance * Math.PI * 2) / 3.6) % (Math.PI * 2);
		const free = 1 - this.ads * 0.9;
		const bob = Math.cos(this.gait * 2) * (0.011 + this.sprint * 0.007) * this.moving;
		this.camera.position.y = this.eyeHeight + bob * free;
		const roll =
			(-Math.max(-1, Math.min(1, strafeSpeed / 6.4)) * 0.01 +
				Math.sin(this.gait) * this.moving * 0.0015) *
			free;
		this.camera.rotation.z += (roll - this.camera.rotation.z) * (1 - Math.exp(-10 * dt));
		const fov = aiming ? 0.82 : sprinting ? 1.35 : 1.25;
		this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-10 * dt));
	}
}
