import type { GameSnapshot, PickupKind, StationId, WeaponId, WeaponSpec } from '../types';

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
	pistol: {
		name: 'M1911',
		magazine: 8,
		reserve: 80,
		damage: 34,
		interval: 0.3,
		reload: 1.4,
		pellets: 1,
		spread: 0
	},
	rifle: {
		name: 'AR-4',
		magazine: 30,
		reserve: 180,
		damage: 40,
		interval: 0.105,
		reload: 1.8,
		pellets: 1,
		spread: 0.009
	},
	shotgun: {
		name: 'Trench-12',
		magazine: 6,
		reserve: 48,
		damage: 28,
		interval: 0.8,
		reload: 2.2,
		pellets: 7,
		spread: 0.055
	}
};

export interface PurchaseQuote {
	cost: number;
	label: string;
	reason: string;
}

function initialState(): GameSnapshot {
	return {
		phase: 'ready',
		round: 0,
		remaining: 0,
		intermission: 0,
		points: 500,
		health: 100,
		maxHealth: 100,
		stamina: 100,
		weapon: 'pistol',
		weaponName: WEAPONS.pistol.name,
		magazine: WEAPONS.pistol.magazine,
		reserve: WEAPONS.pistol.reserve,
		magazineSize: WEAPONS.pistol.magazine,
		reloading: 0,
		kills: 0,
		headshots: 0,
		elapsed: 0,
		gateOpen: false,
		vitality: false,
		upgraded: false,
		doublePoints: 0,
		instakill: 0,
		message: ''
	};
}

export class Survival {
	public state: GameSnapshot = initialState();
	public alive = 0;

	private pending = 0;
	private spawnCooldown = 0;
	private shotCooldown = 0;
	private damageImmunity = 0;
	private healingDelay = 0;
	private messageTime = 0;
	private readonly random: () => number;

	constructor(random: () => number = Math.random) {
		this.random = random;
	}

	start(): void {
		this.state = initialState();
		this.state.phase = 'playing';
		this.alive = 0;
		this.pending = 0;
		this.spawnCooldown = 0;
		this.shotCooldown = 0;
		this.damageImmunity = 0;
		this.healingDelay = 0;
		this.messageTime = 0;
		this.nextRound(5);
	}

	pause(): void {
		if (this.state.phase === 'playing') this.state.phase = 'paused';
	}

	resume(): void {
		if (this.state.phase === 'paused') this.state.phase = 'playing';
	}

	tick(dt: number): number {
		if (this.state.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return 0;
		const state = this.state;
		state.elapsed += dt;
		this.shotCooldown = Math.max(0, this.shotCooldown - dt);
		this.damageImmunity = Math.max(0, this.damageImmunity - dt);
		const healingTime = Math.max(0, dt - this.healingDelay);
		this.healingDelay = Math.max(0, this.healingDelay - dt);
		state.health = Math.min(state.maxHealth, state.health + healingTime * 12);
		state.doublePoints = Math.max(0, state.doublePoints - dt);
		state.instakill = Math.max(0, state.instakill - dt);
		this.messageTime = Math.max(0, this.messageTime - dt);
		if (this.messageTime === 0) state.message = '';

		if (state.reloading > 0) {
			state.reloading = Math.max(0, state.reloading - dt);
			if (state.reloading === 0) {
				const rounds = Math.min(state.magazineSize - state.magazine, state.reserve);
				state.magazine += rounds;
				state.reserve -= rounds;
			}
		}

		const spawnTime = Math.max(0, dt - state.intermission);
		state.intermission = Math.max(0, state.intermission - dt);
		if (state.intermission > 0) return 0;
		this.spawnCooldown = Math.max(0, this.spawnCooldown - spawnTime);
		if (this.pending === 0 || this.alive >= 24 || this.spawnCooldown > 0) return 0;

		this.pending--;
		this.alive++;
		state.remaining = this.pending + this.alive;
		this.spawnCooldown = Math.max(0.45, 1.4 - (state.round - 1) * 0.045);
		return 1;
	}

	finishShot(triggerPressed = false): boolean {
		const state = this.state;
		if (
			state.phase !== 'playing' ||
			state.reloading > 0 ||
			(this.shotCooldown > 0 && !(triggerPressed && state.weapon === 'pistol')) ||
			state.magazine <= 0
		) {
			return false;
		}
		state.magazine--;
		this.shotCooldown = WEAPONS[state.weapon].interval;
		return true;
	}

	reload(): void {
		const state = this.state;
		if (
			state.phase !== 'playing' ||
			state.reloading > 0 ||
			state.magazine >= state.magazineSize ||
			state.reserve <= 0
		) {
			return;
		}
		state.reloading = WEAPONS[state.weapon].reload;
	}

	damage(amount: number): void {
		const state = this.state;
		if (state.phase !== 'playing' || this.damageImmunity > 0 || amount <= 0) return;
		state.health = Math.max(0, state.health - amount);
		this.damageImmunity = 0.7;
		this.healingDelay = 5;
		if (state.health === 0) {
			state.phase = 'dead';
			this.notify('SIGNAL LOST');
		}
	}

	hit(headshot: boolean, killed: boolean, melee = false): void {
		const state = this.state;
		if (state.phase !== 'playing' || (killed && this.alive <= 0)) return;
		const points = killed ? (melee ? 130 : headshot ? 100 : 60) : 10;
		state.points += points * (state.doublePoints > 0 ? 2 : 1);
		if (!killed) return;
		this.alive--;
		state.kills++;
		if (headshot && !melee) state.headshots++;
		state.remaining = this.pending + this.alive;
		if (this.pending === 0 && this.alive === 0) this.nextRound(7);
	}

	quote(id: StationId): PurchaseQuote {
		const state = this.state;
		let cost: number;
		let label: string;
		let reason = '';
		switch (id) {
			case 'gate':
				cost = 750;
				label = 'Release north yard gate';
				if (state.gateOpen) reason = 'Already open';
				break;
			case 'vitality':
				cost = 2000;
				label = 'Vitality tonic';
				if (state.vitality) reason = 'Already acquired';
				break;
			case 'upgrade':
				cost = 3000;
				label = `Overcharge ${state.weaponName}`;
				if (state.upgraded) reason = 'Already overcharged';
				break;
			case 'box':
				cost = 950;
				label = `Random Issue · replaces ${state.weaponName}`;
				break;
			case 'rifle':
			case 'shotgun':
				cost = id === 'rifle' ? 1000 : 1250;
				label = `${WEAPONS[id].name} · replaces ${state.weaponName}`;
				if (state.weapon === id) {
					cost /= 2;
					label = `Refill ${state.weaponName} reserve`;
					if (state.reserve >= WEAPONS[id].reserve) reason = 'Reserve full';
				}
				break;
		}
		if (!reason && state.points < cost) reason = `Need ${cost - state.points} more points`;
		return { cost, label, reason };
	}

	buy(id: StationId): boolean {
		const state = this.state;
		if (state.phase !== 'playing') return false;
		const { cost, reason } = this.quote(id);
		if (reason) return this.reject(reason);

		state.points -= cost;
		switch (id) {
			case 'gate':
				state.gateOpen = true;
				this.notify('Depot gate opened');
				break;
			case 'vitality':
				state.vitality = true;
				state.maxHealth = 200;
				state.health = state.maxHealth;
				this.notify('VITALITY · Maximum health increased');
				break;
			case 'upgrade':
				state.upgraded = true;
				this.notify('OVERCHARGED · Double weapon damage');
				break;
			case 'box': {
				const roll = this.random();
				this.equip(roll < 1 / 3 ? 'pistol' : roll < 2 / 3 ? 'rifle' : 'shotgun');
				break;
			}
			case 'rifle':
			case 'shotgun':
				if (state.weapon === id) {
					state.reserve = WEAPONS[id].reserve;
					this.notify('Reserve ammo replenished');
				} else {
					this.equip(id);
				}
				break;
		}
		return true;
	}

	pickup(kind: PickupKind): void {
		const state = this.state;
		if (state.phase !== 'playing') return;
		switch (kind) {
			case 'ammo':
				state.magazine = WEAPONS[state.weapon].magazine;
				state.reserve = WEAPONS[state.weapon].reserve;
				state.reloading = 0;
				this.notify('MAX AMMO');
				break;
			case 'double':
				state.doublePoints = 30;
				this.notify('DOUBLE POINTS · 30 seconds');
				break;
			case 'instakill':
				state.instakill = 20;
				this.notify('INSTA-KILL · 20 seconds');
				break;
			case 'nuke':
				this.notify('PURGE · Hostiles eliminated');
				break;
		}
	}

	notify(text: string): void {
		this.state.message = text;
		this.messageTime = 3;
	}

	snapshot(): GameSnapshot {
		this.state.remaining = this.pending + this.alive;
		return { ...this.state };
	}

	private nextRound(intermission: number): void {
		this.state.round++;
		this.pending = Math.min(90, 6 + (this.state.round - 1) * 3);
		this.state.remaining = this.pending + this.alive;
		this.state.intermission = intermission;
		this.spawnCooldown = 0;
		this.notify(`ROUND ${this.state.round} · Prepare yourself`);
	}

	private equip(weapon: WeaponId): void {
		const spec = WEAPONS[weapon];
		this.state.weapon = weapon;
		this.state.weaponName = spec.name;
		this.state.magazine = spec.magazine;
		this.state.reserve = spec.reserve;
		this.state.magazineSize = spec.magazine;
		this.state.reloading = 0;
		this.state.upgraded = false;
		this.shotCooldown = 0;
		this.notify(`${spec.name} acquired`);
	}

	private reject(message: string): false {
		this.notify(message);
		return false;
	}
}
