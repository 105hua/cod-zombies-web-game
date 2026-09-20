import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import { seededRandom } from '../world/Materials';

type Surface = 'skin' | 'face' | 'fabric' | 'leather';

function lattice(a: number, b: number, cells: number): number {
	let hash = Math.imul(a % cells, 374761393) + Math.imul(b % cells, 668265263);
	hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
	return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

// Periodic value noise keeps stains organic and the UV seam invisible.
function noise(u: number, v: number, cells: number): number {
	const x = u * cells;
	const y = v * cells;
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const tx = x - ix;
	const ty = y - iy;
	const sx = tx * tx * (3 - 2 * tx);
	const sy = ty * ty * (3 - 2 * ty);
	const a = lattice(ix, iy, cells);
	const b = lattice(ix + 1, iy, cells);
	const c = lattice(ix, iy + 1, cells);
	const d = lattice(ix + 1, iy + 1, cells);
	return a + (b - a) * sx + (c - a + (a - b - c + d) * sx) * sy;
}

/** Scene-owned palette: live enemies and fading corpses share the same maps. */
export class ZombieMaterials {
	private readonly materials = new Map<string, StandardMaterial>();
	private readonly surfaces = new Map<Surface, { color: RawTexture; normal: RawTexture }>();

	constructor(private readonly scene: Scene) {}

	get(name: string, hex: string, surface?: Surface): StandardMaterial {
		const existing = this.materials.get(name);
		if (existing) return existing;
		const material = new StandardMaterial(`worker-${name}`, this.scene);
		material.diffuseColor = Color3.FromHexString(hex);
		const flesh = surface === 'skin' || surface === 'face';
		material.specularColor.setAll(flesh ? 0.12 : 0.045);
		material.specularPower = flesh ? 28 : 12;
		if (surface) {
			const maps = this.surface(surface);
			material.diffuseTexture = maps.color;
			material.bumpTexture = maps.normal;
		}
		if (name === 'eye') {
			material.emissiveColor = Color3.FromHexString('#ff9b28').scale(0.85);
			material.specularColor.setAll(0.2);
		}
		this.materials.set(name, material);
		return material;
	}

	private surface(kind: Surface) {
		const existing = this.surfaces.get(kind);
		if (existing) return existing;
		const size = 256;
		const pixels = new Uint8Array(size * size * 3);
		const heights = new Float32Array(size * size);
		const random = seededRandom(419);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const u = x / size;
				const v = y / size;
				const cloud = noise(u, v, 8);
				const detail = noise(u, v, 32);
				const grain = random() - 0.5;
				const stain = Math.max(0, noise(u, v, 4) - 0.46) * 2.5;
				const offset = (y * size + x) * 3;
				if (kind === 'skin' || kind === 'face') {
					const veins = Math.pow(Math.max(0, 1 - Math.abs(detail - 0.5) * 30), 2);
					const decay = Math.max(0, cloud * 0.65 + detail * 0.35 - 0.49) * 2.5;
					let value = 179 + cloud * 48 + detail * 18 + grain * 23 - veins * 19;
					let blood = stain * 0.45 + decay;
					let relief = detail * 0.35 + grain * 0.16 - veins * 0.06;
					if (kind === 'face' && Math.cos(u * Math.PI * 2) > 0) {
						const fx = Math.sin(u * Math.PI * 2) * 0.125;
						const fy = v * 0.396 - 0.18;
						const eyeDistance = Math.hypot((Math.abs(fx) - 0.052) / 0.037, (fy - 0.044) / 0.029);
						const socket = Math.exp(-eyeDistance * eyeDistance * 1.4);
						const cheek = Math.exp(-(((fx - 0.083) / 0.033) ** 2 + ((fy + 0.037) / 0.069) ** 2));
						const lips = Math.exp(-((fx / 0.061) ** 2 + ((fy + 0.099) / 0.043) ** 2) * 1.4);
						const forehead =
							Math.exp(-(((fy - 0.137) / 0.047) ** 2)) * Math.max(0, 1 - Math.abs(fx) * 7);
						const wrinkles =
							Math.pow(Math.max(0, Math.cos(fy * 390 + Math.cos(fx * 29) * 2 + detail)), 12) *
							forehead;
						const creases =
							Math.exp(-(((Math.abs(fx) - 0.028 + (fy + 0.025) * 0.5) / 0.004) ** 2)) *
							Math.exp(-(((fy + 0.048) / 0.046) ** 2));
						blood += cheek * (0.3 + detail * 0.9) + lips * 0.65;
						value -= socket * 83 + wrinkles * 43 + creases * 34 + cheek * decay * 34;
						relief -= wrinkles * 0.22 + creases * 0.18 + cheek * decay * 0.15;
					}
					pixels[offset] = Math.max(0, value - blood * 31);
					pixels[offset + 1] = Math.max(0, value - blood * 77);
					pixels[offset + 2] = Math.max(0, value - blood * 68);
					heights[y * size + x] = relief;
				} else {
					const weave = kind === 'fabric' ? (x % 4 < 2 ? 1 : -1) * (y % 4 < 2 ? 1 : -1) : 0;
					const crease = Math.pow(Math.abs(Math.sin(v * Math.PI * 12 + cloud * 5)), 16);
					const value = 169 + cloud * 54 + grain * 17 - stain * 73 - crease * 17 + weave * 6;
					pixels[offset] = value;
					pixels[offset + 1] = value - stain * 13;
					pixels[offset + 2] = value - stain * 20;
					heights[y * size + x] = detail * 0.22 + grain * 0.08 + weave * 0.055 - crease * 0.1;
				}
			}
		}
		const normalPixels = new Uint8Array(pixels.length);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const dx =
					heights[y * size + ((x + 1) % size)] - heights[y * size + ((x + size - 1) % size)];
				const dy =
					heights[((y + 1) % size) * size + x] - heights[((y + size - 1) % size) * size + x];
				const length = Math.hypot(dx, dy, 1);
				const offset = (y * size + x) * 3;
				normalPixels[offset] = 128 - (dx / length) * 127;
				normalPixels[offset + 1] = 128 - (dy / length) * 127;
				normalPixels[offset + 2] = 128 + 127 / length;
			}
		}
		const color = RawTexture.CreateRGBTexture(pixels, size, size, this.scene, true, false);
		const normal = RawTexture.CreateRGBTexture(normalPixels, size, size, this.scene, true, false);
		color.name = `worker-${kind}-color`;
		normal.name = `worker-${kind}-normal`;
		normal.gammaSpace = false;
		color.anisotropicFilteringLevel = normal.anisotropicFilteringLevel = 4;
		color.wrapU = color.wrapV = normal.wrapU = normal.wrapV = Texture.WRAP_ADDRESSMODE;
		const maps = { color, normal };
		this.surfaces.set(kind, maps);
		return maps;
	}

	dispose() {
		for (const material of this.materials.values()) material.dispose();
		for (const { color, normal } of this.surfaces.values()) {
			color.dispose();
			normal.dispose();
		}
		this.materials.clear();
		this.surfaces.clear();
	}
}
