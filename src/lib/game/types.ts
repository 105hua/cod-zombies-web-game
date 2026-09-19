export type WeaponId = 'pistol' | 'rifle' | 'shotgun';
export type StationId = 'rifle' | 'shotgun' | 'box' | 'gate' | 'vitality' | 'upgrade';
export type PickupKind = 'ammo' | 'double' | 'instakill' | 'nuke';
export type RunPhase = 'ready' | 'playing' | 'paused' | 'dead';

export interface WeaponSpec {
	name: string;
	magazine: number;
	reserve: number;
	damage: number;
	interval: number;
	reload: number;
	pellets: number;
	spread: number;
}

export interface GameSnapshot {
	phase: RunPhase;
	round: number;
	remaining: number;
	intermission: number;
	points: number;
	health: number;
	maxHealth: number;
	stamina: number;
	weapon: WeaponId;
	weaponName: string;
	magazine: number;
	reserve: number;
	magazineSize: number;
	reloading: number;
	kills: number;
	headshots: number;
	elapsed: number;
	gateOpen: boolean;
	vitality: boolean;
	upgraded: boolean;
	doublePoints: number;
	instakill: number;
	message: string;
}

export interface HudSnapshot extends GameSnapshot {
	prompt: string;
	hit: number;
	damageFlash: number;
}

export interface GameSettings {
	sensitivity: number;
	volume: number;
}

export interface Obstacle {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
	gate?: boolean;
}

export interface Station {
	id: StationId;
	x: number;
	z: number;
	label: string;
}
