import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';

interface SurfaceMaps {
	texture: DynamicTexture;
	normalTexture: DynamicTexture;
}

export function seededRandom(seed: number) {
	return () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}

export function createDepotMaterials(scene: Scene) {
	const material = (name: string, color: string, emission = 0) => {
		const mat = new StandardMaterial(name, scene);
		mat.diffuseColor = Color3.FromHexString(color);
		mat.emissiveColor = mat.diffuseColor.scale(emission);
		mat.specularColor.set(0.06, 0.07, 0.07);
		mat.maxSimultaneousLights = 8;
		return mat;
	};
	const surface = (name: string, kind: 'concrete' | 'wood' | 'steel' | 'asphalt', seed: number) => {
		const size = 512;
		const random = seededRandom(seed);
		const texture = new DynamicTexture(`${name}-color`, size, scene, true);
		const ctx = texture.getContext() as CanvasRenderingContext2D;
		const base = {
			concrete: [160, 164, 153],
			wood: [142, 125, 92],
			steel: [153, 158, 146],
			asphalt: [72, 79, 73]
		}[kind];
		const image = ctx.createImageData(size, size);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const offset = (y * size + x) * 4;
				const variation = (random() - 0.5) * (kind === 'asphalt' ? 38 : 20);
				const grain =
					kind === 'wood'
						? Math.sin(y * 1.2 + Math.sin(x * 0.024) * 2.2) * 8 + Math.sin(y * 0.12) * 9
						: Math.sin(x * 0.037) * Math.sin(y * 0.049) * 5;
				for (let channel = 0; channel < 3; channel++)
					image.data[offset + channel] = base[channel] + variation + grain;
				image.data[offset + 3] = 255;
			}
		}
		ctx.putImageData(image, 0, 0);
		if (kind === 'concrete') {
			for (let i = 0; i < 95; i++) {
				const x = random() * size;
				const y = random() * size;
				const radius = 3 + random() * 38;
				const stain = ctx.createRadialGradient(x, y, 0, x, y, radius);
				stain.addColorStop(0, `rgba(47,59,44,${0.03 + random() * 0.1})`);
				stain.addColorStop(1, 'rgba(47,59,44,0)');
				ctx.fillStyle = stain;
				ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
			}
			for (let i = 0; i < 150; i++) {
				ctx.fillStyle = i % 3 ? 'rgba(32,39,32,0.14)' : 'rgba(239,231,206,0.3)';
				ctx.fillRect(random() * size, random() * size, 1 + random() * 4, 1 + random() * 2);
			}
		} else if (kind === 'wood') {
			for (let i = 0; i < 125; i++) {
				const y = random() * size;
				ctx.strokeStyle = i % 3 ? 'rgba(53,40,22,0.19)' : 'rgba(237,205,144,0.16)';
				ctx.lineWidth = 0.5 + random();
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.bezierCurveTo(150, y + random() * 8, 310, y - random() * 8, size, y);
				ctx.stroke();
			}
			for (let knot = 0; knot < 6; knot++) {
				const x = 45 + random() * 420;
				const y = 20 + random() * 470;
				for (let ring = 1; ring < 6; ring++) {
					ctx.strokeStyle = `rgba(48,34,19,${0.24 - ring * 0.028})`;
					ctx.beginPath();
					ctx.ellipse(x, y, ring * 6, ring * 1.7, 0, 0, Math.PI * 2);
					ctx.stroke();
				}
			}
		} else if (kind === 'steel') {
			for (let i = 0; i < 250; i++) {
				const x = random() * size;
				const y = random() * size;
				ctx.fillStyle = i % 3 ? 'rgba(71,50,33,0.23)' : 'rgba(224,224,205,0.34)';
				ctx.fillRect(x, y, 1 + random() * 12, 0.5 + random() * 2);
				if (i % 6 === 0) {
					const drip = ctx.createLinearGradient(x, y, x, y + 45);
					drip.addColorStop(0, 'rgba(112,61,30,0.28)');
					drip.addColorStop(1, 'rgba(112,61,30,0)');
					ctx.fillStyle = drip;
					ctx.fillRect(x, y, 2 + random() * 3, 45);
				}
			}
		}
		texture.anisotropicFilteringLevel = 4;
		texture.update();

		// A shared tangent-space normal map supplies small-scale relief without extra geometry.
		const pixels = ctx.getImageData(0, 0, size, size).data;
		const normalTexture = new DynamicTexture(`${name}-normal`, size, scene, true);
		const normalContext = normalTexture.getContext() as CanvasRenderingContext2D;
		const normals = normalContext.createImageData(size, size);
		const strength = kind === 'asphalt' ? 0.012 : 0.005;
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const offset = (y * size + x) * 4;
				const dx =
					(pixels[(y * size + ((x + 1) % size)) * 4] -
						pixels[(y * size + ((x + size - 1) % size)) * 4]) *
					strength;
				const dy =
					(pixels[(((y + 1) % size) * size + x) * 4] -
						pixels[(((y + size - 1) % size) * size + x) * 4]) *
					strength;
				const length = Math.sqrt(dx * dx + dy * dy + 1);
				normals.data[offset] = 128 - (dx / length) * 127;
				normals.data[offset + 1] = 128 + (dy / length) * 127;
				normals.data[offset + 2] = 128 + 127 / length;
				normals.data[offset + 3] = 255;
			}
		}
		normalContext.putImageData(normals, 0, 0);
		normalTexture.gammaSpace = false;
		normalTexture.anisotropicFilteringLevel = 4;
		normalTexture.update();
		return { texture, normalTexture };
	};
	const concreteSurface = surface('depot-concrete', 'concrete', 732);
	const timberSurface = surface('depot-timber', 'wood', 981);
	const steelSurface = surface('depot-steel', 'steel', 246);
	const asphaltSurface = surface('depot-asphalt', 'asphalt', 731);
	const finish = (name: string, color: string, maps: SurfaceMaps) => {
		const mat = material(name, color);
		mat.diffuseTexture = maps.texture;
		mat.bumpTexture = maps.normalTexture;
		return mat;
	};
	const concrete = finish('depot-weathered-teal-concrete', '#829990', concreteSurface);
	const darkConcrete = finish('depot-shadow-concrete', '#536963', concreteSurface);
	const olive = finish('depot-olive-painted-steel', '#849072', steelSurface);
	const metal = finish('depot-dark-iron', '#42534e', steelSurface);
	const railMetal = finish('depot-worn-rail-steel', '#b3bcb5', steelSurface);
	railMetal.specularColor.set(0.38, 0.4, 0.38);
	railMetal.specularPower = 48;
	const rust = finish('depot-oxidized-red', '#ad6b4d', steelSurface);
	const wood = finish('depot-freight-timber', '#c2ae7c', timberSurface);
	const asphalt = finish('depot-asphalt', '#a1aea1', asphaltSurface);
	asphaltSurface.texture.uScale = asphaltSurface.texture.vScale = 18;
	asphaltSurface.normalTexture.uScale = asphaltSurface.normalTexture.vScale = 18;
	asphalt.specularColor.set(0.09, 0.1, 0.1);
	return {
		material,
		concrete,
		darkConcrete,
		olive,
		metal,
		railMetal,
		rust,
		wood,
		asphalt,
		black: material('depot-rubber-and-recesses', '#101b19'),
		amber: material('depot-amber-lamps', '#ffc478', 0.95),
		red: material('depot-red-warning-lamps', '#c75d43', 0.65),
		cream: material('depot-ivory-enamel', '#c4c3a2'),
		fadedPaint: finish('depot-faded-lane-paint', '#d0bf8a', concreteSurface),
		window: material('depot-lit-windows', '#93b3a1', 0.22)
	};
}
