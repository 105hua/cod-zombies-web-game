import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Navigation } from '../systems/Navigation';
import { ZombieModels, type ZombieModel } from './ZombieModel';

export interface Zombie {
	id: number;
	root: TransformNode;
	health: number;
	speed: number;
	attack: number;
	legs: Mesh[];
	arms: Mesh[];
}

type Action = 'pursuit' | 'windup' | 'strike' | 'recovery';

interface Animation {
	model: ZombieModel;
	action: Action;
	actionTime: number;
	clock: number;
	stride: number;
	travel: number;
	reaction: number;
	reactionCooldown: number;
	headReaction: boolean;
}

interface Corpse {
	model: ZombieModel;
	age: number;
	lean: number;
	twist: number;
}

const REACH = 1.05;
const WINDUP = 0.28;
const STRIKE = 0.12;
const RECOVERY = 0.36;
const CORPSE_LIFETIME = 2.4;
const MAX_CORPSES = 10;

function approach(value: number, target: number, blend: number) {
	return value + (target - value) * blend;
}

export class Horde {
	readonly enemies: Zombie[] = [];
	private nextId = 0;
	private readonly models: ZombieModels;
	private readonly animations = new Map<number, Animation>();
	private readonly corpses: Corpse[] = [];

	constructor(scene: Scene) {
		this.models = new ZombieModels(scene);
	}

	spawn(x: number, z: number, round: number) {
		const id = this.nextId++;
		const model = this.models.create(id);
		model.root.position.set(x, 0, z);
		const animation: Animation = {
			model,
			action: 'pursuit',
			actionTime: 0,
			clock: id * 0.71,
			stride: 0,
			travel: id * 1.7,
			reaction: 0,
			reactionCooldown: 0,
			headReaction: false
		};
		this.animations.set(id, animation);
		this.pose(animation, 1);
		this.enemies.push({
			id,
			root: model.root,
			health: 90 * Math.pow(1.13, round - 1),
			speed: Math.min(2.9, 1.05 + round * 0.12),
			attack: 0,
			legs: model.legs,
			arms: model.arms
		});
	}

	private clearReach(enemy: Zombie, player: { x: number; z: number }, navigation: Navigation) {
		const p = enemy.root.position;
		const dx = player.x - p.x;
		const dz = player.z - p.z;
		const distance = Math.hypot(dx, dz);
		if (distance >= REACH) return false;
		// Sweep a narrow hand-width corridor, including both ends, rather than hitting through cover.
		const steps = Math.max(1, Math.ceil(distance / 0.08));
		for (let step = 0; step <= steps; step++) {
			if (!navigation.canStand(p.x + (dx * step) / steps, p.z + (dz * step) / steps, 0.08))
				return false;
		}
		return true;
	}

	private facing(enemy: Zombie, player: { x: number; z: number }) {
		const dx = player.x - enemy.root.position.x;
		const dz = player.z - enemy.root.position.z;
		const length = Math.hypot(dx, dz);
		return (
			length < 0.001 ||
			(Math.sin(enemy.root.rotation.y) * dx + Math.cos(enemy.root.rotation.y) * dz) / length > 0.55
		);
	}

	update(
		dt: number,
		_time: number,
		player: { x: number; z: number },
		navigation: Navigation,
		attack: (enemy: Zombie) => void
	) {
		if (dt <= 0) return;
		this.updateCorpses(dt);
		for (const enemy of this.enemies) {
			const animation = this.animations.get(enemy.id)!;
			const p = enemy.root.position;
			const oldX = p.x;
			const oldZ = p.z;
			animation.clock += dt;
			animation.reaction = Math.max(0, animation.reaction - dt);
			animation.reactionCooldown = Math.max(0, animation.reactionCooldown - dt);
			enemy.attack = Math.max(0, enemy.attack - dt);
			if (animation.action === 'pursuit') {
				const distance = Math.hypot(player.x - p.x, player.z - p.z);
				let dx = 0;
				let dz = 0;
				if (distance >= REACH * 0.94 || !this.clearReach(enemy, player, navigation)) {
					const direction = navigation.direction(p.x, p.z, player.x, player.z);
					dx = direction.x;
					dz = direction.z;
				}
				for (const other of this.enemies) {
					if (other === enemy) continue;
					let ox = p.x - other.root.position.x;
					let oz = p.z - other.root.position.z;
					let squared = ox * ox + oz * oz;
					if (squared < 0.001) {
						// Stable opposite directions recover coincident spawn pairs without random jitter.
						const first = Math.min(enemy.id, other.id);
						const second = Math.max(enemy.id, other.id);
						const angle = ((Math.imul(first + 1, 73) + Math.imul(second + 1, 151)) % 628) * 0.01;
						const sign = enemy.id < other.id ? -1 : 1;
						ox = Math.cos(angle) * 0.4 * sign;
						oz = Math.sin(angle) * 0.4 * sign;
						squared = 0.16;
					}
					if (squared < 0.65) {
						dx += ox * (0.65 - squared) * 2;
						dz += oz * (0.65 - squared) * 2;
					}
				}
				const length = Math.hypot(dx, dz);
				if (length > 0.001) {
					const step = (enemy.speed * dt) / Math.max(1, length);
					navigation.move(p, dx * step, dz * step);
				}
				const movedX = p.x - oldX;
				const movedZ = p.z - oldZ;
				const moving = Math.hypot(movedX, movedZ) > 0.002;
				const heading = moving
					? Math.atan2(movedX, movedZ)
					: Math.atan2(player.x - p.x, player.z - p.z);
				const delta = heading - enemy.root.rotation.y;
				enemy.root.rotation.y +=
					Math.atan2(Math.sin(delta), Math.cos(delta)) * (1 - Math.exp(-dt * 9));
				if (
					enemy.attack <= 0 &&
					this.facing(enemy, player) &&
					this.clearReach(enemy, player, navigation)
				) {
					animation.action = 'windup';
					animation.actionTime = 0;
					enemy.attack = 1.2;
				}
			} else {
				animation.actionTime += dt;
				if (animation.action === 'windup' && animation.actionTime >= WINDUP) {
					animation.action = 'strike';
					animation.actionTime = 0;
					// The committed strike does not track a sidestep and rechecks cover at impact.
					if (this.facing(enemy, player) && this.clearReach(enemy, player, navigation))
						attack(enemy);
				} else if (animation.action === 'strike' && animation.actionTime >= STRIKE) {
					animation.action = 'recovery';
					animation.actionTime = 0;
				} else if (animation.action === 'recovery' && animation.actionTime >= RECOVERY) {
					animation.action = 'pursuit';
					animation.actionTime = 0;
				}
			}
			const traveled = Math.hypot(p.x - oldX, p.z - oldZ);
			animation.travel += traveled * 7.5;
			animation.stride +=
				(Math.min(1, traveled / (dt * enemy.speed)) - animation.stride) * (1 - Math.exp(-dt * 12));
			this.pose(animation, 1 - Math.exp(-dt * 18));
		}
	}

	private pose(animation: Animation, blend: number) {
		const { model, stride, travel, clock } = animation;
		const walk = Math.sin(travel);
		const breathing = Math.sin(clock * 1.8);
		let windup = 0;
		let strike = 0;
		if (animation.action === 'windup') windup = Math.min(1, animation.actionTime / WINDUP);
		if (animation.action === 'strike') strike = 1;
		if (animation.action === 'recovery') strike = Math.max(0, 1 - animation.actionTime / RECOVERY);
		const flinch = Math.sin(
			Math.min(1, animation.reaction / (animation.headReaction ? 0.28 : 0.22)) * Math.PI
		);
		model.hips.position.y = 0.83 + Math.abs(walk) * stride * 0.035;
		model.hips.rotation.y = walk * stride * 0.055;
		model.torso.rotation.x = approach(
			model.torso.rotation.x,
			0.09 + breathing * 0.012 - windup * 0.17 + strike * 0.2 - flinch * 0.13,
			blend
		);
		model.torso.rotation.z = approach(
			model.torso.rotation.z,
			model.asymmetry * 0.035 + walk * stride * 0.045,
			blend
		);
		model.head.rotation.x = approach(
			model.head.rotation.x,
			-0.08 + breathing * 0.035 - flinch * (animation.headReaction ? 0.36 : 0.12),
			blend
		);
		model.head.rotation.z = approach(
			model.head.rotation.z,
			model.asymmetry * 0.09 + flinch * 0.12,
			blend
		);
		for (let index = 0; index < 2; index++) {
			const side = index === 0 ? -1 : 1;
			const phase = walk * side;
			model.legs[index].rotation.x = approach(
				model.legs[index].rotation.x,
				phase * stride * 0.44 - strike * 0.08,
				blend
			);
			model.knees[index].rotation.x = approach(
				model.knees[index].rotation.x,
				0.08 + Math.max(0, -phase) * stride * 0.58 + windup * 0.06,
				blend
			);
			model.arms[index].rotation.x = approach(
				model.arms[index].rotation.x,
				-0.48 - phase * stride * 0.16 + windup * 0.25 - strike * 0.96 + flinch * 0.13,
				blend
			);
			model.arms[index].rotation.z = approach(
				model.arms[index].rotation.z,
				side * (0.11 + windup * 0.19) + model.asymmetry * 0.035,
				blend
			);
			model.elbows[index].rotation.x = approach(
				model.elbows[index].rotation.x,
				-0.38 - windup * 1.0 + strike * 0.3 + side * 0.09,
				blend
			);
		}
	}

	react(enemy: Zombie, headshot: boolean) {
		const animation = this.animations.get(enemy.id);
		if (!animation || animation.reactionCooldown > 0) return;
		animation.reaction = headshot ? 0.28 : 0.22;
		animation.reactionCooldown = 0.4;
		animation.headReaction = headshot;
	}

	remove(enemy: Zombie) {
		const index = this.enemies.indexOf(enemy);
		if (index < 0) return;
		this.enemies.splice(index, 1);
		const animation = this.animations.get(enemy.id)!;
		this.animations.delete(enemy.id);
		for (const mesh of animation.model.meshes) {
			mesh.isPickable = false;
			mesh.metadata = null;
			mesh.checkCollisions = false;
		}
		if (this.corpses.length >= MAX_CORPSES) this.corpses.shift()!.model.root.dispose();
		this.corpses.push({
			model: animation.model,
			age: 0,
			lean: enemy.root.rotation.x,
			twist: enemy.root.rotation.z
		});
	}

	private updateCorpses(dt: number) {
		for (let index = this.corpses.length - 1; index >= 0; index--) {
			const corpse = this.corpses[index];
			corpse.age += dt;
			if (corpse.age >= CORPSE_LIFETIME) {
				corpse.model.root.dispose();
				this.corpses.splice(index, 1);
				continue;
			}
			const fall = Math.min(1, corpse.age / 0.58);
			const ease = fall * fall * (3 - 2 * fall);
			const model = corpse.model;
			model.root.rotation.x = corpse.lean + (1.49 - corpse.lean) * ease;
			model.root.rotation.z = corpse.twist + model.asymmetry * 0.18 * ease;
			model.root.position.y = 0.17 * ease;
			const settle = 1 - Math.exp(-dt * 7);
			model.torso.rotation.x = approach(model.torso.rotation.x, 0.18, settle);
			for (let limb = 0; limb < 2; limb++) {
				model.knees[limb].rotation.x = approach(model.knees[limb].rotation.x, 0.45, settle);
				model.arms[limb].rotation.x = approach(model.arms[limb].rotation.x, -0.25, settle);
				model.elbows[limb].rotation.x = approach(model.elbows[limb].rotation.x, -0.6, settle);
			}
			const visibility = Math.min(1, (CORPSE_LIFETIME - corpse.age) / 0.7);
			for (const mesh of model.meshes) mesh.visibility = visibility;
		}
	}

	clear() {
		for (const enemy of this.enemies) enemy.root.dispose();
		for (const corpse of this.corpses) corpse.model.root.dispose();
		this.enemies.length = 0;
		this.corpses.length = 0;
		this.animations.clear();
		this.models.dispose();
	}
}
