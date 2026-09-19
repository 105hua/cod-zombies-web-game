import type { Obstacle } from '../types';

const SIZE = 45;
const OFFSET = 22;

export class Navigation {
	private readonly distance = new Int16Array(SIZE * SIZE);
	private readonly blocked = new Uint8Array(SIZE * SIZE);
	private readonly queue = new Int16Array(SIZE * SIZE);
	private readonly links = new Uint8Array(SIZE * SIZE);
	private cachedGate?: boolean;
	gateOpen = false;

	constructor(private readonly obstacles: Obstacle[]) {
		this.distance.fill(-1);
	}

	canStand(x: number, z: number, radius = 0.38) {
		if (Math.abs(x) > 21.4 || Math.abs(z) > 21.4) return false;
		return !this.obstacles.some(
			(wall) =>
				!(wall.gate && this.gateOpen) &&
				x + radius > wall.minX &&
				x - radius < wall.maxX &&
				z + radius > wall.minZ &&
				z - radius < wall.maxZ
		);
	}

	move(
		position: { x: number; z: number },
		dx: number,
		dz: number,
		radius = 0.38,
		canOccupy?: (x: number, z: number) => boolean
	) {
		if (
			this.canStand(position.x + dx, position.z, radius) &&
			(!canOccupy || canOccupy(position.x + dx, position.z))
		)
			position.x += dx;
		if (
			this.canStand(position.x, position.z + dz, radius) &&
			(!canOccupy || canOccupy(position.x, position.z + dz))
		)
			position.z += dz;
	}

	private clearPath(x: number, z: number, targetX: number, targetZ: number) {
		const steps = Math.max(1, Math.ceil(Math.hypot(targetX - x, targetZ - z) / 0.15));
		for (let step = 1; step <= steps; step++) {
			if (!this.canStand(x + ((targetX - x) * step) / steps, z + ((targetZ - z) * step) / steps))
				return false;
		}
		return true;
	}

	rebuild(x: number, z: number) {
		this.distance.fill(-1);
		if (this.cachedGate !== this.gateOpen) {
			this.cachedGate = this.gateOpen;
			this.links.fill(0);
			for (let iz = 0; iz < SIZE; iz++) {
				for (let ix = 0; ix < SIZE; ix++) {
					this.blocked[iz * SIZE + ix] = this.canStand(ix - OFFSET, iz - OFFSET) ? 0 : 1;
				}
			}
			for (let iz = 0; iz < SIZE; iz++) {
				for (let ix = 0; ix < SIZE; ix++) {
					const cell = iz * SIZE + ix;
					if (this.blocked[cell]) continue;
					for (let direction = 0; direction < 4; direction++) {
						const nx = ix + (direction === 0 ? -1 : direction === 1 ? 1 : 0);
						const nz = iz + (direction === 2 ? -1 : direction === 3 ? 1 : 0);
						if (nx < 0 || nx >= SIZE || nz < 0 || nz >= SIZE || this.blocked[nz * SIZE + nx])
							continue;
						// Edge midpoints catch narrow solids between otherwise free grid centers.
						if (this.canStand((ix + nx) / 2 - OFFSET, (iz + nz) / 2 - OFFSET))
							this.links[cell] |= 1 << direction;
					}
				}
			}
		}
		let target = -1;
		let nearest = Infinity;
		const cx = Math.round(x + OFFSET),
			cz = Math.round(z + OFFSET);
		for (let oz = -2; oz <= 2; oz++) {
			for (let ox = -2; ox <= 2; ox++) {
				const nx = cx + ox,
					nz = cz + oz;
				if (nx < 0 || nx >= SIZE || nz < 0 || nz >= SIZE || this.blocked[nz * SIZE + nx]) continue;
				const squared = (nx - OFFSET - x) ** 2 + (nz - OFFSET - z) ** 2;
				if (squared < nearest && this.clearPath(x, z, nx - OFFSET, nz - OFFSET)) {
					target = nz * SIZE + nx;
					nearest = squared;
				}
			}
		}
		if (target < 0) return;
		let front = 0;
		let back = 1;
		this.queue[0] = target;
		this.distance[target] = 0;
		while (front < back) {
			const cell = this.queue[front++];
			const cx = cell % SIZE;
			const cz = Math.floor(cell / SIZE);
			for (let direction = 0; direction < 4; direction++) {
				if (!(this.links[cell] & (1 << direction))) continue;
				const nx = cx + (direction === 0 ? -1 : direction === 1 ? 1 : 0);
				const nz = cz + (direction === 2 ? -1 : direction === 3 ? 1 : 0);
				if (nx < 0 || nx >= SIZE || nz < 0 || nz >= SIZE) continue;
				const next = nz * SIZE + nx;
				if (this.blocked[next] || this.distance[next] !== -1) continue;
				this.distance[next] = this.distance[cell] + 1;
				this.queue[back++] = next;
			}
		}
	}

	direction(x: number, z: number, targetX: number, targetZ: number) {
		const cx = Math.round(x + OFFSET);
		const cz = Math.round(z + OFFSET);
		let best = this.distance[cz * SIZE + cx];
		let bestX = targetX;
		let bestZ = targetZ;
		if (best < 0) {
			// A legal position can round into a wall cell. Rejoin the flow field
			// through a clear nearby cell instead of steering into the wall forever.
			let score = Infinity;
			bestX = x;
			bestZ = z;
			for (let oz = -2; oz <= 2; oz++) {
				for (let ox = -2; ox <= 2; ox++) {
					const nx = cx + ox;
					const nz = cz + oz;
					if (nx < 0 || nx >= SIZE || nz < 0 || nz >= SIZE) continue;
					const value = this.distance[nz * SIZE + nx];
					if (value < 0 || this.blocked[nz * SIZE + nx]) continue;
					const dx = nx - OFFSET - x;
					const dz = nz - OFFSET - z;
					const candidate = value + Math.hypot(dx, dz);
					if (candidate >= score) continue;
					if (!this.clearPath(x, z, nx - OFFSET, nz - OFFSET)) continue;
					score = candidate;
					bestX = nx - OFFSET;
					bestZ = nz - OFFSET;
				}
			}
		}
		if (best > 0 && (best > 1 || !this.clearPath(x, z, targetX, targetZ))) {
			bestX = cx - OFFSET;
			bestZ = cz - OFFSET;
			for (let oz = -1; oz <= 1; oz++) {
				for (let ox = -1; ox <= 1; ox++) {
					const nx = cx + ox;
					const nz = cz + oz;
					if (nx < 0 || nx >= SIZE || nz < 0 || nz >= SIZE) continue;
					const value = this.distance[nz * SIZE + nx];
					if (value < 0 || value >= best) continue;
					if (ox && oz && (this.blocked[cz * SIZE + nx] || this.blocked[nz * SIZE + cx])) continue;
					if (!this.clearPath(x, z, nx - OFFSET, nz - OFFSET)) continue;
					best = value;
					bestX = nx - OFFSET;
					bestZ = nz - OFFSET;
				}
			}
		}
		const dx = bestX - x;
		const dz = bestZ - z;
		const length = Math.hypot(dx, dz) || 1;
		return { x: dx / length, z: dz / length };
	}
}
