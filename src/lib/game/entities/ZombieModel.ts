import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import { ZombieMaterials } from './ZombieMaterials';

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

// Cross-sections in joint-local space: height, half width, half depth, depth offset.
type Section = readonly [y: number, width: number, depth: number, z: number];

function hollow(x: number, y: number, cx: number, cy: number, w: number, h: number) {
	return Math.exp(-(((x - cx) / w) ** 2 + ((y - cy) / h) ** 2) * 2);
}

/** Original procedural characters; the joint and hit-region contract is shared with Horde. */
export class ZombieModels {
	private readonly palette: ZombieMaterials;

	constructor(private readonly scene: Scene) {
		this.palette = new ZombieMaterials(scene);
	}

	create(id: number): ZombieModel {
		const variant = id % 3;
		const skin = this.palette.get(
			`skin-${variant}`,
			['#a6a08a', '#959d92', '#afa08a'][variant],
			'skin'
		);
		const faceSkin = this.palette.get(
			`face-${variant}`,
			['#b1a793', '#a3aaa0', '#b7a58e'][variant],
			'face'
		);
		const shadow = this.palette.get('recess', '#29221f');
		const wound = this.palette.get('wound', '#63362f', 'skin');
		const bone = this.palette.get('bone', '#bbac87', 'skin');
		const shirt = this.palette.get(
			`shirt-${variant}`,
			['#72735d', '#697879', '#93856b'][variant],
			'fabric'
		);
		const cloth = this.palette.get('trousers', '#51574e', 'fabric');
		const boot = this.palette.get('leather', '#39372f', 'leather');
		const seam = this.palette.get('seam', '#898371', 'fabric');
		const eye = this.palette.get('eye', '#ffbc54');
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
			material: StandardMaterial,
			headshot = false
		) => {
			mesh.parent = parent;
			mesh.material = material;
			mesh.metadata = { enemyId: id, headshot };
			// All parts have colors so merging a sculpted surface with its details preserves shading.
			if (!mesh.isVerticesDataPresent('color')) {
				mesh.setVerticesData('color', new Float32Array(mesh.getTotalVertices() * 4).fill(1));
			}
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
			headshot = false,
			segments = 6
		) => {
			const mesh = MeshBuilder.CreateSphere(
				`${name}-${id}`,
				{
					diameterX: w,
					diameterY: h,
					diameterZ: d,
					segments
				},
				this.scene
			);
			mesh.position.set(x, y, z);
			return finish(mesh, parent, material, headshot);
		};
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
		) => {
			const mesh = MeshBuilder.CreateBox(
				`${name}-${id}`,
				{ width: w, height: h, depth: d },
				this.scene
			);
			mesh.position.set(x, y, z);
			return finish(mesh, parent, material, headshot);
		};
		const cord = (
			name: string,
			parent: TransformNode,
			points: number[][],
			radius: number,
			material: StandardMaterial,
			headshot = false
		) =>
			finish(
				MeshBuilder.CreateTube(
					`${name}-${id}`,
					{
						path: points.map(([x, y, z]) => new Vector3(x, y, z)),
						radius,
						tessellation: 6,
						cap: Mesh.CAP_ALL
					},
					this.scene
				),
				parent,
				material,
				headshot
			);

		// Continuous, smooth cross-sections replace stacked balls and straight eight-sided tubes.
		const surface = (
			name: string,
			parent: TransformNode,
			sections: readonly Section[],
			material: StandardMaterial,
			options: {
				segments?: number;
				folds?: number;
				ragged?: number;
				face?: boolean;
				tear?: boolean;
				headshot?: boolean;
			} = {}
		) => {
			const {
				segments = 20,
				folds = 0,
				ragged = 0,
				face = false,
				tear = false,
				headshot = false
			} = options;
			const positions: number[] = [];
			const indices: number[] = [];
			const uvs: number[] = [];
			const colors: number[] = [];
			const rows = (sections.length - 1) * 2;
			for (let row = 0; row <= rows; row++) {
				const section = Math.min(sections.length - 2, Math.floor(row / 2));
				const blend = row / 2 - section;
				const a = sections[section];
				const b = sections[section + 1];
				const y = a[0] + (b[0] - a[0]) * blend;
				const width = a[1] + (b[1] - a[1]) * blend;
				const depth = a[2] + (b[2] - a[2]) * blend;
				const center = a[3] + (b[3] - a[3]) * blend;
				for (let column = 0; column <= segments; column++) {
					const angle = (column / segments) * Math.PI * 2;
					const sin = Math.sin(angle);
					const cos = Math.cos(angle);
					const wrinkle =
						folds * (Math.sin(angle * 7 + y * 43) * 0.6 + Math.sin(angle * 11 - y * 27) * 0.4);
					const x = sin * (width + wrinkle);
					let z = center + cos * (depth + wrinkle);
					let shade = 1 - Math.abs(wrinkle) * 9;
					let damage = 0;
					if (face && cos > 0) {
						// Flatten the facial plane, then carve sockets, temples, cheeks and the open mouth.
						z = center + Math.pow(cos, 0.38) * depth;
						const sockets = hollow(Math.abs(x), y, 0.052, 0.042, 0.041, 0.032);
						const cheeks = hollow(Math.abs(x), y, 0.083, -0.055, 0.034, 0.05);
						const mouth = hollow(x, y, 0.005, -0.091, 0.069, 0.049);
						const brow = hollow(Math.abs(x), y, 0.053, 0.083, 0.046, 0.023);
						const nose = hollow(x, y, 0, 0.013, 0.02, 0.066);
						const cheekbone = hollow(Math.abs(x), y, 0.088, -0.012, 0.034, 0.019);
						const muzzle = hollow(Math.abs(x), y, 0.027, -0.05, 0.023, 0.023);
						z +=
							-sockets * 0.039 -
							cheeks * 0.034 -
							mouth * 0.052 +
							brow * 0.019 +
							nose * 0.052 +
							cheekbone * 0.014 +
							muzzle * 0.011;
						shade -= sockets * 0.4 + cheeks * 0.21 + mouth * 0.6;
						damage = hollow(x, y, variant === 2 ? -0.09 : 0.092, -0.042, 0.035, 0.065);
					}
					const hem = ragged * Math.exp(-row * 1.4) * (0.4 + 0.6 * Math.sin(angle * 9 + variant));
					positions.push(x, y + hem, z);
					uvs.push(column / segments, face ? (y + 0.18) / 0.396 : row / rows);
					colors.push(
						shade * (1 - damage * 0.26),
						shade * (1 - damage * 0.62),
						shade * (1 - damage * 0.58),
						1
					);
				}
			}
			for (let row = 0; row < rows; row++) {
				for (let column = 0; column < segments; column++) {
					const a = row * (segments + 1) + column;
					const b = a + segments + 1;
					const x = (positions[a * 3] + positions[(b + 1) * 3]) / 2;
					const y = (positions[a * 3 + 1] + positions[(b + 1) * 3 + 1]) / 2;
					const z = positions[a * 3 + 2];
					if (tear && z > 0 && ((x - 0.125) / 0.078) ** 2 + ((y - 0.14) / 0.105) ** 2 < 1) continue;
					indices.push(a, b, a + 1, a + 1, b, b + 1);
				}
			}
			// Close each end without duplicating a coplanar disk inside every limb.
			for (const row of [0, rows]) {
				const start = row * (segments + 1);
				const center = positions.length / 3;
				const section = sections[row === 0 ? 0 : sections.length - 1];
				positions.push(0, section[0], section[3]);
				uvs.push(0.5, row / rows);
				colors.push(1, 1, 1, 1);
				for (let column = 0; column < segments; column++) {
					if (row === 0) indices.push(center, start + column, start + column + 1);
					else indices.push(center, start + column + 1, start + column);
				}
			}
			const normals: number[] = [];
			VertexData.ComputeNormals(positions, indices, normals);
			// The UV seam has two vertices at the same position; share their smooth normal.
			for (let row = 0; row <= rows; row++) {
				const first = row * (segments + 1) * 3;
				const last = first + segments * 3;
				for (let axis = 0; axis < 3; axis++) {
					const average = (normals[first + axis] + normals[last + axis]) / 2;
					normals[first + axis] = normals[last + axis] = average;
				}
			}
			const data = new VertexData();
			data.positions = positions;
			data.indices = indices;
			data.normals = normals;
			data.uvs = uvs;
			data.colors = colors;
			const mesh = new Mesh(`${name}-${id}`, this.scene);
			data.applyToMesh(mesh);
			return finish(mesh, parent, material, headshot);
		};

		const hips = pivot('pelvis-joint', root, 0, 0.83);
		surface(
			'pelvis',
			hips,
			[
				[-0.13, 0.17, 0.11, 0],
				[-0.07, 0.22, 0.135, 0],
				[0.04, 0.215, 0.14, 0],
				[0.14, 0.18, 0.115, 0]
			],
			cloth,
			{ folds: 0.006 }
		);
		const torso = pivot('spine', hips, 0, 0.24);
		surface(
			'torn-work-shirt',
			torso,
			[
				[-0.22, 0.185, 0.12, 0],
				[-0.14, 0.2, 0.135, 0],
				[-0.05, 0.19, 0.12, -0.007],
				[0.05, 0.21, 0.135, -0.008],
				[0.16, 0.245, 0.151, -0.014],
				[0.26, 0.255, 0.15, -0.021],
				[0.34, 0.24, 0.135, -0.03],
				[0.39, 0.18, 0.107, -0.026],
				[0.44, 0.085, 0.075, -0.012]
			],
			shirt,
			{ segments: 32, folds: 0.007, ragged: 0.024, tear: true }
		);
		oval('exposed-ribcage', torso, 0.19, 0.27, 0.085, 0.115, 0.14, 0.074, wound);
		for (let rib = 0; rib < 4; rib++) {
			cord(
				'rib',
				torso,
				[
					[0.073, 0.07 + rib * 0.043, 0.112],
					[0.125, 0.08 + rib * 0.043, 0.121],
					[0.166, 0.1 + rib * 0.038, 0.105]
				],
				0.007,
				bone
			);
		}
		cord(
			'shirt-placket',
			torso,
			[
				[-0.012, -0.19, 0.131],
				[-0.008, 0.02, 0.137],
				[-0.005, 0.22, 0.14],
				[0, 0.35, 0.109]
			],
			0.007,
			seam
		);
		for (let button = 0; button < 4; button++)
			oval('shirt-button', torso, 0.014, 0.014, 0.008, -0.012, -0.1 + button * 0.115, 0.143, boot);
		patch('breast-pocket', torso, 0.112, 0.102, 0.014, -0.133, 0.238, 0.122, shirt).rotation.z =
			-0.06;
		cord(
			'pocket-stitch',
			torso,
			[
				[-0.183, 0.276, 0.134],
				[-0.13, 0.268, 0.144],
				[-0.081, 0.275, 0.141]
			],
			0.003,
			seam
		);
		for (const side of [-1, 1]) {
			const lapel = patch(
				'folded-collar',
				torso,
				0.07,
				0.14,
				0.018,
				side * 0.083,
				0.353,
				0.091,
				seam
			);
			lapel.rotation.set(-0.24, side * 0.3, side * -0.42);
		}
		surface(
			'neck',
			torso,
			[
				[0.39, 0.075, 0.064, 0],
				[0.46, 0.064, 0.06, 0.016],
				[0.56, 0.069, 0.071, 0.021],
				[0.6, 0.077, 0.076, 0.019]
			],
			skin
		);
		for (const side of [-1, 1])
			cord(
				'neck-tendon',
				torso,
				[
					[side * 0.058, 0.43, 0.047],
					[side * 0.035, 0.49, 0.071],
					[side * 0.044, 0.56, 0.071]
				],
				0.007,
				skin
			);
		const head = pivot('head-joint', torso, 0, 0.58, 0.025);
		surface(
			'sculpted-head',
			head,
			[
				[-0.18, 0.038, 0.045, 0.037],
				[-0.155, 0.071, 0.074, 0.025],
				[-0.13, 0.087, 0.085, 0.015],
				[-0.092, 0.099, 0.096, 0.006],
				[-0.052, 0.106, 0.108, 0],
				[-0.013, 0.122, 0.121, -0.007],
				[0.027, 0.127, 0.128, -0.01],
				[0.065, 0.122, 0.127, -0.012],
				[0.105, 0.124, 0.12, -0.016],
				[0.148, 0.114, 0.109, -0.021],
				[0.184, 0.086, 0.084, -0.021],
				[0.207, 0.045, 0.047, -0.019],
				[0.216, 0.008, 0.01, -0.018]
			],
			faceSkin,
			{ segments: 64, face: true, headshot: true }
		);
		oval('open-mouth', head, 0.113, 0.077, 0.021, 0.004, -0.091, 0.073, shadow, true).rotation.z =
			0.08;
		cord(
			'upper-gum',
			head,
			[
				[-0.047, -0.067, 0.087],
				[-0.027, -0.052, 0.099],
				[0.005, -0.05, 0.103],
				[0.035, -0.055, 0.099],
				[0.051, -0.071, 0.086]
			],
			0.006,
			wound,
			true
		);
		for (const side of [-1, 1]) {
			oval('sunken-eye', head, 0.044, 0.024, 0.018, side * 0.052, 0.044, 0.095, shadow, true);
			oval('amber-iris', head, 0.015, 0.012, 0.009, side * 0.052, 0.044, 0.106, eye, true);
			oval('nostril', head, 0.013, 0.01, 0.009, side * 0.014, -0.018, 0.142, shadow, true);
			oval('ear', head, 0.035, 0.084, 0.043, side * 0.13, 0.01, -0.012, skin, true).rotation.z =
				side * -0.12;
			oval('ear-concha', head, 0.016, 0.047, 0.013, side * 0.139, 0.012, 0.005, wound, true);
		}
		for (let tooth = 0; tooth < 7; tooth++) {
			if (tooth === variant + 1) continue;
			oval(
				'upper-tooth',
				head,
				0.01,
				0.017 + (tooth % 2) * 0.003,
				0.009,
				-0.033 + tooth * 0.012,
				-0.061 - Math.abs(tooth - 3) * 0.002,
				0.096,
				bone,
				true,
				2
			).rotation.z = (tooth - 3) * 0.07;
			if (tooth % 2 === 0)
				oval(
					'lower-tooth',
					head,
					0.01,
					0.012,
					0.009,
					-0.03 + tooth * 0.011,
					-0.119,
					0.09,
					bone,
					true,
					2
				);
		}
		if (variant === 1) {
			oval('work-cap', head, 0.267, 0.096, 0.267, 0, 0.167, -0.027, cloth, true);
			oval('cap-brim', head, 0.229, 0.012, 0.16, 0, 0.147, 0.105, boot, true).rotation.x = -0.1;
		}

		const legs: Mesh[] = [];
		const knees: Mesh[] = [];
		const arms: Mesh[] = [];
		const elbows: Mesh[] = [];
		for (const side of [-1, 1]) {
			const leg = pivot('hip-joint', hips, side * 0.13, -0.025);
			surface(
				'trouser-thigh',
				leg,
				[
					[-0.39, 0.073, 0.077, 0.006],
					[-0.32, 0.085, 0.087, 0],
					[-0.2, 0.108, 0.107, -0.006],
					[-0.07, 0.118, 0.123, -0.012],
					[0.045, 0.106, 0.12, -0.007]
				],
				cloth,
				{ folds: 0.005 }
			);
			const knee = pivot('knee-joint', leg, 0, -0.36);
			surface(
				'trouser-calf',
				knee,
				[
					[-0.35, 0.064, 0.064, -0.008],
					[-0.28, 0.072, 0.08, -0.009],
					[-0.19, 0.077, 0.09, -0.018],
					[-0.09, 0.082, 0.091, -0.006],
					[0, 0.08, 0.081, 0.012],
					[0.045, 0.074, 0.075, 0.006]
				],
				cloth,
				{ folds: 0.007, ragged: 0.012 }
			);
			if (side === (variant === 0 ? -1 : 1)) {
				oval('knee-tear', knee, 0.088, 0.115, 0.015, 0.012, -0.007, 0.094, wound);
				oval('exposed-kneecap', knee, 0.044, 0.056, 0.016, 0.01, 0.004, 0.103, skin);
			}
			surface(
				'boot-upper',
				knee,
				[
					[-0.415, 0.086, 0.13, 0.035],
					[-0.39, 0.09, 0.146, 0.043],
					[-0.35, 0.086, 0.126, 0.026],
					[-0.3, 0.072, 0.077, -0.006],
					[-0.25, 0.065, 0.065, -0.011]
				],
				boot
			);
			surface(
				'boot-sole',
				knee,
				[
					[-0.438, 0.087, 0.142, 0.037],
					[-0.411, 0.09, 0.146, 0.037]
				],
				shadow
			);
			for (let lace = 0; lace < 3; lace++)
				cord(
					'boot-lace',
					knee,
					[
						[-0.036, -0.3 - lace * 0.023, 0.066 + lace * 0.02],
						[0.035, -0.31 - lace * 0.023, 0.071 + lace * 0.02]
					],
					0.0025,
					seam
				);
			legs.push(leg);
			knees.push(knee);

			const arm = pivot('shoulder-joint', torso, side * 0.25, 0.31);
			surface(
				'ragged-sleeve',
				arm,
				[
					[-0.315, 0.063, 0.065, 0],
					[-0.26, 0.079, 0.078, 0],
					[-0.17, 0.089, 0.087, -0.006],
					[-0.06, 0.104, 0.099, -0.01],
					[0.022, 0.089, 0.091, -0.015],
					[0.055, 0.04, 0.051, -0.016]
				],
				shirt,
				{ folds: 0.005, ragged: side < 0 ? 0.036 : 0.02 }
			);
			const elbow = pivot('elbow-joint', arm, 0, -0.33);
			surface(
				'forearm',
				elbow,
				[
					[-0.29, 0.039, 0.03, 0.007],
					[-0.245, 0.042, 0.036, 0],
					[-0.17, 0.054, 0.046, -0.007],
					[-0.09, 0.068, 0.059, -0.01],
					[-0.015, 0.064, 0.06, 0],
					[0.047, 0.054, 0.051, 0]
				],
				skin
			);
			oval(
				'forearm-lesion',
				elbow,
				0.045,
				0.095,
				0.012,
				side * 0.027,
				-0.116,
				0.042,
				wound
			).rotation.z = side * 0.23;
			for (let tendon = 0; tendon < 3; tendon++)
				cord(
					'hand-tendon',
					elbow,
					[
						[(tendon - 1) * 0.012, -0.17, 0.038],
						[(tendon - 1) * 0.01, -0.275, 0.034],
						[(tendon - 1) * 0.023, -0.343, 0.047]
					],
					0.003,
					skin
				);
			surface(
				'palm',
				elbow,
				[
					[-0.363, 0.041, 0.018, 0.032],
					[-0.337, 0.049, 0.026, 0.026],
					[-0.296, 0.043, 0.024, 0.014],
					[-0.266, 0.034, 0.028, 0.005]
				],
				skin,
				{ segments: 16 }
			);
			for (let finger = 0; finger < 4; finger++) {
				const x = (finger - 1.5) * 0.025;
				const length = [0.08, 0.098, 0.09, 0.067][finger];
				const tip = -0.354 - length;
				const digit = surface(
					'finger',
					elbow,
					[
						[tip + 0.35, 0.007, 0.007, 0.046],
						[tip + 0.363, 0.009, 0.01, 0.044],
						[-0.03, 0.011, 0.011, 0.017],
						[0, 0.012, 0.012, 0]
					],
					skin,
					{ segments: 8 }
				);
				digit.position.set(x, -0.35, 0.029);
				digit.rotation.z = (finger - 1.5) * -0.075;
				oval('knuckle', elbow, 0.025, 0.029, 0.02, x, -0.35, 0.046, skin);
			}
			cord(
				'thumb',
				elbow,
				[
					[-side * 0.035, -0.294, 0.012],
					[-side * 0.065, -0.325, 0.028],
					[-side * 0.07, -0.36, 0.055],
					[-side * 0.057, -0.379, 0.065]
				],
				0.014,
				skin
			);
			arms.push(arm);
			elbows.push(elbow);
		}

		// Rigid detail shares one draw per joint/material/hit region; animated pivots stay independent.
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
		this.palette.dispose();
	}
}
