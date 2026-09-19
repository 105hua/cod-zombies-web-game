# Web Game PoC Stack

## Overview

This PoC uses **SvelteKit** for the web application layer and **Babylon.js** for the actual 3D game.

The goal is to keep the web/UI concerns separate from the real-time game loop.

## Core Stack

| Layer         | Technology    | Purpose                                                  |
| ------------- | ------------- | -------------------------------------------------------- |
| Framework     | SvelteKit     | App structure, routing, UI, APIs, SSR where useful       |
| Language      | TypeScript    | Shared language across the whole project                 |
| 3D Engine     | Babylon.js    | Rendering, scenes, cameras, animation, input, particles  |
| Physics       | Havok Physics | Gravity, collisions, rigid bodies, character movement    |
| Build Tooling | Vite          | Dev server and production bundling via SvelteKit         |
| Assets        | glTF / GLB    | Preferred format for 3D models, materials and animations |

## Responsibilities

### SvelteKit

Use SvelteKit for:

- Main application shell
- Menus
- HUD and overlays
- Settings
- Authentication
- Save/load UI
- Leaderboards
- Matchmaking/lobbies
- Backend/API routes
- Error handling
- Loading screens

Svelte should generally **not** own the high-frequency game state.

### Babylon.js

Use Babylon.js for:

- Scene management
- Cameras
- Lighting
- Player controller
- NPCs
- Animation
- Materials and shaders
- Particles
- Audio
- Input
- Raycasting/picking
- Real-time game state
- Render/update loop

### Havok

Use Havok when physics is required for:

- Gravity
- Character/world collisions
- Rigid bodies
- Triggers
- Moving objects
- Physics-based interactions

## Suggested Project Structure

```text
src/
├── lib/
│   ├── game/
│   │   ├── core/
│   │   │   ├── Game.ts
│   │   │   ├── SceneManager.ts
│   │   │   └── AssetManager.ts
│   │   ├── player/
│   │   ├── world/
│   │   ├── entities/
│   │   ├── systems/
│   │   └── physics/
│   │
│   ├── components/
│   │   ├── GameCanvas.svelte
│   │   ├── HUD.svelte
│   │   └── MainMenu.svelte
│   │
│   └── stores/
│       └── game-ui.ts
│
├── routes/
│   ├── +page.svelte
│   └── game/
│       └── +page.svelte
│
└── app.html

static/
└── assets/
    ├── models/
    ├── textures/
    ├── audio/
    └── environments/
```

## Architecture

```text
SvelteKit
│
├── UI / HUD / menus
├── routing
├── APIs
├── auth
└── GameCanvas.svelte
     │
     └── Babylon.js
          ├── Engine
          ├── Scene
          ├── Camera
          ├── Player
          ├── World
          ├── Physics
          ├── NPCs
          └── Game loop
```

Keep communication between the two layers deliberate.

For example:

```text
Babylon player takes damage
        ↓
Game event/state bridge
        ↓
Svelte HUD updates health bar
```

Avoid putting per-frame transforms for every entity into Svelte stores.

## Browser Integration

Babylon.js should be initialised client-side, normally inside `onMount`.

Example:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	onMount(async () => {
		const { Engine, Scene, UniversalCamera, Vector3, HemisphericLight } =
			await import('@babylonjs/core');

		const engine = new Engine(canvas, true);
		const scene = new Scene(engine);

		const camera = new UniversalCamera('player-camera', new Vector3(0, 2, -5), scene);

		camera.attachControl(canvas, true);

		new HemisphericLight('sun', new Vector3(0, 1, 0), scene);

		engine.runRenderLoop(() => {
			scene.render();
		});

		const resize = () => engine.resize();
		window.addEventListener('resize', resize);

		return () => {
			window.removeEventListener('resize', resize);
			engine.dispose();
		};
	});
</script>

<canvas bind:this={canvas}></canvas>
```

## Recommended First PoC

Keep the first version deliberately small.

Build:

1. A simple 3D environment
2. First-person or third-person movement
3. Mouse-look camera
4. Gravity and collision
5. One interactable object
6. One NPC
7. A Svelte HUD
8. Pause/settings menu
9. Basic sound
10. Loading a `.glb` model

That is enough to test whether the stack feels good without spending most of the PoC on content.

## Optional Multiplayer Stack

If multiplayer is added later:

| Technology | Purpose                                        |
| ---------- | ---------------------------------------------- |
| WebSockets | Low-level realtime communication               |
| Colyseus   | Multiplayer rooms, state sync and matchmaking  |
| PostgreSQL | Accounts and persistent game data              |
| Redis      | Sessions, transient state, pub/sub and caching |

Prefer an **authoritative server** for anything competitive.

```text
Browser
   ↓
SvelteKit / Game Client
   ↓ WebSocket
Game Server
   ├── authoritative simulation
   ├── validation
   └── state sync
```

## Asset Pipeline

Preferred formats:

- Models: `.glb`
- Textures: WebP / AVIF where appropriate
- Audio: OGG / WebM
- Environment maps: HDR / compressed environment textures

Useful tools:

- Blender
- Babylon.js Sandbox
- glTF Transform

## Performance Guidelines

- Keep real-time entity state inside Babylon.js.
- Avoid forcing Svelte reactivity every frame.
- Prefer instancing/thin instances for large numbers of repeated objects.
- Use LODs for complex environments.
- Compress textures and models.
- Lazy-load large assets.
- Profile CPU and GPU separately.
- Test on both WebGPU and WebGL fallback paths where relevant.
- Dispose scenes, textures and meshes when no longer needed.

## Initial Dependencies

A reasonable starting point:

```bash
npm install @babylonjs/core @babylonjs/loaders @babylonjs/havok
```

Add other Babylon packages only when they are actually needed.

## Possible Future Additions

- Colyseus for multiplayer
- PostgreSQL for persistence
- Redis for realtime/session workloads
- Zod for API validation
- Drizzle ORM
- Vitest
- Playwright
- Sentry
- Docker for backend services

## Guiding Principle

Treat the application as two cooperating systems:

> **SvelteKit handles the website. Babylon.js handles the game.**

This keeps the game loop independent from the UI framework while still getting the full benefit of SvelteKit for everything surrounding the game.
