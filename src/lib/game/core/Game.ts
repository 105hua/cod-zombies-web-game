import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { createScene, type GameScene } from './SceneManager';
import { Survival, WEAPONS } from '../systems/Survival';
import { Navigation } from '../systems/Navigation';
import { Horde, type Zombie } from '../entities/Horde';
import { GameAudio } from '../systems/Audio';
import { WeaponView } from '../player/WeaponView';
import { CombatEffects } from '../systems/CombatEffects';
import type { GameSettings, HudSnapshot, PickupKind, Station } from '../types';

type Pickup = { mesh: TransformNode; kind: PickupKind; life: number };

// The engine owns simulation time. Svelte receives only throttled HUD snapshots.
export class Game {
	private readonly engine: Engine;
	private readonly observer: ResizeObserver;
	private readonly run = new Survival();
	private readonly audio = new GameAudio();
	private level?: GameScene;
	private horde?: Horde;
	private navigation?: Navigation;
	private weapon?: WeaponView;
	private effects?: CombatEffects;
	private pickups: Pickup[] = [];
	private keys = new Set<string>();
	private firing = false;
	private aiming = false;
	private disposed = false;
	private touch = false;
	private touchX = 0;
	private touchZ = 0;
	private sensitivity = 1;
	private sprintExhausted = false;
	private emptyCooldown = 0;
	private presenceCooldown = 2;
	private lookX = 0;
	private lookY = 0;
	private readonly shotDirection = new Vector3();
	private readonly shotRay = new Ray(Vector3.Zero(), Vector3.Forward(), 65);
	private readonly weaponState = {
		aiming: false,
		sprinting: false,
		movement: 0,
		reloading: false,
		reloadProgress: 0,
		lookX: 0,
		lookY: 0
	};
	private readonly audioState = { moving: false, sprinting: false, health: 100, stamina: 100 };
	private hit = 0;
	private damageFlash = 0;
	private meleeCooldown = 0;
	private meleePending = false;
	private navigationTimer = 0;
	private hudTimer = 0;
	private currentStation?: Station;
	private lastRound = 0;
	private readonly resize = () => this.engine.resize();
	private readonly render = () => this.frame();
	private readonly canPlayerOccupy = (x: number, z: number) => {
		const from = this.level!.camera.position;
		return this.horde!.enemies.every(({ root }) => {
			const body = root.position;
			const nextDistance = (x - body.x) ** 2 + (z - body.z) ** 2;
			const previousDistance = (from.x - body.x) ** 2 + (from.z - body.z) ** 2;
			return nextDistance >= 0.75 ** 2 || nextDistance > previousDistance;
		});
	};

	constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly onState: (state: HudSnapshot) => void
	) {
		this.engine = new Engine(canvas, true, { stencil: true });
		this.engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
		this.observer = new ResizeObserver(this.resize);
		this.observer.observe(canvas);
		window.addEventListener('resize', this.resize);
		window.addEventListener('keydown', this.keydown);
		window.addEventListener('keyup', this.keyup);
		window.addEventListener('blur', this.pause);
		document.addEventListener('visibilitychange', this.visibility);
		document.addEventListener('pointerlockchange', this.lockchange);
		document.addEventListener('pointerlockerror', this.lockerror);
		document.addEventListener('pointermove', this.pointerinput);
		canvas.addEventListener('pointerdown', this.pointerinput);
		window.addEventListener('pointerup', this.pointerinput);
		canvas.addEventListener('contextmenu', this.contextmenu);
	}

	async start() {
		try {
			this.createLevel();
			this.resize();
			const scene = this.level!.scene;
			await new Promise<void>((resolve) => {
				const cancelled = scene.onDisposeObservable.addOnce(() => resolve());
				scene.executeWhenReady(() => {
					scene.onDisposeObservable.remove(cancelled);
					resolve();
				});
			});
			if (this.disposed) return;
			this.engine.runRenderLoop(this.render);
			this.publish();
		} catch (error) {
			this.dispose();
			throw error;
		}
	}

	private createLevel() {
		this.weapon?.dispose();
		this.level?.scene.dispose();
		this.level = createScene(this.engine);
		this.horde = new Horde(this.level.scene);
		this.navigation = new Navigation(this.level.world.obstacles);
		this.pickups = [];
		this.currentStation = undefined;
		this.navigationTimer = 0;
		this.lastRound = 0;
		this.hit = this.damageFlash = this.meleeCooldown = 0;
		this.emptyCooldown = 0;
		this.presenceCooldown = 2;
		this.sprintExhausted = false;
		this.lookX = this.lookY = 0;
		this.effects = new CombatEffects(this.level.scene);
		this.weapon = new WeaponView(this.level.scene, this.level.camera);
		this.createWeapon();
	}

	begin(touch = false) {
		if (this.disposed) return;
		const restart = this.run.state.phase !== 'ready';
		this.touch = touch;
		this.clearInput();
		this.run.start();
		if (restart) this.createLevel();
		this.activate();
		this.publish();
	}

	resume(touch = this.touch) {
		this.touch = touch;
		this.run.resume();
		this.activate();
		this.publish();
	}

	private activate() {
		this.audio.setPaused(false);
		this.canvas.focus();
		void this.audio.unlock().catch((error: unknown) => {
			console.warn('Game audio unavailable', error);
			this.run.notify('Audio unavailable. You can continue without sound.');
		});
		if (!this.touch) {
			void this.canvas.requestPointerLock()?.catch((error: unknown) => {
				console.warn('Pointer lock unavailable', error);
				this.lockerror();
			});
		}
	}

	readonly pause = () => {
		if (this.run.state.phase !== 'playing') return;
		this.run.pause();
		this.audio.setPaused(true);
		this.clearInput();
		if (document.pointerLockElement === this.canvas) document.exitPointerLock();
		this.publish();
	};

	setSettings(settings: GameSettings) {
		this.sensitivity = settings.sensitivity;
		this.audio.volume = settings.volume;
	}

	setTouchMove(x: number, z: number) {
		this.touchX = x;
		this.touchZ = z;
	}
	look(dx: number, dy: number) {
		if (!this.level || this.run.state.phase !== 'playing') return;
		const camera = this.level.camera;
		const scale = this.sensitivity * (this.aiming ? 0.0012 : 0.0022);
		this.lookX += dx * scale;
		this.lookY += dy * scale;
		camera.rotation.y += dx * scale;
		camera.rotation.x = Math.max(-1.35, Math.min(1.35, camera.rotation.x + dy * scale));
	}
	setFiring(value: boolean) {
		this.firing = value;
	}
	reload() {
		if (this.meleeCooldown > 0.35) return;
		const before = this.run.state.reloading;
		this.run.reload();
		if (!before && this.run.state.reloading) {
			this.audio.play('reload', { weapon: this.run.state.weapon });
		}
	}
	interact() {
		this.currentStation = this.findStation();
		if (!this.currentStation || !this.level) return;
		const previousWeapon = this.run.state.weapon;
		const previousUpgrade = this.run.state.upgraded;
		if (this.run.buy(this.currentStation.id)) {
			this.audio.play(this.currentStation.id === 'gate' ? 'gate' : 'buy');
			this.level.world.react(this.currentStation.id);
			if (this.run.state.gateOpen) {
				this.level.world.openGate();
				this.navigation!.gateOpen = true;
				this.navigationTimer = 0;
			}
			if (previousWeapon !== this.run.state.weapon || previousUpgrade !== this.run.state.upgraded) {
				this.createWeapon();
			}
		}
		this.publish();
	}
	melee() {
		if (
			this.run.state.phase !== 'playing' ||
			this.meleeCooldown > 0 ||
			this.run.state.reloading > 0 ||
			!this.level
		)
			return;
		this.meleeCooldown = 0.8;
		this.meleePending = true;
		this.weapon?.melee();
		this.audio.play('melee');
	}

	private meleeImpact() {
		if (!this.level || !this.meleePending) return;
		this.meleePending = false;
		const ray = this.level.camera.getForwardRay(2.6);
		const picked = this.level.scene.pickWithRay(ray, (mesh) => mesh.isPickable && mesh.isEnabled());
		if (picked?.hit && picked.pickedMesh?.metadata?.enemyId !== undefined) {
			if (picked.pickedPoint)
				this.effects?.impact(picked.pickedPoint, picked.getNormal(true), true);
			this.damageEnemy(picked.pickedMesh.metadata.enemyId, 160, false, true);
		}
	}

	private clearInput() {
		this.keys.clear();
		this.firing = this.aiming = false;
		this.touchX = this.touchZ = 0;
		this.lookX = this.lookY = 0;
	}
	private readonly contextmenu = (event: Event) => event.preventDefault();
	private readonly visibility = () => {
		if (document.hidden) this.pause();
	};
	private readonly lockchange = () => {
		if (!this.touch && document.pointerLockElement !== this.canvas) this.pause();
	};
	private readonly lockerror = () => {
		if (this.disposed) return;
		this.pause();
		this.run.notify('Mouse capture was blocked. Click Resume to try again.');
		this.publish();
	};
	private readonly pointerinput = (event: PointerEvent) => {
		if (event.pointerType === 'touch' || this.run.state.phase !== 'playing') return;
		if (document.pointerLockElement !== this.canvas) return;
		// Chorded button changes use pointermove; buttons is the complete held state.
		this.firing = (event.buttons & 1) !== 0;
		this.aiming = (event.buttons & 2) !== 0;
		if (event.type === 'pointermove') this.look(event.movementX, event.movementY);
	};
	private readonly keydown = (event: KeyboardEvent) => {
		if (['Escape', 'KeyP'].includes(event.code)) {
			this.pause();
			return;
		}
		if (this.run.state.phase !== 'playing') return;
		if (
			[
				'KeyW',
				'KeyA',
				'KeyS',
				'KeyD',
				'ShiftLeft',
				'ShiftRight',
				'Space',
				'KeyR',
				'KeyE',
				'KeyV',
				'ArrowUp',
				'ArrowDown',
				'ArrowLeft',
				'ArrowRight'
			].includes(event.code)
		)
			event.preventDefault();
		this.keys.add(event.code);
		if (event.repeat) return;
		if (event.code === 'KeyR') this.reload();
		if (event.code === 'KeyE') this.interact();
		if (event.code === 'KeyV') this.melee();
	};
	private readonly keyup = (event: KeyboardEvent) => {
		this.keys.delete(event.code);
	};

	private frame() {
		if (!this.level || this.disposed) return;
		// Catch up slow rendered frames without large collision steps or background-tab bursts.
		let remaining = Math.min(this.engine.getDeltaTime() / 1000, 0.25);
		if (this.run.state.phase === 'playing') {
			while (remaining > 0.000001 && this.run.state.phase === 'playing') {
				const dt = Math.min(remaining, 1 / 60);
				this.update(dt);
				this.hudTimer -= dt;
				remaining -= dt;
			}
			if (this.hudTimer <= 0) {
				this.publish();
				this.hudTimer = 0.08;
			}
		}
		this.level.scene.render();
		this.weapon?.afterRender();
	}

	private update(dt: number) {
		const { camera, world } = this.level!;
		const state = this.run.state;
		const wasReloading = state.reloading > 0;
		const spawns = this.run.tick(dt);
		if (wasReloading && state.reloading === 0)
			this.audio.play('reloadEnd', { weapon: state.weapon });
		if (state.round !== this.lastRound) {
			this.lastRound = state.round;
			this.audio.play('round');
		}
		for (let i = 0; i < spawns; i++) {
			const available = world.spawns.filter(
				(p) =>
					(state.gateOpen || p.z < 5) &&
					Math.hypot(p.x - camera.position.x, p.z - camera.position.z) > 7
			);
			const spawn = available[Math.floor(Math.random() * available.length)];
			if (spawn) this.horde!.spawn(spawn.x, spawn.z, state.round);
		}
		let strafe = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) + this.touchX;
		let forward =
			Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) -
			Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) +
			this.touchZ;
		const length = Math.hypot(strafe, forward);
		if (length > 1) {
			strafe /= length;
			forward /= length;
		}
		if (state.stamina === 0) this.sprintExhausted = true;
		else if (state.stamina >= 25) this.sprintExhausted = false;
		const sprint =
			(this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
			length > 0 &&
			!this.sprintExhausted &&
			state.stamina > 0 &&
			!this.aiming &&
			!this.firing &&
			state.reloading === 0 &&
			this.meleeCooldown === 0;
		state.stamina = Math.max(0, Math.min(100, state.stamina + (sprint ? -23 : 16) * dt));
		const speed = (sprint ? 6.4 : this.aiming ? 2.5 : 4.2) * dt;
		const yaw = camera.rotation.y;
		const previousX = camera.position.x;
		const previousZ = camera.position.z;
		this.navigation!.move(
			camera.position,
			(Math.cos(yaw) * strafe + Math.sin(yaw) * forward) * speed,
			(-Math.sin(yaw) * strafe + Math.cos(yaw) * forward) * speed,
			0.38,
			this.canPlayerOccupy
		);
		const movement = Math.min(
			1,
			Math.hypot(camera.position.x - previousX, camera.position.z - previousZ) / (4.2 * dt)
		);
		if (this.keys.has('ArrowLeft')) camera.rotation.y -= dt * 1.7;
		if (this.keys.has('ArrowRight')) camera.rotation.y += dt * 1.7;
		camera.fov += ((this.aiming ? 0.82 : sprint ? 1.35 : 1.25) - camera.fov) * Math.min(1, dt * 10);
		this.navigationTimer -= dt;
		if (this.navigationTimer <= 0) {
			this.navigation!.rebuild(camera.position.x, camera.position.z);
			this.navigationTimer = 0.35;
		}
		this.horde!.update(dt, state.elapsed, camera.position, this.navigation!, (enemy) => {
			const before = state.health;
			this.run.damage(34);
			if (state.health < before) {
				this.damageFlash = 0.65;
				this.audio.play('hurt');
				this.audio.play('zombieAttack', this.spatialSound(enemy.root.position));
			}
		});
		if (state.phase === 'dead') {
			this.clearInput();
			this.audio.setPaused(true);
			if (document.pointerLockElement === this.canvas) document.exitPointerLock();
			this.publish();
			return;
		}
		const previousMelee = this.meleeCooldown;
		this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
		if (previousMelee > 0.62 && this.meleeCooldown <= 0.62) this.meleeImpact();
		this.hit = Math.max(0, this.hit - dt);
		this.damageFlash = Math.max(0, this.damageFlash - dt);
		this.emptyCooldown = Math.max(0, this.emptyCooldown - dt);
		const pose = this.weaponState;
		pose.aiming = this.aiming;
		pose.sprinting = sprint;
		pose.movement = movement;
		pose.reloading = state.reloading > 0;
		pose.reloadProgress = pose.reloading ? 1 - state.reloading / WEAPONS[state.weapon].reload : 0;
		pose.lookX = this.lookX;
		pose.lookY = this.lookY;
		this.weapon?.update(dt, pose);
		this.lookX = this.lookY = 0;
		if (this.firing) {
			if (state.magazine === 0 && !state.reloading && this.emptyCooldown === 0) {
				this.audio.play('empty');
				this.emptyCooldown = 0.5;
			}
			this.shoot();
		}
		if (state.magazine === 0 && state.reserve > 0 && state.reloading === 0) this.reload();
		world.update(dt, state.elapsed);
		this.effects?.update(dt);
		this.currentStation = this.findStation();
		this.updatePickups(dt);
		this.audioState.moving = movement > 0.15;
		this.audioState.sprinting = sprint;
		this.audioState.health = state.health;
		this.audioState.stamina = state.stamina;
		this.audio.update(dt, this.audioState);
		this.presenceCooldown -= dt;
		if (this.presenceCooldown <= 0) {
			this.presenceCooldown = 2.4 + Math.random() * 1.8;
			let nearest: Zombie | undefined;
			let distance = 18 * 18;
			for (const enemy of this.horde!.enemies) {
				const candidate = Vector3.DistanceSquared(enemy.root.position, camera.position);
				if (candidate < distance) {
					nearest = enemy;
					distance = candidate;
				}
			}
			if (nearest) this.audio.play('zombie', this.spatialSound(nearest.root.position));
		}
	}

	private shoot() {
		if (!this.level || this.meleeCooldown > 0.35 || !this.run.finishShot()) return;
		const spec = WEAPONS[this.run.state.weapon];
		this.audio.play('shot', { weapon: this.run.state.weapon });
		this.weapon?.fire();
		const camera = this.level.camera;
		const sy = Math.sin(camera.rotation.y),
			cy = Math.cos(camera.rotation.y);
		const sp = Math.sin(camera.rotation.x),
			cp = Math.cos(camera.rotation.x);
		const spread = spec.spread * (this.aiming ? 0.45 : 1);
		this.shotRay.origin.copyFrom(camera.position);
		for (let i = 0; i < spec.pellets; i++) {
			const angle = Math.random() * Math.PI * 2;
			const radius = Math.sqrt(Math.random()) * spread * 0.5;
			const x = Math.cos(angle) * radius,
				y = Math.sin(angle) * radius;
			this.shotDirection
				.set(sy * cp + cy * x + sy * sp * y, -sp + cp * y, cy * cp - sy * x + cy * sp * y)
				.normalize();
			this.shotRay.direction.copyFrom(this.shotDirection);
			const picked = this.level.scene.pickWithRay(
				this.shotRay,
				(mesh) => mesh.isPickable && mesh.isEnabled()
			);
			const metadata = picked?.pickedMesh?.metadata;
			const flesh = metadata?.enemyId !== undefined;
			if (picked?.hit && picked.pickedPoint) {
				this.effects?.impact(picked.pickedPoint, picked.getNormal(true), flesh);
				if (flesh) this.damageEnemy(metadata.enemyId, spec.damage, metadata.headshot === true);
			}
		}
		const kick =
			this.run.state.weapon === 'shotgun'
				? 0.018
				: this.run.state.weapon === 'rifle'
					? 0.006
					: 0.009;
		camera.rotation.x = Math.max(-1.35, camera.rotation.x - kick * (this.aiming ? 0.5 : 1));
	}

	private damageEnemy(id: number, damage: number, headshot: boolean, melee = false) {
		const enemy = this.horde!.enemies.find((entry) => entry.id === id);
		if (!enemy) return;
		enemy.health -=
			this.run.state.instakill > 0
				? enemy.health
				: damage * (headshot ? 2.5 : 1) * (this.run.state.upgraded && !melee ? 2 : 1);
		const killed = enemy.health <= 0;
		this.run.hit(headshot, killed, melee);
		this.hit = killed ? 0.25 : 0.13;
		this.audio.play('hit');
		if (killed) this.kill(enemy, true);
		else this.horde!.react(enemy, headshot);
	}

	private kill(enemy: Zombie, drop: boolean) {
		if (drop && (this.run.state.kills % 10 === 0 || Math.random() < 0.15)) {
			const kinds: PickupKind[] = ['ammo', 'double', 'instakill', 'nuke'];
			const kind =
				this.run.state.kills % 10 === 0 ? 'ammo' : kinds[Math.floor(Math.random() * kinds.length)];
			const mesh = this.effects!.createPickup(kind, enemy.root.position);
			this.pickups.push({ mesh, kind, life: 25 });
		}
		this.horde!.remove(enemy);
	}

	private updatePickups(dt: number) {
		for (let i = this.pickups.length - 1; i >= 0; i--) {
			const pickup = this.pickups[i];
			pickup.life -= dt;
			pickup.mesh.rotation.y = this.level!.camera.rotation.y;
			pickup.mesh.position.y = 0.78 + Math.sin(this.run.state.elapsed * 2) * 0.065;
			pickup.mesh.setEnabled(pickup.life > 4 || Math.floor(pickup.life * 5) % 2 === 0);
			const collected =
				Vector3.DistanceSquared(pickup.mesh.position, this.level!.camera.position) < 3;
			if (collected) {
				this.run.pickup(pickup.kind);
				this.audio.play('pickup');
				if (pickup.kind === 'nuke') {
					for (const enemy of [...this.horde!.enemies]) {
						this.run.hit(false, true);
						this.kill(enemy, false);
					}
				}
			}
			if (collected || pickup.life <= 0) {
				pickup.mesh.dispose();
				this.pickups.splice(i, 1);
			}
		}
	}

	private createWeapon() {
		this.meleePending = false;
		this.weapon?.equip(this.run.state.weapon, this.run.state.upgraded);
	}

	private spatialSound(position: Vector3) {
		const camera = this.level!.camera;
		const x = position.x - camera.position.x,
			z = position.z - camera.position.z;
		const distance = Math.hypot(x, z);
		return {
			pan:
				distance > 0
					? (x * Math.cos(camera.rotation.y) - z * Math.sin(camera.rotation.y)) / distance
					: 0,
			distance
		};
	}

	private findStation(): Station | undefined {
		if (!this.level || this.run.state.phase !== 'playing') return;
		const camera = this.level.camera;
		let target: Station | undefined;
		let score = Infinity;
		for (const station of this.level.world.stations) {
			if (station.id === 'gate' && this.run.state.gateOpen) continue;
			const dx = station.x - camera.position.x,
				dz = station.z - camera.position.z;
			const distance = Math.hypot(dx, dz);
			if (distance >= 2.8) continue;
			const facing =
				distance > 0.3
					? (dx * Math.sin(camera.rotation.y) + dz * Math.cos(camera.rotation.y)) / distance
					: 1;
			if (facing < (this.touch ? 0.1 : 0.35)) continue;
			const steps = Math.max(1, Math.ceil(distance / 0.15));
			let clear = true;
			for (let step = 1; step <= steps; step++) {
				if (
					!this.navigation!.canStand(
						camera.position.x + (dx * step) / steps,
						camera.position.z + (dz * step) / steps,
						0.02
					)
				) {
					clear = false;
					break;
				}
			}
			const candidate = distance + (1 - facing);
			if (clear && candidate < score) {
				target = station;
				score = candidate;
			}
		}
		return target;
	}

	private publish() {
		const snapshot = this.run.snapshot();
		let prompt = '';
		if (this.currentStation) {
			const quote = this.run.quote(this.currentStation.id);
			prompt = `${quote.label} · ${quote.reason || `${quote.cost.toLocaleString()} points`}`;
		}
		this.onState({ ...snapshot, prompt, hit: this.hit, damageFlash: this.damageFlash });
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.clearInput();
		if (document.pointerLockElement === this.canvas) document.exitPointerLock();
		this.observer.disconnect();
		window.removeEventListener('resize', this.resize);
		window.removeEventListener('keydown', this.keydown);
		window.removeEventListener('keyup', this.keyup);
		window.removeEventListener('blur', this.pause);
		document.removeEventListener('visibilitychange', this.visibility);
		document.removeEventListener('pointerlockchange', this.lockchange);
		document.removeEventListener('pointerlockerror', this.lockerror);
		document.removeEventListener('pointermove', this.pointerinput);
		this.canvas.removeEventListener('pointerdown', this.pointerinput);
		window.removeEventListener('pointerup', this.pointerinput);
		this.canvas.removeEventListener('contextmenu', this.contextmenu);
		this.engine.stopRenderLoop(this.render);
		this.weapon?.dispose();
		this.level?.scene.dispose();
		this.engine.dispose();
		this.audio.dispose();
	}
}
