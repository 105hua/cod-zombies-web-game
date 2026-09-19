import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';

export interface ZombieModel {
	root: TransformNode;
	hips: TransformNode;
	torso: TransformNode;
	head: TransformNode;
	legs: Mesh[];
	knees: Mesh[];
	arms: Mesh[];
	elbows: Mesh[];
	meshes: Mesh[];
	asymmetry: number;
}

/** Shared, bounded surface palette; corpse fading changes mesh visibility, never these materials. */
export class ZombieModels {
	private readonly materials = new Map<string, StandardMaterial>();
	private fabric?: RawTexture;

	constructor(private readonly scene: Scene) {}

	private material(name: string, hex: string, fabric = false) {
		const existing = this.materials.get(name);
		if (existing) return existing;
		const material = new StandardMaterial(`worker-${name}`, this.scene);
		material.diffuseColor = Color3.FromHexString(hex);
		material.specularColor = new Color3(0.035, 0.035, 0.03);
		material.specularPower = 12;
		if (fabric) {
			if (!this.fabric) {
				const pixels = new Uint8Array(64 * 64 * 3);
				let seed = 419;
				for (let y = 0; y < 64; y++) {
					for (let x = 0; x < 64; x++) {
						seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
						const weave = (x % 3 === 0 ? 10 : 0) + (y % 3 === 0 ? 8 : 0);
						const stain = Math.sin(x * 0.18 + Math.sin(y * 0.13)) * 17;
						const value = Math.round(190 + (seed >>> 27) - weave + stain);
						const offset = (y * 64 + x) * 3;
						pixels[offset] = value;
						pixels[offset + 1] = value;
						pixels[offset + 2] = value;
					}
				}
				this.fabric = RawTexture.CreateRGBTexture(pixels, 64, 64, this.scene, true, false);
				this.fabric.name = 'worker-woven-grime';
			}
			material.diffuseTexture = this.fabric;
		}
		this.materials.set(name, material);
		return material;
	}

	create(id: number): ZombieModel {
		const variant = id % 3;
		const skin = this.material('skin', '#8a9683');
		const shadow = this.material('shadow', '#3b453a');
		const bruise = this.material('bruise', '#62574e');
		const shirt = this.material(
			`shirt-${variant}`,
			['#59634c', '#596965', '#776b4b'][variant],
			true
		);
		const cloth = this.material('trousers', '#35413e', true);
		const boot = this.material('leather', '#262d28');
		const seam = this.material('seam', '#92907b', true);
		const eye = this.material('eye', '#d5b879');
		const root = new TransformNode(`zombie-${id}`, this.scene);
		const meshes: Mesh[] = [];
		const pivot = (name: string, parent: TransformNode, x: number, y: number, z = 0) => {
			const node = new Mesh(`${name}-${id}`, this.scene);
			node.parent = parent;
			node.position.set(x, y, z);
			node.isPickable = false;
			return node;
		};
		const finish = (
			mesh: Mesh,
			parent: TransformNode,
			x: number,
			y: number,
			z: number,
			material: StandardMaterial,
			headshot: boolean
		) => {
			mesh.parent = parent;
			mesh.position.set(x, y, z);
			mesh.material = material;
			mesh.metadata = { enemyId: id, headshot };
			meshes.push(mesh);
			return mesh;
		};
		const oval = (
			name: string,
			parent: TransformNode,
			w: number,
			h: number,
			d: number,
			x: number,
			y: number,
			z: number,
			material: StandardMaterial,
			headshot = false
		) =>
			finish(
				MeshBuilder.CreateSphere(
					`${name}-${id}`,
					{ diameterX: w, diameterY: h, diameterZ: d, segments: 8 },
					this.scene
				),
				parent,
				x,
				y,
				z,
				material,
				headshot
			);
		const taper = (
			name: string,
			parent: TransformNode,
			top: number,
			bottom: number,
			height: number,
			x: number,
			y: number,
			z: number,
			material: StandardMaterial
		) =>
			finish(
				MeshBuilder.CreateCylinder(
					`${name}-${id}`,
					{ diameterTop: top, diameterBottom: bottom, height, tessellation: 8 },
					this.scene
				),
				parent,
				x,
				y,
				z,
				material,
				false
			);
		const patch = (
			name: string,
			parent: TransformNode,
			w: number,
			h: number,
			d: number,
			x: number,
			y: number,
			z: number,
			material: StandardMaterial,
			headshot = false
		) =>
			finish(
				MeshBuilder.CreateBox(`${name}-${id}`, { width: w, height: h, depth: d }, this.scene),
				parent,
				x,
				y,
				z,
				material,
				headshot
			);

		const hips = pivot('pelvis-joint', root, 0, 0.83);
		oval('pelvis', hips, 0.48, 0.29, 0.32, 0, 0, 0, cloth);
		const torso = pivot('spine', hips, 0, 0.24);
		oval('shirt-chest', torso, 0.58, 0.58, 0.35, 0, 0.15, 0, shirt);
		oval('shirt-waist', torso, 0.43, 0.32, 0.3, 0, -0.07, 0, shirt);
		patch('shirt-placket', torso, 0.025, 0.4, 0.018, 0, 0.16, 0.174, seam);
		patch('chest-pocket', torso, 0.13, 0.13, 0.025, -0.14, 0.24, 0.166, cloth);
		patch('worker-badge', torso, 0.1, 0.045, 0.025, 0.13, 0.3, 0.15, seam);
		patch('torn-shirt-hem', torso, 0.14, 0.085, 0.025, 0.13, -0.15, 0.137, shadow).rotation.z = 0.2;
		oval('collar', torso, 0.29, 0.095, 0.27, 0, 0.42, 0.01, cloth);
		taper('neck', torso, 0.16, 0.2, 0.17, 0, 0.48, 0.02, skin);
		const head = pivot('head-joint', torso, 0, 0.58, 0.025);
		head.scaling.set(0.82, 0.9, 0.85);
		oval('skull', head, 0.32, 0.37, 0.32, 0, 0.025, 0, skin, true);
		oval('jaw', head, 0.24, 0.16, 0.23, 0, -0.115, 0.041, bruise, true);
		oval('nose', head, 0.07, 0.13, 0.095, 0, 0.005, 0.155, skin, true);
		patch('mouth', head, 0.14, 0.035, 0.018, 0.009, -0.11, 0.159, shadow, true).rotation.z = 0.11;
		oval('cheek-wound', head, 0.07, 0.09, 0.025, 0.115, -0.05, 0.13, bruise, true);
		for (const side of [-1, 1]) {
			oval('ear', head, 0.055, 0.115, 0.08, side * 0.162, 0.015, 0, skin, true);
			oval('eye-socket', head, 0.078, 0.043, 0.027, side * 0.074, 0.06, 0.145, shadow, true);
			oval('eye', head, 0.023, 0.016, 0.019, side * 0.074, 0.059, 0.159, eye, true);
			oval('brow', head, 0.096, 0.027, 0.037, side * 0.072, 0.091, 0.133, skin, true).rotation.z =
				side * 0.12;
		}
		if (variant === 1) {
			oval('work-cap', head, 0.345, 0.12, 0.34, 0, 0.17, -0.018, cloth, true);
			patch('cap-brim', head, 0.28, 0.018, 0.14, 0, 0.143, 0.153, cloth, true);
		}

		const legs: Mesh[] = [];
		const knees: Mesh[] = [];
		const arms: Mesh[] = [];
		const elbows: Mesh[] = [];
		for (const side of [-1, 1]) {
			const leg = pivot('hip-joint', hips, side * 0.155, -0.025);
			taper('thigh', leg, 0.24, 0.19, 0.36, 0, -0.17, 0, cloth);
			const knee = pivot('knee-joint', leg, 0, -0.36);
			oval('knee', knee, 0.19, 0.18, 0.21, 0, -0.015, 0.005, cloth);
			taper('shin', knee, 0.18, 0.145, 0.31, 0, -0.18, 0, cloth);
			oval('work-boot', knee, 0.2, 0.18, 0.32, 0, -0.36, 0.055, boot);
			patch('boot-sole', knee, 0.19, 0.035, 0.29, 0, -0.433, 0.055, shadow);
			if (side === (variant === 0 ? -1 : 1)) {
				patch('patched-knee', knee, 0.12, 0.12, 0.02, 0, -0.02, 0.11, seam).rotation.z = side * 0.2;
			}
			legs.push(leg);
			knees.push(knee);

			const arm = pivot('shoulder-joint', torso, side * 0.275, 0.31);
			oval('shoulder', arm, 0.2, 0.2, 0.22, side * 0.005, -0.035, 0, shirt);
			taper('sleeve', arm, 0.19, 0.145, 0.29, 0, -0.18, 0, shirt);
			const elbow = pivot('elbow-joint', arm, 0, -0.33);
			oval('elbow', elbow, 0.155, 0.155, 0.16, 0, 0, 0, skin);
			taper('forearm', elbow, 0.15, 0.105, 0.28, 0, -0.14, 0, skin);
			oval('hand', elbow, 0.115, 0.18, 0.085, 0, -0.335, 0.025, skin);
			oval('thumb', elbow, 0.065, 0.11, 0.07, -side * 0.057, -0.3, 0.04, bruise);
			arms.push(arm);
			elbows.push(elbow);
		}
		// Rigid detail shares one draw per joint/material/hit region; joint meshes stay independent.
		const groups = new Map<string, Mesh[]>();
		for (const mesh of meshes) {
			const key = `${mesh.parent!.uniqueId}:${mesh.material!.uniqueId}:${mesh.metadata.headshot}`;
			const group = groups.get(key);
			if (group) group.push(mesh);
			else groups.set(key, [mesh]);
		}
		meshes.length = 0;
		for (const group of groups.values()) {
			if (group.length === 1) {
				meshes.push(group[0]);
				continue;
			}
			const parent = group[0].parent;
			const material = group[0].material;
			const metadata = group[0].metadata;
			// MergeMeshes bakes world transforms. Detach without preserving world space so the
			// baked vertices remain joint-local when the merged surface is parented again.
			for (const mesh of group) mesh.parent = null;
			const merged = Mesh.MergeMeshes(group, true, true);
			if (!merged) throw new Error(`Could not merge procedural zombie ${id}`);
			merged.parent = parent;
			merged.material = material;
			merged.metadata = metadata;
			meshes.push(merged);
		}
		return {
			root,
			hips,
			torso,
			head,
			legs,
			knees,
			arms,
			elbows,
			meshes,
			asymmetry: (((id * 17) % 11) - 5) / 5
		};
	}

	dispose() {
		for (const material of this.materials.values()) material.dispose();
		this.materials.clear();
		this.fabric?.dispose();
		this.fabric = undefined;
	}
}
