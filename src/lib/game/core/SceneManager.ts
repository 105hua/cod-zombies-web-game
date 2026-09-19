import { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { createWorld, type World } from '../world/createWorld';
import { seededRandom } from '../world/Materials';

export interface GameScene {
	scene: Scene;
	camera: UniversalCamera;
	world: World;
}

function createAtmosphere(scene: Scene) {
	const random = seededRandom(1968);
	const skyTexture = new DynamicTexture(
		'blackwater-cloud-cover',
		{ width: 1024, height: 512 },
		scene,
		true
	);
	const ctx = skyTexture.getContext() as CanvasRenderingContext2D;
	const gradient = ctx.createLinearGradient(0, 0, 0, 512);
	gradient.addColorStop(0, '#15282e');
	gradient.addColorStop(0.38, '#2d4245');
	gradient.addColorStop(0.52, '#52645e');
	gradient.addColorStop(0.67, '#263d3a');
	gradient.addColorStop(1, '#1a2c2a');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, 1024, 512);
	for (let cloud = 0; cloud < 90; cloud++) {
		const x = random() * 1024;
		const y = 35 + random() * 218;
		const radius = 40 + random() * 150;
		const thickness = 0.12 + random() * 0.12;
		for (const wrap of [-1024, 0, 1024]) {
			ctx.save();
			ctx.translate(x + wrap, y);
			ctx.scale(1, thickness);
			const veil = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
			veil.addColorStop(0, cloud % 3 ? 'rgba(8,21,24,0.18)' : 'rgba(116,136,131,0.08)');
			veil.addColorStop(1, 'rgba(8,21,24,0)');
			ctx.fillStyle = veil;
			ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
			ctx.restore();
		}
	}
	skyTexture.update();
	const skyMaterial = new StandardMaterial('blackwater-atmospheric-sky', scene);
	skyMaterial.disableLighting = true;
	skyMaterial.diffuseTexture = skyTexture;
	skyMaterial.emissiveColor.set(0.75, 0.8, 0.83);
	skyMaterial.backFaceCulling = false;
	const dome = MeshBuilder.CreateSphere(
		'blackwater-overcast-dome',
		{ diameter: 240, segments: 24, sideOrientation: Mesh.BACKSIDE },
		scene
	);
	dome.material = skyMaterial;
	dome.isPickable = false;
	dome.infiniteDistance = true;
	dome.applyFog = false;

	const moonTexture = new DynamicTexture(
		'lunar-maria-and-craters',
		{ width: 512, height: 256 },
		scene,
		true
	);
	const lunar = moonTexture.getContext() as CanvasRenderingContext2D;
	lunar.fillStyle = '#bcc5b9';
	lunar.fillRect(0, 0, 512, 256);
	for (let crater = 0; crater < 160; crater++) {
		const x = random() * 512;
		const y = random() * 256;
		const radius = 1 + Math.pow(random(), 3) * 28;
		const basin = lunar.createRadialGradient(x - radius * 0.2, y - radius * 0.15, 0, x, y, radius);
		basin.addColorStop(0, 'rgba(67,83,75,0.32)');
		basin.addColorStop(0.75, 'rgba(83,97,86,0.18)');
		basin.addColorStop(0.9, 'rgba(223,226,206,0.2)');
		basin.addColorStop(1, 'rgba(118,132,119,0)');
		lunar.fillStyle = basin;
		lunar.fillRect(x - radius, y - radius, radius * 2, radius * 2);
	}
	const pixels = lunar.getImageData(0, 0, 512, 256);
	for (let y = 0; y < 256; y++) {
		for (let x = 0; x < 512; x++) {
			const longitude = (x / 512) * Math.PI * 2;
			const latitude = (y / 256) * Math.PI;
			const phase =
				0.17 +
				Math.max(0, (Math.sin(longitude) * 0.7 + Math.cos(longitude) * 0.65) * Math.sin(latitude)) *
					0.83;
			const offset = (y * 512 + x) * 4;
			pixels.data[offset] *= phase;
			pixels.data[offset + 1] *= phase;
			pixels.data[offset + 2] *= phase;
		}
	}
	lunar.putImageData(pixels, 0, 0);
	moonTexture.update();
	const moonMaterial = new StandardMaterial('moon-weathered-surface', scene);
	moonMaterial.disableLighting = true;
	moonMaterial.diffuseTexture = moonTexture;
	moonMaterial.emissiveColor.set(0.84, 0.9, 0.82);
	const moon = MeshBuilder.CreateSphere(
		'cloud-veiled-moon',
		{ diameter: 4.2, segments: 28 },
		scene
	);
	moon.position.set(-23, 33, 58);
	moon.rotation.y = 0.5;
	moon.material = moonMaterial;
	moon.isPickable = false;
	moon.infiniteDistance = true;
	moon.applyFog = false;

	const haloTexture = new DynamicTexture('moon-atmospheric-scatter', 128, scene, false);
	const haloContext = haloTexture.getContext() as CanvasRenderingContext2D;
	const scatter = haloContext.createRadialGradient(64, 64, 10, 64, 64, 64);
	scatter.addColorStop(0, 'rgba(163,192,177,0.045)');
	scatter.addColorStop(0.4, 'rgba(163,192,177,0.025)');
	scatter.addColorStop(1, 'rgba(163,192,177,0)');
	haloContext.fillStyle = scatter;
	haloContext.fillRect(0, 0, 128, 128);
	haloTexture.hasAlpha = true;
	haloTexture.update();
	const haloMaterial = new StandardMaterial('moon-soft-atmosphere', scene);
	haloMaterial.disableLighting = true;
	haloMaterial.emissiveColor.set(0.65, 0.72, 0.68);
	haloMaterial.diffuseTexture = haloTexture;
	haloMaterial.useAlphaFromDiffuseTexture = true;
	const halo = MeshBuilder.CreatePlane('moon-cloud-scatter', { size: 12 }, scene);
	halo.position.set(-23, 33, 58.5);
	halo.material = haloMaterial;
	halo.billboardMode = Mesh.BILLBOARDMODE_ALL;
	halo.isPickable = false;
	halo.infiniteDistance = true;
	halo.applyFog = false;
}

export function createScene(engine: Engine): GameScene {
	const scene = new Scene(engine);
	try {
		scene.clearColor = new Color4(0.07, 0.105, 0.11, 1);
		scene.fogMode = Scene.FOGMODE_EXP2;
		scene.fogDensity = 0.0105;
		scene.fogColor = new Color3(0.105, 0.15, 0.15);
		scene.imageProcessingConfiguration.toneMappingEnabled = true;
		scene.imageProcessingConfiguration.toneMappingType =
			ImageProcessingConfiguration.TONEMAPPING_ACES;
		scene.imageProcessingConfiguration.exposure = 1.5;
		scene.imageProcessingConfiguration.contrast = 1.02;
		const camera = new UniversalCamera('survivor', new Vector3(0, 1.65, -13), scene);
		camera.minZ = 0.05;
		camera.maxZ = 200;
		camera.fov = 1.25;
		camera.inputs.clear();
		const sky = new HemisphericLight('overcast-sky', new Vector3(0.3, 1, 0.4), scene);
		sky.intensity = 0.92;
		sky.diffuse = new Color3(0.68, 0.79, 0.83);
		sky.groundColor = new Color3(0.23, 0.26, 0.22);
		const moon = new DirectionalLight('moonlight', new Vector3(0.34, -0.58, -0.74), scene);
		moon.position.set(-23, 39, 50);
		moon.intensity = 0.6;
		moon.diffuse = new Color3(0.7, 0.8, 0.88);
		moon.shadowFrustumSize = 66;
		moon.shadowMinZ = 1;
		moon.shadowMaxZ = 130;
		const world = createWorld(scene);
		createAtmosphere(scene);
		const shadows = new ShadowGenerator(1024, moon);
		shadows.usePercentageCloserFiltering = true;
		shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
		shadows.bias = 0.0015;
		shadows.normalBias = 0.025;
		shadows.setDarkness(0.35);
		for (const mesh of scene.meshes) {
			if (mesh.metadata?.depotShadow) shadows.addShadowCaster(mesh, false);
		}
		return { scene, camera, world };
	} catch (error) {
		scene.dispose();
		throw error;
	}
}
