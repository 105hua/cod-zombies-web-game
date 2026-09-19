import type { Scene } from '@babylonjs/core/scene';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { WeaponId } from '../types';

interface ViewState {
	aiming: boolean;
	sprinting: boolean;
	movement: number;
	reloading: boolean;
	reloadProgress: number;
	lookX: number;
	lookY: number;
}

interface Casing {
	mesh: Mesh;
	life: number;
	vx: number;
	vy: number;
	vz: number;
	spin: number;
}

function ramp(value: number, start: number, end: number): number {
	const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
	return t * t * (3 - 2 * t);
}

/** Camera-space cosmetics only; the game owns firing, ammunition and reload completion. */
export class WeaponView {
	private root?: TransformNode;
	private slide?: TransformNode;
	private pump?: TransformNode;
	private hammer?: Mesh;
	private magazine?: TransformNode;
	private support?: TransformNode;
	private shell?: Mesh;
	private flash?: Mesh;
	private readonly effects: TransformNode;
	private readonly materials: StandardMaterial[] = [];
	private readonly textures: RawTexture[] = [];
	private readonly casings: Casing[] = [];
	private readonly steel: StandardMaterial;
	private readonly edge: StandardMaterial;
	private readonly rubber: StandardMaterial;
	private readonly wood: StandardMaterial;
	private readonly fabric: StandardMaterial;
	private readonly glove: StandardMaterial;
	private readonly dark: StandardMaterial;
	private readonly brass: StandardMaterial;
	private readonly accent: StandardMaterial;
	private readonly flame: StandardMaterial;
	private readonly rotation = Matrix.Identity();
	private readonly ejection = new Vector3();
	private readonly localEjection = new Vector3();
	private id: WeaponId = 'pistol';
	private disposed = false;
	private time = 0;
	private walk = 0;
	private movement = 0;
	private ads = 0;
	private sprint = 0;
	private swayX = 0;
	private swayY = 0;
	private recoil = 0;
	private recoilVelocity = 0;
	private shotAge = 10;
	private flashLife = 0;
	private flashPending = false;
	private meleeAge = 10;
	private equipAge = 0;
	private shotNumber = 0;
	private casingIndex = 0;
	private muzzleZ = 0;
	private sightY = 0.092;
	private supportZ = 0;
	private supportY = 0;

	constructor(
		private readonly scene: Scene,
		private readonly camera: UniversalCamera
	) {
		this.steel = this.material('parkerized-steel', '#5a6666', 0.48, 'metal');
		this.edge = this.material('worn-steel-edges', '#81908d', 0.64, 'metal');
		this.rubber = this.material('checkered-rubber', '#232a28', 0.08, 'rubber');
		this.wood = this.material('oiled-walnut', '#6a4630', 0.18, 'wood');
		this.fabric = this.material('olive-canvas', '#4a5040', 0.04, 'cloth');
		this.glove = this.material('glove-leather', '#383d33', 0.08, 'rubber');
		this.dark = this.material('bore-and-insets', '#080d0d', 0.05);
		this.brass = this.material('spent-brass', '#b79247', 0.65);
		this.accent = this.material('weapon-markings', '#9ca99a', 0.2);
		this.flame = this.material('muzzle-incandescence', '#ffc66b', 0);
		this.flame.disableLighting = true;
		this.flame.emissiveColor.set(1, 0.61, 0.2);
		this.flame.alpha = 0.86;
		this.effects = new TransformNode('view-weapon-effects', scene);
		this.effects.parent = camera;
		for (let i = 0; i < 8; i++) {
			const mesh = this.cylinder(
				'ejected-casing',
				0.012,
				0.031,
				0,
				0,
				0,
				this.brass,
				this.effects,
				8
			);
			mesh.setEnabled(false);
			this.casings.push({ mesh, life: 0, vx: 0, vy: 0, vz: 0, spin: 0 });
		}
	}

	equip(id: WeaponId, upgraded: boolean): void {
		if (this.disposed) return;
		// Materials belong to this view, not an individual equipped hierarchy.
		this.root?.dispose(false, false);
		this.slide = this.pump = this.magazine = this.support = undefined;
		this.hammer = this.shell = this.flash = undefined;
		this.id = id;
		this.recoil = this.recoilVelocity = this.flashLife = this.ads = this.sprint = 0;
		this.flashPending = false;
		this.shotAge = this.meleeAge = 10;
		this.equipAge = 0;
		for (const casing of this.casings) {
			casing.life = 0;
			casing.mesh.setEnabled(false);
		}
		this.accent.diffuseColor.copyFromFloats(
			upgraded ? 0.34 : 0.61,
			upgraded ? 0.72 : 0.66,
			upgraded ? 0.67 : 0.6
		);
		this.accent.emissiveColor.copyFromFloats(
			upgraded ? 0.07 : 0,
			upgraded ? 0.22 : 0,
			upgraded ? 0.19 : 0
		);
		this.root = new TransformNode('view-weapon', this.scene);
		this.root.parent = this.camera;
		this.root.position.set(0.24, -0.4, 0.51);
		if (id === 'pistol') this.buildPistol();
		else if (id === 'rifle') this.buildRifle();
		else this.buildShotgun();
		this.buildHands();
		this.buildFlash();
	}

	fire(): void {
		if (!this.root || this.disposed) return;
		this.shotNumber++;
		this.shotAge = 0;
		this.recoilVelocity += this.id === 'shotgun' ? 2.7 : this.id === 'rifle' ? 1.35 : 1.85;
		this.recoilVelocity = Math.min(this.recoilVelocity, 4);
		this.flashLife = this.id === 'shotgun' ? 0.042 : 0.032;
		this.flashPending = true;
		if (this.flash) {
			const variation = 0.82 + ((this.shotNumber * 7) % 9) * 0.045;
			this.flash.scaling.set(variation, variation, this.id === 'shotgun' ? 1.5 : 1);
			this.flash.rotation.z = this.shotNumber * 2.39996;
			this.flash.setEnabled(true);
		}
		// A pump ejects on its rearward stroke rather than on ignition.
		if (this.id !== 'shotgun') this.eject();
	}

	melee(): void {
		if (!this.root || this.disposed) return;
		this.meleeAge = 0;
		this.flashLife = 0;
		this.flashPending = false;
		this.flash?.setEnabled(false);
	}

	afterRender(): void {
		this.flashPending = false;
	}

	update(dt: number, state: ViewState): void {
		if (!this.root || this.disposed || dt <= 0) return;
		this.time += dt;
		this.equipAge += dt;
		this.meleeAge += dt;
		const previousShotAge = this.shotAge;
		this.shotAge += dt;
		if (!this.flashPending) this.flashLife = Math.max(0, this.flashLife - dt);
		this.flash?.setEnabled(this.flashLife > 0);
		const response = 1 - Math.exp(-dt * 14);
		this.ads +=
			((state.aiming && !state.reloading && this.meleeAge > 0.5 ? 1 : 0) - this.ads) * response;
		this.sprint +=
			((state.sprinting && !state.reloading ? 1 : 0) - this.sprint) * (1 - Math.exp(-dt * 9));
		this.movement += (Math.min(1, Math.max(0, state.movement)) - this.movement) * response;
		this.walk += dt * (this.sprint > 0.5 ? 14 : 9) * this.movement;
		this.swayX += (Math.max(-1, Math.min(1, state.lookX)) - this.swayX) * response;
		this.swayY += (Math.max(-1, Math.min(1, state.lookY)) - this.swayY) * response;
		const spring = this.id === 'shotgun' ? 13 : this.id === 'rifle' ? 23 : 19;
		const decay = Math.exp(-spring * dt);
		const springVelocity = this.recoilVelocity + spring * this.recoil;
		this.recoil = (this.recoil + springVelocity * dt) * decay;
		this.recoilVelocity = (this.recoilVelocity - spring * springVelocity * dt) * decay;
		const p = state.reloading ? Math.max(0, Math.min(1, state.reloadProgress)) : 0;
		const reloadPose = state.reloading ? ramp(p, 0, 0.13) * (1 - ramp(p, 0.82, 1)) : 0;
		const melee = Math.sin(Math.PI * ramp(this.meleeAge, 0, 0.52));
		const thrust = Math.sin(Math.PI * ramp(this.meleeAge, 0.08, 0.36));
		const settle = 1 - ramp(this.equipAge, 0, 0.28);
		const free = 1 - this.ads * 0.92;
		const bob = Math.sin(this.walk) * this.movement * free;
		const breath = Math.sin(this.time * 1.8) * (1 - this.movement) * 0.0025;
		const aspect = Math.min(1, this.scene.getEngine().getAspectRatio(this.camera));
		this.root.position.set(
			0.235 * aspect * (1 - this.ads) + bob * 0.009 - this.swayX * 0.013 * free - melee * 0.16,
			-0.255 * (1 - this.ads) -
				this.sightY * this.ads -
				this.sprint * 0.105 -
				reloadPose * 0.09 +
				Math.cos(this.walk * 2) * this.movement * 0.007 * free +
				breath * free -
				settle * 0.16 +
				melee * 0.055,
			(this.id === 'pistol' ? 0.53 : 0.49) -
				this.ads * 0.035 -
				this.recoil -
				this.sprint * 0.045 -
				reloadPose * 0.055 +
				thrust * 0.15
		);
		this.root.rotation.set(
			-this.recoil * (this.id === 'pistol' ? 1.9 : 1.1) +
				this.sprint * 0.31 +
				reloadPose * 0.18 +
				this.swayY * 0.035 * free +
				settle * 0.28 -
				thrust * 0.42,
			-this.sprint * 0.22 + reloadPose * 0.32 - this.swayX * 0.04 * free + melee * 0.58,
			-this.sprint * 0.32 - reloadPose * 0.42 - bob * 0.015 + melee * 0.63
		);
		const slideCycle = Math.sin(Math.PI * Math.min(1, this.shotAge / 0.115));
		const rack = state.reloading ? Math.sin(Math.PI * ramp(p, 0.76, 0.92)) : 0;
		const pumpCycle = Math.sin(Math.PI * ramp(this.shotAge, 0.12, 0.48));
		if (this.slide)
			this.slide.position.z =
				-(this.id === 'shotgun' ? pumpCycle : slideCycle) * 0.052 - rack * 0.052;
		if (this.hammer) this.hammer.rotation.x = -0.35 + slideCycle * 0.85 + rack * 0.65;
		if (this.pump) this.pump.position.z = -pumpCycle * 0.105 - rack * 0.105;
		if (this.id === 'shotgun' && previousShotAge < 0.23 && this.shotAge >= 0.23) this.eject();
		this.animateReload(p, state.reloading, reloadPose, rack, pumpCycle);
		for (const casing of this.casings) {
			if (casing.life <= 0) continue;
			casing.life -= dt;
			if (casing.life <= 0) {
				casing.mesh.setEnabled(false);
				continue;
			}
			casing.vy -= dt * 3.2;
			casing.mesh.position.x += casing.vx * dt;
			casing.mesh.position.y += casing.vy * dt;
			casing.mesh.position.z += casing.vz * dt;
			casing.mesh.rotation.x += dt * casing.spin;
			casing.mesh.rotation.z += dt * casing.spin * 0.7;
		}
	}

	private animateReload(
		p: number,
		reloading: boolean,
		pose: number,
		rack: number,
		pumpCycle: number
	): void {
		const out = reloading ? ramp(p, 0.14, 0.32) * (1 - ramp(p, 0.5, 0.7)) : 0;
		if (this.magazine) {
			this.magazine.position.y = -out * 0.28;
			this.magazine.position.x = -out * 0.05;
			this.magazine.rotation.x = out * 0.28;
		}
		if (!this.support) return;
		if (this.id === 'shotgun') {
			const loading = reloading && p > 0.17 && p < 0.77;
			const cycle = loading ? (((p - 0.17) / 0.6) * 3) % 1 : 0;
			const feed = Math.sin(cycle * Math.PI);
			this.support.position.set(
				-0.047 - pose * 0.03,
				this.supportY - pose * 0.1 - feed * 0.08,
				this.supportZ - pose * 0.26 - pumpCycle * (1 - pose) * 0.105 - rack * 0.105
			);
			this.support.rotation.set(pose * 0.7, 0, pose * 0.2);
			this.shell?.setEnabled(loading && cycle > 0.12 && cycle < 0.86);
		} else {
			this.support.position.set(
				-0.047 - out * 0.025 + rack * 0.055,
				this.supportY - pose * 0.09 - out * 0.2 + rack * 0.19,
				this.supportZ - pose * (this.id === 'pistol' ? 0.015 : 0.23) - rack * 0.065
			);
			this.support.rotation.set(out * 0.35, pose * 0.28, -pose * 0.32);
		}
	}

	private buildPistol(): void {
		const root = this.root!;
		this.sightY = 0.084;
		this.muzzleZ = 0.244;
		this.receiver('pistol-frame', 0.071, 0.058, 0.29, -0.034, 0.045, root);
		this.slide = this.group('pistol-slide', root);
		this.receiver('pistol-slide', 0.076, 0.062, 0.306, 0.019, 0.047, this.slide);
		this.box('slide-top-flat', 0.041, 0.006, 0.26, 0, 0.053, 0.036, this.steel, this.slide);
		this.barrel(0.036, 0.14, 0.014, 0.174, root);
		this.box('ejection-port', 0.004, 0.023, 0.07, 0.039, 0.028, 0.07, this.dark, this.slide);
		this.box('chamber-hood', 0.006, 0.015, 0.047, 0.042, 0.03, 0.075, this.edge, this.slide);
		for (let i = 0; i < 7; i++) {
			for (const side of [-1, 1])
				this.box(
					'slide-serration',
					0.003,
					0.041,
					0.003,
					side * 0.039,
					0.018,
					-0.084 + i * 0.009,
					this.dark,
					this.slide
				);
		}
		const grip = this.box('pistol-grip', 0.065, 0.146, 0.084, 0, -0.117, -0.061, this.rubber, root);
		grip.rotation.x = -0.23;
		this.box('grip-backstrap', 0.054, 0.12, 0.008, 0, -0.12, -0.11, this.steel, root).rotation.x =
			-0.23;
		this.magazine = this.group('pistol-magazine', root);
		this.box(
			'pistol-magazine-body',
			0.046,
			0.12,
			0.06,
			0,
			-0.131,
			-0.055,
			this.edge,
			this.magazine
		).rotation.x = -0.23;
		this.box(
			'pistol-magazine-floorplate',
			0.073,
			0.014,
			0.093,
			0,
			-0.202,
			-0.041,
			this.rubber,
			this.magazine
		);
		this.triggerGuard(-0.055, 0.021, 0.085, root);
		this.hammer = this.box('pistol-hammer', 0.022, 0.028, 0.022, 0, 0.025, -0.12, this.edge, root);
		this.box('slide-release', 0.008, 0.013, 0.05, -0.041, -0.025, -0.02, this.edge, root);
		this.sights(-0.088, 0.17, this.sightY, this.slide);
		this.fasteners(root, 0.037, -0.031, -0.05, 3, 0.04);
		this.supportZ = -0.016;
		this.supportY = -0.134;
	}

	private buildRifle(): void {
		const root = this.root!;
		this.sightY = 0.112;
		this.muzzleZ = 0.701;
		this.receiver('rifle-upper', 0.083, 0.084, 0.35, 0.005, 0.04, root);
		this.receiver('rifle-lower', 0.073, 0.052, 0.21, -0.056, 0.016, root);
		this.box('ejection-port', 0.005, 0.028, 0.085, 0.046, 0.012, 0.072, this.dark, root);
		this.slide = this.group('rifle-bolt', root);
		this.box('bolt-carrier', 0.007, 0.022, 0.059, 0.049, 0.013, 0.069, this.edge, this.slide);
		this.box('charging-handle', 0.106, 0.016, 0.024, 0, 0.042, -0.142, this.edge, this.slide);
		this.barrel(0.031, 0.4, 0.018, 0.46, root);
		this.cylinder('gas-tube', 0.012, 0.29, 0, 0.058, 0.345, this.steel, root);
		this.receiver('rifle-handguard', 0.094, 0.089, 0.27, -0.012, 0.319, root, this.rubber);
		for (let i = 0; i < 7; i++) {
			for (const side of [-1, 1])
				this.box(
					'handguard-vent',
					0.004,
					0.018,
					0.018,
					side * 0.048,
					0.007,
					0.221 + i * 0.031,
					this.dark,
					root
				);
		}
		for (let i = 0; i < 13; i++)
			this.box(
				'sight-rail-tooth',
				0.034,
				0.008,
				0.009,
				0,
				0.057,
				-0.106 + i * 0.024,
				this.edge,
				root
			);
		this.cylinder('flash-suppressor', 0.045, 0.047, 0, 0.018, 0.677, this.steel, root, 12, true);
		for (const side of [-1, 1])
			this.box('suppressor-slot', 0.005, 0.018, 0.026, side * 0.022, 0.018, 0.672, this.dark, root);
		this.box(
			'rifle-pistol-grip',
			0.064,
			0.148,
			0.085,
			0,
			-0.13,
			-0.087,
			this.rubber,
			root
		).rotation.x = -0.32;
		this.triggerGuard(-0.069, -0.003, 0.094, root);
		this.cylinder('stock-buffer-tube', 0.041, 0.15, 0, 0, -0.205, this.steel, root);
		this.receiver('rifle-stock', 0.074, 0.095, 0.16, -0.019, -0.252, root, this.rubber);
		this.box('stock-cheek-rest', 0.077, 0.014, 0.11, 0, 0.037, -0.246, this.rubber, root);
		this.box('stock-buttpad', 0.083, 0.139, 0.023, 0, -0.039, -0.342, this.rubber, root);
		this.magazine = this.group('rifle-magazine', root);
		this.box('magazine-upper', 0.057, 0.105, 0.092, 0, -0.113, 0.101, this.steel, this.magazine);
		this.box(
			'magazine-lower',
			0.057,
			0.112,
			0.09,
			0,
			-0.211,
			0.121,
			this.steel,
			this.magazine
		).rotation.x = 0.2;
		this.box(
			'magazine-base',
			0.065,
			0.016,
			0.099,
			0,
			-0.267,
			0.132,
			this.edge,
			this.magazine
		).rotation.x = 0.2;
		for (const side of [-1, 1]) {
			for (let i = 0; i < 3; i++)
				this.box(
					'magazine-stamping',
					0.003,
					0.154,
					0.007,
					side * 0.03,
					-0.175,
					0.083 + i * 0.025,
					this.dark,
					this.magazine
				).rotation.x = 0.13;
		}
		this.sights(-0.09, 0.476, this.sightY, root);
		this.fasteners(root, 0.045, -0.01, -0.1, 5, 0.053);
		this.box(
			'selector-lever',
			0.007,
			0.012,
			0.029,
			-0.044,
			-0.045,
			-0.072,
			this.edge,
			root
		).rotation.x = -0.5;
		this.supportZ = 0.305;
		this.supportY = -0.076;
	}

	private buildShotgun(): void {
		const root = this.root!;
		this.sightY = 0.087;
		this.muzzleZ = 0.773;
		this.receiver('shotgun-receiver', 0.086, 0.1, 0.31, -0.012, -0.002, root);
		this.box('shotgun-ejection-port', 0.005, 0.039, 0.108, 0.047, -0.001, 0.045, this.dark, root);
		this.slide = this.group('shotgun-bolt', root);
		this.box('shotgun-bolt-face', 0.006, 0.03, 0.073, 0.05, 0, 0.051, this.edge, this.slide);
		this.barrel(0.045, 0.62, 0.018, 0.463, root);
		this.cylinder('shotgun-magazine-tube', 0.037, 0.48, 0, -0.048, 0.397, this.steel, root);
		this.cylinder('magazine-tube-cap', 0.044, 0.023, 0, -0.048, 0.648, this.edge, root);
		this.box('barrel-clamp', 0.047, 0.094, 0.023, 0, -0.014, 0.594, this.steel, root);
		this.pump = this.group('shotgun-pump', root);
		this.cylinder('walnut-pump', 0.09, 0.21, 0, -0.049, 0.317, this.wood, this.pump, 12);
		for (let i = 0; i < 10; i++) {
			const ring = MeshBuilder.CreateTorus(
				'pump-checkering',
				{ diameter: 0.087, thickness: 0.0035, tessellation: 12 },
				this.scene
			);
			this.attach(ring, this.pump, this.dark, 0, -0.049, 0.232 + i * 0.019);
			ring.rotation.x = Math.PI / 2;
		}
		for (const side of [-1, 1])
			this.box(
				'pump-action-bar',
				0.007,
				0.012,
				0.3,
				side * 0.033,
				-0.043,
				0.151,
				this.edge,
				this.pump
			);
		this.box('shotgun-wrist', 0.063, 0.091, 0.145, 0, -0.076, -0.17, this.wood, root).rotation.x =
			-0.35;
		this.receiver('walnut-stock', 0.083, 0.13, 0.155, -0.105, -0.264, root, this.wood);
		this.box('shotgun-recoil-pad', 0.085, 0.149, 0.022, 0, -0.108, -0.352, this.rubber, root);
		this.triggerGuard(-0.068, -0.072, 0.094, root);
		this.box('loading-port', 0.047, 0.004, 0.107, 0, -0.065, 0.057, this.dark, root);
		this.box('shell-lifter', 0.034, 0.005, 0.06, 0, -0.068, 0.046, this.edge, root);
		this.box('tang-safety', 0.018, 0.012, 0.031, 0, 0.041, -0.14, this.accent, root);
		this.sights(-0.106, 0.695, this.sightY, root);
		this.fasteners(root, 0.047, -0.019, -0.109, 4, 0.065);
		this.supportZ = 0.302;
		this.supportY = -0.096;
	}

	private buildHands(): void {
		const right = this.hand('trigger-hand', this.root!);
		right.position.set(
			0.033,
			this.id === 'shotgun' ? -0.104 : -0.133,
			this.id === 'shotgun' ? -0.143 : -0.076
		);
		right.rotation.z = -0.1;
		this.support = this.hand('support-hand', this.root!);
		this.support.position.set(-0.047, this.supportY, this.supportZ);
		this.support.scaling.set(-0.92, 0.92, 0.92);
		if (this.id === 'shotgun') {
			this.shell = this.cylinder(
				'reload-shell',
				0.023,
				0.065,
				0.025,
				0.04,
				0.023,
				this.wood,
				this.support,
				10
			);
			this.cylinder(
				'reload-shell-brass',
				0.024,
				0.016,
				0,
				-0.025,
				0,
				this.brass,
				this.shell,
				10
			).rotation.set(0, 0, 0);
			this.shell.setEnabled(false);
		}
	}

	private hand(name: string, parent: TransformNode): TransformNode {
		const hand = this.group(name, parent);
		const palm = MeshBuilder.CreateSphere(`${name}-palm`, { diameter: 1, segments: 6 }, this.scene);
		this.attach(palm, hand, this.glove, 0, 0, 0);
		palm.scaling.set(0.056, 0.079, 0.072);
		for (let i = 0; i < 3; i++) {
			const finger = this.cylinder(
				`${name}-finger`,
				0.016,
				0.047,
				-0.019,
				-0.022 + i * 0.019,
				0.031,
				this.glove,
				hand,
				6
			);
			finger.rotation.y = Math.PI / 2;
		}
		const thumb = this.cylinder(
			`${name}-thumb`,
			0.019,
			0.049,
			-0.022,
			0.027,
			0.008,
			this.glove,
			hand,
			6
		);
		thumb.rotation.z = -0.6;
		this.box(`${name}-knuckle-padding`, 0.018, 0.048, 0.043, 0.026, 0.01, 0.003, this.rubber, hand);
		const sleeve = this.cylinder(
			`${name}-forearm`,
			0.073,
			0.245,
			0.035,
			-0.112,
			-0.104,
			this.fabric,
			hand,
			10
		);
		sleeve.rotation.x = Math.PI / 3.1;
		sleeve.rotation.y = -0.15;
		const cuff = this.cylinder(
			`${name}-cuff`,
			0.065,
			0.035,
			0.006,
			-0.038,
			-0.034,
			this.rubber,
			hand,
			10
		);
		cuff.rotation.x = Math.PI / 3.1;
		return hand;
	}

	private buildFlash(): void {
		this.flash = MeshBuilder.CreateSphere(
			'muzzle-flash',
			{ diameter: 0.066, segments: 4 },
			this.scene
		);
		this.attach(this.flash, this.root!, this.flame, 0, 0.016, this.muzzleZ + 0.024);
		for (let i = 0; i < 3; i++) {
			const petal = MeshBuilder.CreateCylinder(
				'muzzle-flame-petal',
				{
					diameterTop: 0,
					diameterBottom: 0.045 - i * 0.006,
					height: 0.12 + i * 0.033,
					tessellation: 5
				},
				this.scene
			);
			this.attach(
				petal,
				this.flash,
				this.flame,
				Math.sin(i * 2.4) * 0.018,
				Math.cos(i * 2.4) * 0.016,
				0.039 + i * 0.012
			);
			petal.rotation.set(Math.PI / 2 + (i - 1) * 0.19, (i - 1) * 0.18, i * 1.8);
		}
		this.flash.setEnabled(false);
	}

	private eject(): void {
		const casing = this.casings[this.casingIndex];
		this.casingIndex = (this.casingIndex + 1) % this.casings.length;
		Matrix.RotationYawPitchRollToRef(
			this.root!.rotation.y,
			this.root!.rotation.x,
			this.root!.rotation.z,
			this.rotation
		);
		this.localEjection.set(0.055, 0.012, this.id === 'pistol' ? 0.06 : 0.055);
		Vector3.TransformCoordinatesToRef(this.localEjection, this.rotation, this.ejection);
		casing.mesh.position.copyFrom(this.ejection).addInPlace(this.root!.position);
		casing.mesh.rotation.set(0.6, 0.3, 0);
		casing.mesh.scaling.set(1, this.id === 'shotgun' ? 1.8 : this.id === 'rifle' ? 1.25 : 0.85, 1);
		casing.life = 0.65;
		casing.vx = 0.8 + (this.shotNumber % 3) * 0.09;
		casing.vy = 0.48 + (this.shotNumber % 4) * 0.05;
		casing.vz = -0.1;
		casing.spin = 11 + (this.shotNumber % 5);
		casing.mesh.setEnabled(true);
	}

	private sights(rearZ: number, frontZ: number, top: number, parent: TransformNode): void {
		this.box('rear-sight-base', 0.066, 0.014, 0.026, 0, top - 0.029, rearZ, this.steel, parent);
		for (const side of [-1, 1]) {
			this.box(
				'rear-sight-notch',
				0.02,
				0.028,
				0.022,
				side * 0.021,
				top - 0.014,
				rearZ,
				this.dark,
				parent
			);
			this.box(
				'rear-sight-index',
				0.005,
				0.005,
				0.002,
				side * 0.021,
				top - 0.006,
				rearZ - 0.012,
				this.accent,
				parent
			);
		}
		this.box(
			'front-sight-pedestal',
			0.027,
			top - 0.041,
			0.025,
			0,
			(top - 0.041) / 2 + 0.027,
			frontZ,
			this.steel,
			parent
		);
		this.box('front-sight-post', 0.007, 0.017, 0.012, 0, top - 0.0085, frontZ, this.dark, parent);
		this.box(
			'front-sight-index',
			0.004,
			0.006,
			0.002,
			0,
			top - 0.008,
			frontZ - 0.007,
			this.accent,
			parent
		);
	}

	private triggerGuard(y: number, z: number, depth: number, parent: TransformNode): void {
		this.box('trigger-guard-bottom', 0.026, 0.008, depth, 0, y - 0.056, z, this.steel, parent);
		this.box(
			'trigger-guard-front',
			0.026,
			0.059,
			0.008,
			0,
			y - 0.029,
			z + depth / 2,
			this.steel,
			parent
		).rotation.x = -0.19;
		this.box('trigger', 0.009, 0.04, 0.009, 0, y - 0.023, z - 0.011, this.dark, parent).rotation.x =
			0.28;
	}

	private receiver(
		name: string,
		width: number,
		height: number,
		depth: number,
		y: number,
		z: number,
		parent: TransformNode,
		material = this.steel
	): void {
		this.box(name, width, height * 0.72, depth, 0, y, z, material, parent);
		this.box(`${name}-top`, width * 0.78, height, depth * 0.985, 0, y, z, material, parent);
		for (const side of [-1, 1]) {
			const edge = this.box(
				`${name}-bevel`,
				width * 0.14,
				height * 0.19,
				depth * 0.985,
				side * width * 0.426,
				y + height * 0.36,
				z,
				material,
				parent
			);
			edge.rotation.z = (side * Math.PI) / 4;
			this.box(
				`${name}-edge-wear`,
				0.0015,
				0.0015,
				depth * 0.57,
				side * width * 0.39,
				y + height * 0.5,
				z - depth * 0.06,
				this.edge,
				parent
			);
		}
	}

	private barrel(
		diameter: number,
		length: number,
		y: number,
		z: number,
		parent: TransformNode
	): void {
		this.cylinder('barrel-steel', diameter, length, 0, y, z, this.steel, parent, 16, true);
		const inner = MeshBuilder.CreateCylinder(
			'muzzle-bore',
			{
				diameter: diameter * 0.69,
				height: 0.07,
				tessellation: 16,
				cap: Mesh.NO_CAP,
				sideOrientation: Mesh.BACKSIDE
			},
			this.scene
		);
		this.attach(inner, parent, this.dark, 0, y, z + length / 2 - 0.035);
		inner.rotation.x = Math.PI / 2;
		const crown = MeshBuilder.CreateTorus(
			'muzzle-crown',
			{ diameter: diameter * 0.84, thickness: diameter * 0.16, tessellation: 16 },
			this.scene
		);
		this.attach(crown, parent, this.edge, 0, y, z + length / 2);
		crown.rotation.x = Math.PI / 2;
		this.cylinder(
			'bore-shadow',
			diameter * 0.69,
			0.002,
			0,
			y,
			z + length / 2 - 0.069,
			this.dark,
			parent,
			16
		);
	}

	private fasteners(
		parent: TransformNode,
		x: number,
		y: number,
		z: number,
		count: number,
		spacing: number
	): void {
		for (let i = 0; i < count; i++) {
			for (const side of [-1, 1]) {
				const pin = this.cylinder(
					'receiver-pin',
					0.009,
					0.003,
					side * x,
					y,
					z + i * spacing,
					this.edge,
					parent,
					8
				);
				pin.rotation.y = Math.PI / 2;
				this.box(
					'pin-slot',
					0.001,
					0.0015,
					0.006,
					side * (x + 0.002),
					y,
					z + i * spacing,
					this.dark,
					parent
				);
			}
		}
	}

	private group(name: string, parent: TransformNode): TransformNode {
		const node = new TransformNode(name, this.scene);
		node.parent = parent;
		return node;
	}

	private attach(
		mesh: Mesh,
		parent: TransformNode,
		material: StandardMaterial,
		x: number,
		y: number,
		z: number
	): Mesh {
		mesh.parent = parent;
		mesh.position.set(x, y, z);
		mesh.material = material;
		mesh.renderingGroupId = 1;
		mesh.isPickable = false;
		mesh.applyFog = false;
		mesh.receiveShadows = false;
		return mesh;
	}

	private box(
		name: string,
		width: number,
		height: number,
		depth: number,
		x: number,
		y: number,
		z: number,
		material: StandardMaterial,
		parent: TransformNode
	): Mesh {
		return this.attach(
			MeshBuilder.CreateBox(name, { width, height, depth }, this.scene),
			parent,
			material,
			x,
			y,
			z
		);
	}

	private cylinder(
		name: string,
		diameter: number,
		length: number,
		x: number,
		y: number,
		z: number,
		material: StandardMaterial,
		parent: TransformNode,
		tessellation = 12,
		open = false
	): Mesh {
		const mesh = MeshBuilder.CreateCylinder(
			name,
			{ diameter, height: length, tessellation, cap: open ? Mesh.NO_CAP : Mesh.CAP_ALL },
			this.scene
		);
		this.attach(mesh, parent, material, x, y, z);
		mesh.rotation.x = Math.PI / 2;
		return mesh;
	}

	private material(
		name: string,
		color: string,
		specular: number,
		surface?: 'metal' | 'rubber' | 'wood' | 'cloth'
	): StandardMaterial {
		const material = new StandardMaterial(`view-${name}`, this.scene);
		material.diffuseColor = Color3.FromHexString(color);
		material.specularColor.set(specular, specular, specular);
		material.specularPower = surface === 'metal' ? 72 : 24;
		material.ambientColor.set(0.16, 0.16, 0.16);
		if (surface) {
			const size = 128;
			const data = new Uint8Array(size * size * 3);
			let seed = 4179;
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
					const noise = (seed >>> 24) / 255;
					let tone: number;
					if (surface === 'wood')
						tone = 175 + Math.sin(x * 0.33 + Math.sin(y * 0.04) * 3) * 24 + noise * 25;
					else if (surface === 'rubber')
						tone = 165 + ((x + y) % 8 < 2 || (x - y + 128) % 8 < 2 ? 36 : 0) + noise * 20;
					else if (surface === 'cloth')
						tone = 170 + (x % 4 < 2 ? 22 : 0) + (y % 4 < 2 ? 14 : 0) + noise * 16;
					else
						tone =
							194 + noise * 22 + Math.sin(y * 2.7) * 7 + (y % 37 === 0 && x % 43 < 24 ? 23 : 0);
					const index = (y * size + x) * 3;
					data[index] = data[index + 1] = data[index + 2] = tone;
				}
			}
			const texture = RawTexture.CreateRGBTexture(
				data,
				size,
				size,
				this.scene,
				true,
				false,
				Texture.TRILINEAR_SAMPLINGMODE
			);
			texture.name = `view-${surface}-grain`;
			material.diffuseTexture = texture;
			this.textures.push(texture);
		}
		this.materials.push(material);
		return material;
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.root?.dispose(false, false);
		this.effects.dispose(false, false);
		for (const material of this.materials) material.dispose(false, false);
		for (const texture of this.textures) texture.dispose();
		this.casings.length = this.materials.length = this.textures.length = 0;
		this.root = undefined;
	}
}
