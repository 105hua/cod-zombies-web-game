import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { PickupKind } from '../types';

type Fragment = { mesh: Mesh; velocity: Vector3; life: number; duration: number };
type Mark = { mesh: Mesh; life: number };

/** Scene-owned materials and fixed pools keep long rounds from accumulating effects. */
export class CombatEffects {
	private readonly fragments: Fragment[] = [];
	private readonly marks: Mark[] = [];
	private fragmentCursor = 0;
	private markCursor = 0;
	private readonly dust: StandardMaterial;
	private readonly blood: StandardMaterial;
	private readonly steel: StandardMaterial;
	private readonly brass: StandardMaterial;
	private readonly enamel: StandardMaterial;
	private readonly accents: Record<PickupKind, StandardMaterial>;
	private readonly labels: Record<PickupKind, StandardMaterial>;

	constructor(private readonly scene: Scene) {
		const material = (name: string, color: string, emission = 0) => {
			const mat = new StandardMaterial(name, scene);
			mat.diffuseColor = Color3.FromHexString(color);
			mat.specularColor.set(0.1, 0.1, 0.1);
			mat.emissiveColor = mat.diffuseColor.scale(emission);
			return mat;
		};
		this.dust = material('impact-stone', '#8d8975');
		this.blood = material('impact-blood', '#61291e');
		this.steel = material('pickup-dark-steel', '#344440');
		this.brass = material('pickup-cartridge-brass', '#b19457');
		this.enamel = material('pickup-aged-enamel', '#c7c0a2');
		const soot = material('impact-soot', '#18201d');
		const colors = { ammo: '#87c99e', double: '#e0b96b', instakill: '#ce735a', nuke: '#85b8cc' };
		const names = { ammo: 'AMMUNITION', double: '2× POINTS', instakill: 'LETHAL', nuke: 'PURGE' };
		this.accents = {} as Record<PickupKind, StandardMaterial>;
		this.labels = {} as Record<PickupKind, StandardMaterial>;
		for (const kind of Object.keys(colors) as PickupKind[]) {
			this.accents[kind] = material(`pickup-${kind}-signal`, colors[kind], 0.65);
			const label = material(`pickup-${kind}-label`, '#ffffff', 0.4);
			const texture = new DynamicTexture(
				`pickup-${kind}-stencil`,
				{ width: 256, height: 64 },
				scene,
				false
			);
			const ctx = texture.getContext() as CanvasRenderingContext2D;
			ctx.fillStyle = '#172822';
			ctx.fillRect(0, 0, 256, 64);
			ctx.strokeStyle = colors[kind];
			ctx.strokeRect(3, 3, 250, 58);
			ctx.fillStyle = colors[kind];
			ctx.font = 'bold 26px monospace';
			ctx.textAlign = 'center';
			ctx.fillText(names[kind], 128, 42);
			texture.update();
			label.diffuseTexture = texture;
			this.labels[kind] = label;
		}
		for (let i = 0; i < 36; i++) {
			const mesh = MeshBuilder.CreateSphere(
				`impact-fragment-${i}`,
				{ diameter: 1, segments: 3 },
				scene
			);
			mesh.isPickable = false;
			mesh.setEnabled(false);
			this.fragments.push({ mesh, velocity: new Vector3(), life: 0, duration: 1 });
		}
		for (let i = 0; i < 24; i++) {
			const mesh = MeshBuilder.CreateDisc(
				`impact-mark-${i}`,
				{ radius: 0.045, tessellation: 7 },
				scene
			);
			mesh.material = soot;
			mesh.isPickable = false;
			mesh.setEnabled(false);
			this.marks.push({ mesh, life: 0 });
		}
	}

	impact(position: Vector3, normal: Vector3 | null, flesh: boolean) {
		for (let i = 0; i < (flesh ? 5 : 3); i++) {
			const particle = this.fragments[this.fragmentCursor++ % this.fragments.length];
			particle.mesh.position.copyFrom(position);
			particle.mesh.material = flesh ? this.blood : this.dust;
			particle.mesh.scaling.setAll(
				flesh ? 0.025 + Math.random() * 0.03 : 0.015 + Math.random() * 0.03
			);
			particle.velocity.set(
				(Math.random() - 0.5) * 1.8 + (normal?.x ?? 0) * 1.2,
				Math.random() * 1.6 + 0.5 + (normal?.y ?? 0),
				(Math.random() - 0.5) * 1.8 + (normal?.z ?? 0) * 1.2
			);
			particle.life = particle.duration = flesh ? 0.38 : 0.5;
			particle.mesh.visibility = 1;
			particle.mesh.setEnabled(true);
		}
		if (!flesh && normal && normal.lengthSquared() > 0.5) {
			const mark = this.marks[this.markCursor++ % this.marks.length];
			mark.mesh.position
				.copyFrom(position)
				.addInPlaceFromFloats(normal.x * 0.006, normal.y * 0.006, normal.z * 0.006);
			mark.mesh.rotationQuaternion = Quaternion.FromLookDirectionLH(
				normal.negate(),
				Math.abs(normal.y) > 0.95 ? Vector3.Forward() : Vector3.Up()
			);
			mark.mesh.scaling.setAll(0.7 + Math.random() * 0.7);
			mark.mesh.visibility = 0.8;
			mark.life = 14;
			mark.mesh.setEnabled(true);
		}
	}

	update(dt: number) {
		for (const particle of this.fragments) {
			if (particle.life <= 0) continue;
			particle.life -= dt;
			if (particle.life <= 0) {
				particle.mesh.setEnabled(false);
				continue;
			}
			particle.velocity.y -= 5 * dt;
			particle.mesh.position.addInPlaceFromFloats(
				particle.velocity.x * dt,
				particle.velocity.y * dt,
				particle.velocity.z * dt
			);
			particle.mesh.visibility = particle.life / particle.duration;
		}
		for (const mark of this.marks) {
			if (mark.life <= 0) continue;
			mark.life -= dt;
			if (mark.life <= 0) mark.mesh.setEnabled(false);
			else mark.mesh.visibility = Math.min(0.8, mark.life / 3);
		}
	}

	createPickup(kind: PickupKind, position: Vector3): TransformNode {
		const root = new TransformNode(`pickup-${kind}`, this.scene);
		root.position.copyFrom(position);
		root.position.y = 0.6;
		const box = (
			name: string,
			width: number,
			height: number,
			depth: number,
			x: number,
			y: number,
			z: number,
			mat = this.steel
		) => {
			const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, this.scene);
			mesh.parent = root;
			mesh.position.set(x, y, z);
			mesh.material = mat;
			mesh.isPickable = false;
			return mesh;
		};
		const cylinder = (
			name: string,
			height: number,
			diameter: number,
			x: number,
			y: number,
			mat = this.brass
		) => {
			const mesh = MeshBuilder.CreateCylinder(
				name,
				{ height, diameter, tessellation: 10 },
				this.scene
			);
			mesh.parent = root;
			mesh.position.set(x, y, 0);
			mesh.material = mat;
			mesh.isPickable = false;
			return mesh;
		};
		if (kind === 'ammo') {
			box('salvaged-ammo-tin', 0.5, 0.3, 0.3, 0, 0, 0);
			box('ammo-tin-lid', 0.54, 0.045, 0.34, 0, 0.17, 0);
			for (const x of [-0.16, 0, 0.16]) cylinder('exposed-cartridge', 0.22, 0.07, x, 0.3);
			box('ammo-latch', 0.065, 0.12, 0.04, 0, 0.09, -0.18, this.brass);
		} else if (kind === 'double') {
			for (const x of [-0.13, 0.13]) {
				const reel = cylinder('bounty-reel', 0.09, 0.36, x, 0.1);
				reel.rotation.x = Math.PI / 2;
				box('bounty-reel-hub', 0.07, 0.07, 0.12, x, 0.1, -0.03, this.steel);
			}
		} else if (kind === 'instakill') {
			const skull = MeshBuilder.CreateSphere(
				'lethal-skull',
				{ diameter: 0.4, segments: 8 },
				this.scene
			);
			skull.parent = root;
			skull.scaling.set(0.85, 1, 0.8);
			skull.material = this.enamel;
			skull.isPickable = false;
			for (const x of [-0.08, 0.08]) box('skull-eye-socket', 0.09, 0.095, 0.045, x, 0.04, -0.145);
			box('skull-jaw', 0.21, 0.1, 0.21, 0, -0.16, -0.035, this.enamel);
			for (const x of [-0.06, 0, 0.06]) box('skull-teeth', 0.019, 0.05, 0.02, x, -0.14, -0.145);
		} else {
			cylinder('purge-capacitor', 0.5, 0.27, 0, 0);
			for (const y of [-0.22, 0.22]) cylinder('purge-cap', 0.065, 0.32, 0, y, this.steel);
			box('purge-charge-strip', 0.065, 0.32, 0.04, 0, 0, -0.15, this.accents[kind]);
		}
		const ring = MeshBuilder.CreateTorus(
			'pickup-signal-ring',
			{ diameter: 0.72, thickness: 0.018, tessellation: 24 },
			this.scene
		);
		ring.parent = root;
		ring.position.y = -0.3;
		ring.material = this.accents[kind];
		ring.isPickable = false;
		box('pickup-identification', 0.66, 0.16, 0.025, 0, -0.46, 0, this.labels[kind]);
		return root;
	}
}
