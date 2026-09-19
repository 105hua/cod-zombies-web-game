import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import type { Scene } from '@babylonjs/core/scene';
import type { Obstacle, Station, StationId } from '../types';
import { createDepotMaterials, seededRandom } from './Materials';

export interface World {
	obstacles: Obstacle[];
	stations: Station[];
	spawns: { x: number; z: number }[];
	openGate: () => void;
	update: (dt: number, time: number) => void;
	react: (id: StationId) => void;
}

export function createWorld(scene: Scene): World {
	const obstacles: Obstacle[] = [];
	const stations: Station[] = [
		{ id: 'rifle', x: -17, z: -13, label: 'AR-4 / 1,000' },
		{ id: 'shotgun', x: 17, z: -13, label: 'TRENCH-12 / 1,250' },
		{ id: 'box', x: 14, z: -1, label: 'RANDOM ISSUE / 950' },
		{ id: 'gate', x: 0, z: 4, label: 'OPEN NORTH YARD / 750' },
		{ id: 'vitality', x: -15, z: 16, label: 'VITALITY / 2,000' },
		{ id: 'upgrade', x: 15, z: 16, label: 'OVERCHARGE / 3,000' }
	];

	const {
		material,
		concrete,
		darkConcrete,
		olive,
		metal,
		railMetal,
		rust,
		wood,
		black,
		amber,
		red,
		cream,
		fadedPaint,
		window,
		asphalt
	} = createDepotMaterials(scene);
	const random = seededRandom(7114);
	const decorations: Mesh[] = [];
	const response: Record<StationId, number> = {
		rifle: 0,
		shotgun: 0,
		box: 0,
		gate: 0,
		vitality: 0,
		upgrade: 0
	};
	let gateOpened = false;
	let gateRetraction = 0;

	const box = (
		name: string,
		x: number,
		y: number,
		z: number,
		width: number,
		height: number,
		depth: number,
		mat: StandardMaterial,
		collidable = false,
		gate = false
	) => {
		const face = (u: number, v: number) => new Vector4(0, 0, u / 2.5, v / 2.5);
		const mesh = MeshBuilder.CreateBox(
			name,
			{
				width,
				height,
				depth,
				faceUV: mat.diffuseTexture
					? [
							face(width, height),
							face(width, height),
							face(depth, height),
							face(depth, height),
							face(width, depth),
							face(width, depth)
						]
					: undefined
			},
			scene
		);
		mesh.position.set(x, y, z);
		mesh.material = mat;
		mesh.isPickable = collidable;
		mesh.receiveShadows = true;
		if (collidable) mesh.metadata = { depotShadow: true };
		else decorations.push(mesh);
		if (collidable) {
			const obstacle: Obstacle = {
				minX: x - width / 2,
				maxX: x + width / 2,
				minZ: z - depth / 2,
				maxZ: z + depth / 2
			};
			if (gate) obstacle.gate = true;
			obstacles.push(obstacle);
		}
		return mesh;
	};
	const cylinder = (
		name: string,
		x: number,
		y: number,
		z: number,
		height: number,
		diameter: number,
		mat: StandardMaterial
	) => {
		const mesh = MeshBuilder.CreateCylinder(name, { height, diameter, tessellation: 12 }, scene);
		mesh.position.set(x, y, z);
		mesh.material = mat;
		mesh.isPickable = false;
		mesh.receiveShadows = true;
		decorations.push(mesh);
		return mesh;
	};
	const sign = (
		name: string,
		title: string,
		subtitle: string,
		x: number,
		y: number,
		z: number,
		width: number,
		height: number,
		rotation = 0,
		accent = '#e9b477',
		background = '#293b36'
	) => {
		const texture = new DynamicTexture(
			`${name}-lettering`,
			{ width: 1024, height: 256 },
			scene,
			false
		);
		const ctx = texture.getContext() as CanvasRenderingContext2D;
		ctx.fillStyle = background;
		ctx.fillRect(0, 0, 1024, 256);
		ctx.strokeStyle = accent;
		ctx.lineWidth = 5;
		ctx.strokeRect(13, 13, 998, 230);
		ctx.fillStyle = accent;
		ctx.font = 'bold 55px monospace';
		ctx.textAlign = 'center';
		ctx.fillText(title, 512, 110, 940);
		ctx.font = '25px monospace';
		ctx.fillText(subtitle, 512, 177, 930);
		ctx.fillRect(40, 211, 42, 5);
		ctx.fillRect(942, 211, 42, 5);
		texture.update();
		const mat = material(`${name}-enamel`, '#ffffff');
		mat.diffuseTexture = texture;
		mat.emissiveTexture = texture;
		mat.emissiveColor = new Color3(0.45, 0.45, 0.45);
		mat.backFaceCulling = false;
		const mesh = MeshBuilder.CreatePlane(name, { width, height }, scene);
		mesh.position.set(x, y, z);
		mesh.rotation.y = rotation;
		mesh.material = mat;
		mesh.isPickable = false;
		return mesh;
	};
	const decal = (
		name: string,
		x: number,
		y: number,
		z: number,
		width: number,
		height: number,
		mat: StandardMaterial,
		rotationY = 0,
		floor = false
	) => {
		const mesh = MeshBuilder.CreatePlane(name, { width, height }, scene);
		mesh.position.set(x, y, z);
		mesh.rotation.set(floor ? Math.PI / 2 : 0, rotationY, 0);
		mesh.material = mat;
		mesh.isPickable = false;
		mesh.receiveShadows = true;
		decorations.push(mesh);
		return mesh;
	};

	const grimeTexture = new DynamicTexture('depot-runoff-and-spalled-paint', 256, scene, true);
	const grimeContext = grimeTexture.getContext() as CanvasRenderingContext2D;
	grimeContext.clearRect(0, 0, 256, 256);
	for (let i = 0; i < 75; i++) {
		const x = random() * 256;
		const length = 25 + random() * 170;
		const streak = grimeContext.createLinearGradient(x, 0, x, length);
		streak.addColorStop(0, 'rgba(30,34,23,0.38)');
		streak.addColorStop(1, 'rgba(30,34,23,0)');
		grimeContext.fillStyle = streak;
		grimeContext.fillRect(x, 0, 0.5 + random() * 5, length);
	}
	for (let i = 0; i < 60; i++) {
		grimeContext.fillStyle = i % 3 ? 'rgba(168,167,137,0.48)' : 'rgba(24,35,28,0.4)';
		grimeContext.fillRect(random() * 256, 225 + random() * 31, 2 + random() * 10, random() * 6);
	}
	grimeTexture.hasAlpha = true;
	grimeTexture.update();
	const grime = material('depot-concrete-runoff', '#ffffff');
	grime.diffuseTexture = grimeTexture;
	grime.useAlphaFromDiffuseTexture = true;
	grime.specularColor.set(0, 0, 0);
	const stainTexture = new DynamicTexture('depot-irregular-oil-and-water', 256, scene, true);
	const stainContext = stainTexture.getContext() as CanvasRenderingContext2D;
	stainContext.clearRect(0, 0, 256, 256);
	for (let i = 0; i < 36; i++) {
		const x = 70 + random() * 116;
		const y = 80 + random() * 96;
		const radius = 18 + random() * 38;
		const stain = stainContext.createRadialGradient(x, y, radius * 0.4, x, y, radius);
		stain.addColorStop(0, 'rgba(111,127,119,0.62)');
		stain.addColorStop(1, 'rgba(111,127,119,0)');
		stainContext.fillStyle = stain;
		stainContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
	}
	stainTexture.hasAlpha = true;
	stainTexture.update();
	const oil = material('depot-soaked-asphalt', '#354236');
	oil.diffuseTexture = stainTexture;
	oil.useAlphaFromDiffuseTexture = true;
	oil.specularColor.set(0.03, 0.04, 0.03);
	const water = material('depot-shallow-standing-water', '#627779');
	water.diffuseTexture = stainTexture;
	water.useAlphaFromDiffuseTexture = true;
	water.specularColor.set(0.7, 0.73, 0.7);
	water.specularPower = 100;
	water.emissiveColor.set(0.022, 0.034, 0.039);
	for (const [x, z, width, depth] of [
		[-18.9, -6.8, 3.2, 6],
		[19.1, 8.5, 3.1, 7],
		[-12.8, 20, 5, 2.3],
		[7.6, -14, 3.5, 2.6],
		[-5.4, -8, 4, 2.4],
		[1.3, 15, 3, 5]
	]) {
		decal(`yard-stain-${x}`, x, 0.028, z, width, depth, oil, 0, true);
		if (Math.abs(x) > 12)
			decal(`yard-puddle-${x}`, x + 0.15, 0.031, z, width * 0.83, depth * 0.79, water, 0, true);
	}
	const groundCracks: Vector3[][] = [];
	for (let i = 0; i < 24; i++) {
		let x = random() * 40 - 20;
		let z = random() * 40 - 20;
		const path = [new Vector3(x, 0.025, z)];
		for (let segment = 0; segment < 6; segment++) {
			x += random() * 0.6 - 0.3;
			z += 0.2 + random() * 0.45;
			path.push(new Vector3(x, 0.025, Math.min(21.3, z)));
		}
		groundCracks.push(path);
	}
	const cracks = MeshBuilder.CreateLineSystem(
		'asphalt-settlement-cracks',
		{ lines: groundCracks },
		scene
	);
	cracks.color = Color3.FromHexString('#18221e');
	cracks.isPickable = false;

	const ground = MeshBuilder.CreateGround(
		'blackwater-depot-yard',
		{ width: 44, height: 44 },
		scene
	);
	ground.material = asphalt;
	ground.isPickable = true;
	ground.receiveShadows = true;
	const surroundings = MeshBuilder.CreateGround(
		'outside-depot-wasteground',
		{ width: 180, height: 180 },
		scene
	);
	surroundings.position.y = -0.05;
	surroundings.material = darkConcrete;
	surroundings.isPickable = false;
	surroundings.receiveShadows = true;

	box('west-perimeter-wall', -22, 1.6, 0, 0.8, 3.2, 44.8, concrete, true);
	box('east-perimeter-wall', 22, 1.6, 0, 0.8, 3.2, 44.8, concrete, true);
	box('south-perimeter-wall', 0, 1.6, -22, 44, 3.2, 0.8, concrete, true);
	box('north-perimeter-wall', 0, 1.6, 22, 44, 3.2, 0.8, concrete, true);
	for (const x of [-22, 22]) {
		box(`perimeter-cap-${x}`, x, 3.23, 0, 0.8, 0.12, 44.8, metal);
		for (let z = -20; z <= 20; z += 5) {
			box(`perimeter-pilaster-${x}-${z}`, x, 1.65, z, 0.8, 3.3, 0.5, darkConcrete);
		}
	}
	for (const z of [-22, 22]) {
		box(`perimeter-cap-${z}-cross`, 0, 3.23, z, 44, 0.12, 0.8, metal);
	}
	for (const side of [-1, 1]) {
		for (let z = -20; z <= 20; z += 5) {
			decal(
				`wall-runoff-${side}-${z}`,
				side * 21.588,
				1.65,
				z,
				4.8,
				3,
				grime,
				(side * Math.PI) / 2
			);
			box(
				`wall-expansion-joint-${side}-${z}`,
				side * 21.585,
				1.6,
				z + 2.35,
				0.008,
				3.02,
				0.023,
				black
			);
			for (const y of [0.8, 2.35]) {
				for (const offset of [-1.65, 1.65]) {
					const tie = cylinder(
						`concrete-form-tie-${side}-${z}-${y}-${offset}`,
						side * 21.58,
						y,
						z + offset,
						0.012,
						0.055,
						black
					);
					tie.rotation.z = Math.PI / 2;
				}
			}
		}
		for (let x = -20; x <= 20; x += 5) {
			decal(
				`end-wall-runoff-${side}-${x}`,
				x,
				1.6,
				side * 21.588,
				4.8,
				3,
				grime,
				side < 0 ? Math.PI : 0
			);
			box(`end-wall-seam-${side}-${x}`, x + 2.35, 1.6, side * 21.585, 0.023, 3.02, 0.008, black);
		}
	}

	box('north-yard-divider-west', -12.5, 1.55, 5, 19, 3.1, 0.6, concrete, true);
	box('north-yard-divider-east', 12.5, 1.55, 5, 19, 3.1, 0.6, concrete, true);
	for (const x of [-12.5, 12.5]) {
		box(`divider-rust-cap-${x}`, x, 3.13, 5, 19, 0.16, 0.6, rust);
		for (let offset = -8; offset <= 8; offset += 4) {
			box(`divider-recess-${x}-${offset}`, x + offset, 1.45, 4.69, 2.8, 1.8, 0.015, darkConcrete);
			decal(`divider-runoff-${x}-${offset}`, x + offset, 1.55, 4.678, 3.8, 3, grime);
			decal(`divider-back-runoff-${x}-${offset}`, x + offset, 1.55, 5.312, 3.8, 3, grime, Math.PI);
		}
	}
	const gateRoot = new TransformNode('north-yard-locked-gate', scene);
	const gate = box('north-yard-solid-gate', 0, 1.55, 5, 6, 3.1, 0.6, olive, true, true);
	gate.parent = gateRoot;
	for (let x = -2.8; x <= 2.8; x += 0.4) {
		const rib = box(`gate-steel-rib-${x.toFixed(1)}`, x, 1.55, 4.68, 0.065, 3.05, 0.035, railMetal);
		rib.parent = gateRoot;
	}
	for (const x of [-3.2, 3.2]) {
		box(`gate-jamb-${x}`, x, 1.9, 5, 0.4, 3.8, 0.6, metal);
		box(`gate-beacon-${x}`, x, 3.9, 5, 0.22, 0.18, 0.25, red);
	}
	box('gate-overhead-track', 0, 3.7, 5, 6.8, 0.22, 0.6, metal);
	const gateSign = sign(
		'north-yard-release-sign',
		'OPEN NORTH YARD / 750',
		'FREIGHT ACCESS  //  RELEASE LOCK',
		0,
		2.05,
		4.64,
		4.8,
		1.15,
		0,
		'#efbc79',
		'#703c2e'
	);
	gateSign.parent = gateRoot;
	sign(
		'north-yard-wayfinding',
		'NORTH FREIGHT YARD',
		'02  /  MEDICAL + ARMATURE WORKS',
		0,
		4.65,
		5,
		6.6,
		1.15
	);

	// Flush railheads and sleepers are floor decoration, not ankle-height collision clutter.
	for (const x of [-2.25, 2.25]) {
		box(`rail-track-${x}`, x, 0.013, 0, 0.11, 0.026, 43.2, railMetal);
		box(`rail-bed-${x}`, x, 0.005, 0, 0.21, 0.009, 43.2, rust);
		for (let z = -18; z < 22; z += 6) {
			box(`rail-joint-${x}-${z}`, x, 0.03, z, 0.115, 0.008, 0.035, black);
			box(`rail-fishplate-${x}-${z}`, x + 0.08, 0.026, z, 0.035, 0.018, 0.36, metal);
		}
	}
	for (let z = -21; z < 22; z += 1.25) {
		box(`rail-sleeper-${z}`, 0, 0.007, z, 5.3, 0.014, 0.22, wood);
		for (const x of [-2.25, 2.25]) {
			box(`rail-chair-${x}-${z}`, x, 0.017, z, 0.34, 0.014, 0.2, rust);
			for (const side of [-1, 1])
				cylinder(
					`rail-spike-${x}-${z}-${side}`,
					x + side * 0.115,
					0.033,
					z,
					0.02,
					0.045,
					railMetal
				);
		}
	}
	for (const x of [-11.5, 11.5]) {
		for (let z = -20; z < 20; z += 3.3) {
			box(`faded-lane-marker-${x}-${z}`, x, 0.017, z, 0.12, 0.014, 1.7, fadedPaint);
		}
	}
	for (let x = -2.7; x <= 2.7; x += 0.6) {
		const stripe = box(`gate-floor-warning-${x}`, x, 0.019, 3.8, 0.25, 0.015, 1.15, fadedPaint);
		stripe.rotation.y = -0.4;
	}

	const freightStack = (
		name: string,
		x: number,
		z: number,
		width: number,
		depth: number,
		height: number
	) => {
		const load = box(`${name}-solid-stack`, x, height / 2, z, width, height, depth, wood, true);
		load.scaling.y = (height - 0.27) / height;
		load.position.y = (height + 0.27) / 2;
		for (const offset of [-0.37, 0, 0.37]) {
			box(`${name}-pallet-runner-${offset}`, x + width * offset, 0.07, z, 0.18, 0.14, depth, wood);
		}
		const boardCount = Math.ceil(depth / 0.29);
		for (let i = 0; i < boardCount; i++) {
			const boardZ = z - depth / 2 + ((i + 0.5) * depth) / boardCount;
			box(
				`${name}-pallet-board-${i}`,
				x,
				0.2,
				boardZ,
				width,
				0.07,
				depth / boardCount - 0.025,
				wood
			);
			box(
				`${name}-top-board-${i}`,
				x,
				height + 0.008,
				boardZ,
				width,
				0.014,
				depth / boardCount - 0.018,
				wood
			);
		}
		for (let y = 0.35; y < height; y += 0.28) {
			for (const side of [-1, 1]) {
				box(
					`${name}-end-plank-joint-${side}-${y}`,
					x,
					y,
					z + side * (depth / 2 + 0.002),
					width - 0.05,
					0.014,
					0.005,
					black
				);
				box(
					`${name}-side-plank-joint-${side}-${y}`,
					x + side * (width / 2 + 0.002),
					y,
					z,
					0.005,
					0.014,
					depth - 0.05,
					black
				);
			}
		}
		for (const fraction of [-0.3, 0.3]) {
			box(
				`${name}-strap-${fraction}`,
				x + fraction * width,
				height + 0.012,
				z,
				0.09,
				0.025,
				depth,
				metal
			);
			for (const side of [-1, 1]) {
				box(
					`${name}-vertical-strap-${fraction}-${side}`,
					x + fraction * width,
					height / 2,
					z + side * (depth / 2 + 0.006),
					0.09,
					height,
					0.015,
					metal
				);
				box(
					`${name}-strap-buckle-${fraction}-${side}`,
					x + fraction * width,
					height * 0.73,
					z + side * (depth / 2 + 0.018),
					0.14,
					0.09,
					0.02,
					railMetal
				);
			}
		}
		sign(
			`${name}-manifest`,
			'BW / FREIGHT',
			'KEEP DRY   |   LOT 071',
			x,
			height * 0.58,
			z - depth / 2 - 0.006,
			Math.min(width - 0.3, 2),
			0.48
		);
	};
	freightStack('south-yard-timber-load', -7.5, -5.5, 4, 3.4, 1.8);
	freightStack('south-yard-tool-freight', 8, -10, 3.4, 3.6, 1.45);
	freightStack('north-yard-salvage-load', -6.8, 13, 3.4, 3.6, 1.9);
	freightStack('north-yard-cable-freight', 6.8, 12, 3.2, 3, 1.4);

	const armoryIndicators: { id: StationId; material: StandardMaterial }[] = [];
	// Wall-armory plaques sit in shallow solid housings, leaving both side lanes open.
	for (const station of stations.filter(
		(entry) => entry.id === 'rifle' || entry.id === 'shotgun'
	)) {
		const side = station.x < 0 ? -1 : 1;
		const x = side * 18.7;
		box(`${station.id}-armory-housing`, x, 1.5, -13, 0.8, 3, 3.8, darkConcrete, true);
		box(`${station.id}-armory-inset`, x - side * 0.405, 1.72, -13, 0.018, 1.32, 3.35, black);
		const indicator = material(
			`${station.id}-armory-status`,
			station.id === 'rifle' ? '#7bd9d1' : '#ffc478',
			0.7
		);
		armoryIndicators.push({ id: station.id, material: indicator });
		box(`${station.id}-armory-light`, x - side * 0.43, 2.48, -13, 0.04, 0.08, 3.3, indicator);
		sign(
			`${station.id}-price-sign`,
			station.label,
			'WALL ARMORY  //  STANDARD ISSUE',
			x - side * 0.435,
			0.8,
			-13,
			3.2,
			0.7,
			(side * Math.PI) / 2
		);
		const faceX = x - side * 0.47;
		const rifle = station.id === 'rifle';
		box(
			`${station.id}-display-receiver`,
			faceX,
			1.9,
			-13,
			0.11,
			rifle ? 0.19 : 0.14,
			0.53,
			railMetal
		);
		box(`${station.id}-display-stock`, faceX, 1.85, -12.21, 0.1, 0.22, 0.68, rifle ? olive : wood);
		box(`${station.id}-display-stock-neck`, faceX, 1.89, -12.63, 0.085, 0.12, 0.22, wood);
		const barrel = cylinder(
			`${station.id}-display-barrel`,
			faceX,
			1.94,
			-13.85,
			rifle ? 0.86 : 1.07,
			0.07,
			railMetal
		);
		barrel.rotation.x = Math.PI / 2;
		box(
			`${station.id}-display-fore-end`,
			faceX,
			1.88,
			-13.5,
			0.13,
			0.15,
			rifle ? 0.45 : 0.36,
			rifle ? olive : wood
		);
		if (rifle) {
			const magazine = box('rifle-display-magazine', faceX, 1.64, -13.1, 0.085, 0.32, 0.19, metal);
			magazine.rotation.x = -0.17;
			const grip = box('rifle-display-pistol-grip', faceX, 1.66, -12.72, 0.085, 0.29, 0.13, olive);
			grip.rotation.x = 0.3;
			box('rifle-display-carry-handle', faceX, 2.055, -12.99, 0.05, 0.075, 0.37, black);
		} else {
			const magazineTube = cylinder(
				'shotgun-display-tube-magazine',
				faceX,
				1.835,
				-13.63,
				0.96,
				0.065,
				metal
			);
			magazineTube.rotation.x = Math.PI / 2;
			for (let z = -13.62; z < -13.32; z += 0.055)
				box(`shotgun-pump-groove-${z}`, faceX - side * 0.069, 1.88, z, 0.006, 0.145, 0.014, metal);
		}
		for (const z of [-14.5, -11.5]) {
			for (const y of [1.21, 2.25]) {
				const bolt = cylinder(
					`${station.id}-housing-bolt-${z}-${y}`,
					faceX,
					y,
					z,
					0.024,
					0.057,
					railMetal
				);
				bolt.rotation.z = Math.PI / 2;
			}
		}
	}

	box('random-issue-crate-solid', 14, 0.65, 0.2, 3.3, 1.3, 1.6, olive, true);
	const issueLid = new TransformNode('random-issue-hinged-lid', scene);
	issueLid.position.set(14, 1.32, 1);
	box('random-issue-crate-lid', 14, 1.32, 0.2, 3.3, 0.1, 1.6, metal).setParent(issueLid);
	box('random-issue-crate-insert', 14, 1.305, 0.2, 3.04, 0.008, 1.34, black);
	for (const x of [12.85, 15.15]) {
		const hinge = cylinder(`random-issue-lid-hinge-${x}`, x, 1.32, 1, 0.32, 0.09, railMetal);
		hinge.rotation.z = Math.PI / 2;
		box(`random-issue-front-latch-${x}`, x, 1.12, -0.628, 0.15, 0.21, 0.045, metal);
		box(`random-issue-handle-${x}`, x, 0.84, -0.65, 0.25, 0.045, 0.075, railMetal);
	}
	box('random-issue-crate-seam', 14, 1.27, -0.608, 3.05, 0.07, 0.015, amber);
	for (const x of [12.8, 15.2]) {
		box(`random-issue-crate-binding-${x}`, x, 0.67, -0.609, 0.13, 1.27, 0.016, railMetal);
	}
	sign(
		'random-issue-price',
		'RANDOM ISSUE / 950',
		'UNCLAIMED ORDNANCE  //  NO RETURNS',
		14,
		0.69,
		-0.62,
		2.6,
		0.66
	);
	const issueMark = sign(
		'random-issue-lid-mark',
		'?  /  ?',
		'BLACKWATER SUPPLY',
		14,
		1.38,
		0.2,
		2.25,
		0.9,
		0,
		'#f4c881'
	);
	issueMark.rotation.x = Math.PI / 2;
	issueMark.setParent(issueLid);

	box('vitality-machine-solid', -15, 1.45, 17.3, 1.8, 2.9, 1.3, rust, true);
	box('vitality-machine-cream-front', -15, 1.52, 16.642, 1.55, 2.54, 0.016, cream);
	box('vitality-machine-display', -15, 1.65, 16.626, 1.12, 0.9, 0.02, black);
	box('vitality-machine-cross-upright', -15, 1.73, 16.61, 0.18, 0.66, 0.018, red);
	box('vitality-machine-cross-arm', -15, 1.73, 16.596, 0.59, 0.18, 0.018, red);
	box('vitality-machine-dispenser-recess', -15, 0.56, 16.624, 0.72, 0.36, 0.02, black);
	const medicalDoor = new TransformNode('vitality-dispenser-hinge', scene);
	medicalDoor.position.set(-15, 0.725, 16.599);
	box('vitality-machine-dispenser', -15, 0.56, 16.59, 0.7, 0.33, 0.025, metal).setParent(
		medicalDoor
	);
	const tonic = new TransformNode('vitality-dispensed-tonic', scene);
	tonic.position.set(-15, 0.48, 16.61);
	cylinder('vitality-tonic-bottle', -15, 0.5, 16.61, 0.18, 0.1, olive).setParent(tonic);
	cylinder('vitality-tonic-cap', -15, 0.603, 16.61, 0.035, 0.067, railMetal).setParent(tonic);
	box('vitality-tonic-label', -15, 0.5, 16.554, 0.075, 0.08, 0.012, cream).setParent(tonic);
	tonic.setEnabled(false);
	box('vitality-coin-slot', -14.52, 1.04, 16.616, 0.037, 0.13, 0.022, black);
	box('vitality-return-button', -14.52, 0.89, 16.607, 0.09, 0.065, 0.037, railMetal);
	for (const x of [-15.68, -14.32]) {
		for (const y of [0.36, 2.36]) {
			const bolt = cylinder(
				`medical-panel-fastener-${x}-${y}`,
				x,
				y,
				16.617,
				0.023,
				0.045,
				railMetal
			);
			bolt.rotation.x = Math.PI / 2;
		}
	}
	sign(
		'vitality-price-sign',
		'VITALITY / 2,000',
		'MEDICAL TONIC  //  STAY STANDING',
		-15,
		2.58,
		16.61,
		1.64,
		0.5,
		0,
		'#7f392f',
		'#e2d6b0'
	);

	const dialTexture = new DynamicTexture('depot-instrument-dial', 128, scene, true);
	const dialContext = dialTexture.getContext() as CanvasRenderingContext2D;
	dialContext.fillStyle = '#c8c5a7';
	dialContext.fillRect(0, 0, 128, 128);
	dialContext.strokeStyle = '#283a35';
	dialContext.lineWidth = 3;
	for (let tick = 0; tick < 15; tick++) {
		const angle = Math.PI * (0.75 + tick / 9.3);
		dialContext.beginPath();
		dialContext.moveTo(64 + Math.cos(angle) * 43, 64 + Math.sin(angle) * 43);
		dialContext.lineTo(
			64 + Math.cos(angle) * (tick % 3 ? 37 : 31),
			64 + Math.sin(angle) * (tick % 3 ? 37 : 31)
		);
		dialContext.stroke();
	}
	dialContext.fillStyle = '#733a2b';
	dialContext.font = 'bold 12px monospace';
	dialContext.textAlign = 'center';
	dialContext.fillText('LOAD', 64, 91);
	dialTexture.update();
	const dial = material('depot-instrument-enamel', '#ffffff');
	dial.diffuseTexture = dialTexture;
	const gauge = (name: string, x: number, y: number, z: number) => {
		const rim = cylinder(`${name}-rim`, x, y, z, 0.08, 0.32, railMetal);
		rim.rotation.x = Math.PI / 2;
		const face = MeshBuilder.CreateDisc(`${name}-dial`, { radius: 0.128, tessellation: 24 }, scene);
		face.position.set(x, y, z - 0.045);
		face.material = dial;
		face.isPickable = false;
		decorations.push(face);
		const needleRoot = new TransformNode(`${name}-needle-pivot`, scene);
		needleRoot.position.set(x, y, z - 0.051);
		box(`${name}-needle`, x, y + 0.045, z - 0.051, 0.011, 0.115, 0.007, rust).setParent(needleRoot);
		return needleRoot;
	};
	const medicalGauge = gauge('vitality-pressure', -15, 1.07, 16.59);
	const chargeGlow = material('overcharge-active-current', '#6bbdaf', 0.65);
	box('overcharge-workbench-solid', 15, 0.72, 17.25, 3.4, 1.44, 1.7, metal, true);
	box('overcharge-workbench-top', 15, 1.48, 17.25, 3.4, 0.08, 1.7, railMetal);
	box('overcharge-control-back', 15, 1.94, 17.91, 3.4, 0.85, 0.22, olive);
	for (const x of [13.85, 16.15]) {
		cylinder(`overcharge-coil-${x}`, x, 1.88, 17.28, 0.7, 0.34, chargeGlow);
		for (let y = 1.6; y < 2.25; y += 0.13) {
			cylinder(`overcharge-coil-fin-${x}-${y.toFixed(2)}`, x, y, 17.28, 0.045, 0.49, metal);
		}
	}
	box('overcharge-bench-front-light', 15, 1.24, 16.392, 3, 0.08, 0.016, chargeGlow);
	const loadGauge = gauge('overcharge-load', 14.65, 1.97, 17.76);
	const voltageGauge = gauge('overcharge-voltage', 15.1, 1.97, 17.76);
	const chargeLever = new TransformNode('overcharge-breaker-hinge', scene);
	chargeLever.position.set(15.67, 1.82, 17.75);
	box('overcharge-breaker-mount', 15.67, 1.94, 17.775, 0.22, 0.36, 0.045, black);
	box('overcharge-breaker-lever', 15.67, 1.93, 17.68, 0.07, 0.28, 0.065, railMetal).setParent(
		chargeLever
	);
	box('overcharge-breaker-grip', 15.67, 2.06, 17.68, 0.15, 0.08, 0.09, rust).setParent(chargeLever);
	for (const x of [13.48, 16.52]) {
		for (const y of [1.67, 2.22]) {
			const bolt = cylinder(
				`overcharge-control-fastener-${x}-${y}`,
				x,
				y,
				17.782,
				0.035,
				0.06,
				railMetal
			);
			bolt.rotation.x = Math.PI / 2;
		}
	}
	sign(
		'overcharge-price-sign',
		'OVERCHARGE / 3,000',
		'ARMATURE WORKS  //  WEAPON REFORGE',
		15,
		0.83,
		16.386,
		3.05,
		0.67,
		0,
		'#9ef0df'
	);

	// Large architecture is beyond the collision boundary: a roofless yard, not a box room.
	for (const side of [-1, 1]) {
		const x = side * 26.7;
		box(`depot-${side}-warehouse-mass`, x, 4.6, -2, 9, 9.2, 38, darkConcrete);
		box(`depot-${side}-warehouse-cornice`, x, 9.18, -2, 9.35, 0.3, 38.3, metal);
		for (let z = -18; z <= 14; z += 4) {
			box(`depot-${side}-facade-beam-${z}`, side * 22.18, 5.9, z, 0.2, 6.4, 0.16, metal);
			box(
				`depot-${side}-window-recess-${z}`,
				side * 22.185,
				5.5,
				z + 1.6,
				0.035,
				2.25,
				2.45,
				black
			);
			box(
				`depot-${side}-window-glass-${z}`,
				side * 22.16,
				5.5,
				z + 1.6,
				0.025,
				1.94,
				2.12,
				z % 8 === 0 ? window : metal
			);
			box(`depot-${side}-window-mullion-${z}`, side * 22.14, 5.5, z + 1.6, 0.02, 1.94, 0.07, black);
			box(
				`depot-${side}-window-crossbar-${z}`,
				side * 22.135,
				5.5,
				z + 1.6,
				0.02,
				0.07,
				2.12,
				black
			);
		}
		for (const z of [-17.3, -1.3, 14.7]) {
			cylinder(`warehouse-${side}-rainwater-pipe-${z}`, side * 21.98, 5.3, z, 7.1, 0.13, rust);
			for (const y of [3.7, 5.7, 7.7]) {
				cylinder(`warehouse-${side}-pipe-collar-${z}-${y}`, side * 21.98, y, z, 0.07, 0.19, metal);
			}
		}
		box(`warehouse-${side}-service-conduit`, side * 21.97, 3.6, -2, 0.075, 0.075, 37.5, metal);
		for (const z of [-10, 6]) {
			box(`warehouse-${side}-extractor-casing-${z}`, side * 21.98, 4.45, z, 0.3, 0.95, 1.42, olive);
			box(
				`warehouse-${side}-extractor-recess-${z}`,
				side * 21.815,
				4.45,
				z,
				0.015,
				0.76,
				1.24,
				black
			);
			for (let y = 4.16; y < 4.8; y += 0.11) {
				box(
					`warehouse-${side}-vent-louver-${z}-${y}`,
					side * 21.78,
					y,
					z,
					0.075,
					0.045,
					1.22,
					railMetal
				);
			}
			box(
				`warehouse-${side}-junction-box-${z}`,
				side * 21.91,
				3.62,
				z + 1.1,
				0.18,
				0.37,
				0.28,
				olive
			);
		}
		const cablePath = [];
		for (let segment = 0; segment <= 20; segment++) {
			cablePath.push(
				new Vector3(
					side * 21.82,
					8.58 - Math.sin((segment / 20) * Math.PI) * 0.48,
					-20 + segment * 1.8
				)
			);
		}
		const cable = MeshBuilder.CreateTube(
			`warehouse-${side}-sagging-feeder`,
			{ path: cablePath, radius: 0.022, tessellation: 5 },
			scene
		);
		cable.material = black;
		cable.isPickable = false;
		decorations.push(cable);
		box(`warehouse-${side}-upper-stripe`, side * 22.13, 7.65, -2, 0.025, 0.45, 37.5, rust);
	}
	box('north-switchhouse', 0, 4.3, 26.4, 31, 8.6, 8, concrete);
	box('north-switchhouse-roof', 0, 8.68, 26.4, 32, 0.25, 9, metal);
	for (let x = -12; x <= 12; x += 4) {
		box(`switchhouse-window-recess-${x}`, x, 5.6, 22.36, 2.6, 1.75, 0.03, black);
		box(`switchhouse-window-${x}`, x, 5.6, 22.335, 2.2, 1.38, 0.025, window);
		box(`switchhouse-window-divider-${x}`, x, 5.6, 22.316, 0.07, 1.38, 0.015, metal);
	}
	sign(
		'blackwater-depot-main-sign',
		'BLACKWATER DEPOT',
		'RAIL AUTHORITY  /  SECTOR 09  /  EST. 1968',
		0,
		7.7,
		22.29,
		13,
		1.9,
		0,
		'#e9c298',
		'#713d31'
	);
	sign(
		'south-yard-exit-sign',
		'NO SERVICE BEYOND THIS POINT',
		'BLACKWATER  //  TRANSMISSIONS LOST',
		0,
		2.15,
		-21.59,
		7.5,
		1.15,
		Math.PI,
		'#c8cfb2'
	);
	sign(
		'east-warehouse-sector',
		'09 / FREIGHT',
		'UNAUTHORIZED ENTRY PROHIBITED',
		21.55,
		4.25,
		-7,
		6,
		1.2,
		Math.PI / 2,
		'#e9c298',
		'#713d31'
	);
	sign(
		'west-warehouse-sector',
		'BLACKWATER',
		'DISPATCH + RECEIVING',
		-21.55,
		4.25,
		-7,
		6,
		1.2,
		-Math.PI / 2
	);

	const weeds = material('depot-drain-edge-weeds', '#4d5839');
	const scrap = material('depot-discarded-paper', '#989781');
	for (const side of [-1, 1]) {
		for (const z of [-17, -3, 12, 20]) {
			box(`yard-drain-recess-${side}-${z}`, side * 20.85, 0.023, z, 0.67, 0.015, 1.38, black);
			for (let bar = 0; bar < 11; bar++) {
				box(
					`yard-drain-grate-${side}-${z}-${bar}`,
					side * 20.85,
					0.033,
					z - 0.62 + bar * 0.124,
					0.64,
					0.012,
					0.045,
					railMetal
				);
			}
			for (const offset of [-0.36, 0.36])
				box(
					`yard-drain-frame-${side}-${z}-${offset}`,
					side * 20.85 + offset,
					0.031,
					z,
					0.035,
					0.018,
					1.46,
					rust
				);
		}
		for (let tuft = 0; tuft < 21; tuft++) {
			const z = -20.6 + random() * 41.2;
			const x = side * (21.16 + random() * 0.25);
			for (let blade = 0; blade < 4; blade++) {
				const height = 0.08 + random() * 0.2;
				const leaf = box(
					`wall-weed-${side}-${tuft}-${blade}`,
					x + random() * 0.16,
					height / 2,
					z + random() * 0.17,
					0.018,
					height,
					0.01,
					weeds
				);
				leaf.rotation.z = random() * 0.7 - 0.35;
				leaf.rotation.x = random() * 0.7 - 0.35;
			}
		}
		for (let debris = 0; debris < 12; debris++) {
			const piece = box(
				`yard-edge-debris-${side}-${debris}`,
				side * (19.7 + random() * 1.5),
				0.018,
				random() * 40 - 20,
				0.07 + random() * 0.15,
				0.022,
				0.05 + random() * 0.18,
				debris % 3 ? darkConcrete : scrap
			);
			piece.rotation.y = random() * Math.PI;
		}
	}

	for (const [index, x, z] of [
		[0, -22.7, -16],
		[1, 22.7, -3],
		[2, -22.7, 16],
		[3, 22.7, 17]
	]) {
		cylinder(`floodlight-mast-${index}`, x, 4.8, z, 9.6, 0.22, metal);
		box(`floodlight-crossarm-${index}`, x, 9.5, z, 3.7, 0.14, 0.2, metal);
		for (const offset of [-1.2, 1.2]) {
			box(`floodlight-housing-${index}-${offset}`, x + offset, 9.38, z, 0.9, 0.52, 0.6, metal);
			box(`floodlight-lens-${index}-${offset}`, x + offset, 9.1, z, 0.72, 0.035, 0.45, amber);
		}
		const light = new PointLight(`yard-amber-pool-${index}`, new Vector3(x * 0.94, 8.85, z), scene);
		light.diffuse = Color3.FromHexString('#ffc28a');
		light.specular.set(0.12, 0.1, 0.07);
		light.intensity = 1.05;
		light.range = 28;
	}
	const worklight = new PointLight('overcharge-cyan-pool', new Vector3(15, 2.5, 16.7), scene);
	worklight.diffuse = Color3.FromHexString('#6cdbd0');
	worklight.intensity = 0.38;
	worklight.range = 7;
	const medicalLight = new PointLight('vitality-red-pool', new Vector3(-15, 2.8, 16.5), scene);
	medicalLight.diffuse = Color3.FromHexString('#e48258');
	medicalLight.intensity = 0.32;
	medicalLight.range = 6;

	for (const [x, z, height] of [
		[-35, 29, 21],
		[32, 35, 28],
		[13, 45, 23]
	]) {
		cylinder(`industrial-smokestack-${x}`, x, height / 2, z, height, 2.1, darkConcrete);
		cylinder(`industrial-smokestack-band-${x}`, x, height - 3.5, z, 0.85, 2.2, rust);
		cylinder(`industrial-smokestack-cap-${x}`, x, height, z, 0.35, 2.35, metal);
	}
	for (const x of [-31, -25]) {
		for (const z of [35, 41]) {
			box(`water-tower-leg-${x}-${z}`, x, 9, z, 0.35, 18, 0.35, metal);
		}
	}
	cylinder('water-tower-reservoir', -28, 19, 38, 6, 8.6, olive);
	cylinder('water-tower-crown', -28, 22.05, 38, 0.2, 9, metal);
	box('water-tower-crossbrace', -28, 8.4, 35, 6.2, 0.25, 0.25, metal);
	for (let i = 0; i < 7; i++) {
		cylinder(
			`abandoned-drum-${i}`,
			25.2 + (i % 3) * 1.2,
			0.6,
			-26 - Math.floor(i / 3) * 1.2,
			1.2,
			0.85,
			i % 2 ? rust : olive
		);
	}
	// Merge static detail by shared material; moving assemblies and collision meshes stay independent.
	const batches = new Map<StandardMaterial, Mesh[]>();
	for (const mesh of decorations) {
		if (mesh.parent) continue;
		const mat = mesh.material as StandardMaterial;
		const batch = batches.get(mat);
		if (batch) batch.push(mesh);
		else batches.set(mat, [mesh]);
	}
	for (const [mat, meshes] of batches) {
		if (meshes.length < 2) continue;
		const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
		if (merged) {
			merged.name = `${mat.name}-static-details`;
			merged.isPickable = false;
			merged.receiveShadows = true;
			merged.freezeWorldMatrix();
		}
	}

	return {
		obstacles,
		stations,
		spawns: [
			{ x: -19, z: -18 },
			{ x: 19, z: -18 },
			{ x: -19, z: 1 },
			{ x: 19, z: 1 },
			{ x: -18, z: 19 },
			{ x: 18, z: 19 }
		],
		openGate: () => {
			if (gateOpened) return;
			gateOpened = true;
			gate.isPickable = false;
			// The release is immediate; the remaining roll-up happens entirely above head height.
			gateRoot.position.y = 2.7;
		},
		react: (id) => {
			response[id] = id === 'box' ? 2.4 : id === 'upgrade' ? 2.1 : 1.8;
		},
		update: (dt, time) => {
			if (dt <= 0) return;
			for (const id in response)
				response[id as StationId] = Math.max(0, response[id as StationId] - dt);
			if (gateOpened && gateRetraction < 1) {
				gateRetraction = Math.min(1, gateRetraction + dt * 1.4);
				const eased = 1 - Math.pow(1 - gateRetraction, 3);
				gateRoot.position.y = 2.7 + eased * 0.9;
				gateRoot.scaling.y = 1 - eased * 0.975;
			}
			const lidOpen = Math.min(1, (2.4 - response.box) / 0.24, response.box / 0.55);
			issueLid.rotation.x = lidOpen * 1.05;
			const dispensing = Math.min(1, (1.8 - response.vitality) / 0.18, response.vitality / 0.4);
			medicalDoor.rotation.x = dispensing * 1.1;
			tonic.setEnabled(response.vitality > 0.2 && response.vitality < 1.65);
			tonic.position.z = 16.61 - dispensing * 0.22;
			medicalGauge.rotation.z = -0.55 + dispensing * 1.25;
			const pulse =
				response.upgrade > 0 ? Math.pow(Math.sin(time * 19), 2) * Math.min(1, response.upgrade) : 0;
			const idle = 0.65 + Math.sin(time * 1.2) * 0.035;
			chargeGlow.emissiveColor.set(
				0.42 * (idle + pulse),
				0.74 * (idle + pulse),
				0.69 * (idle + pulse)
			);
			worklight.intensity = 0.38 + pulse * 0.55;
			medicalLight.intensity = 0.32 + dispensing * 0.23;
			loadGauge.rotation.z = 0.35 - pulse * 1.1;
			voltageGauge.rotation.z = -0.45 + pulse * 0.55;
			chargeLever.rotation.x = response.upgrade > 0 ? -0.55 : 0;
			for (const indicator of armoryIndicators) {
				const brightness = 0.7 + Math.min(1, response[indicator.id]) * 0.65;
				indicator.material.diffuseColor.scaleToRef(brightness, indicator.material.emissiveColor);
			}
		}
	};
}
