# Dead Signal

**Notice:** This is just a game I'm building to test the capabilities of GPT-6 properly. I don't expect it to ever become a serious thing, just something to build to pass the time. I might keep working on this for a while, or drop it tomorrow, I don't know.

---

An original solo, first-person zombie survival game built with SvelteKit, TypeScript, and Babylon.js. Survive escalating rounds in **Blackwater Depot**, earn points, and purchase equipment while the horde remains active.

The gameplay reference is the collected [Survival research](./docs/README.md). The game uses a classic-inspired hit/kill points economy and compact-map progression. Enemy curves, prices, timings, and drop probabilities are original balance choices—not verified Call of Duty formulas. Names, visuals, environment, and synthesized sounds are original; no Call of Duty assets are included.

## Run

```sh
bun install
bun run dev
```

Open the Vite URL (normally [http://localhost:5173](http://localhost:5173)), select **Play solo**, then **Begin survival**. `/game` opens the deployment screen directly. Use a current browser with hardware-accelerated WebGL. No API keys, accounts, external asset downloads, or game backend are required.

Desktop keyboard and mouse are recommended. Touch devices receive movement, look, fire, reload, interaction, and melee controls. Once loaded, gameplay makes no server requests; this is not an installable/offline-cached PWA.

## Controls


| Action         | Control                                   |
| -------------- | ----------------------------------------- |
| Move           | WASD                                      |
| Look           | Mouse; arrow left/right also turn         |
| Shoot          | Left mouse button; hold for repeated fire |
| Aim            | Hold right mouse button                   |
| Sprint         | Hold Shift; consumes stamina              |
| Reload         | R                                         |
| Melee          | V                                         |
| Buy / interact | E while facing a nearby station           |
| Pause          | Escape or P; losing focus also pauses     |


Begin/resume captures the mouse. Escape releases it. The pause screen contains mouse sensitivity and sound volume controls. Settings last for the mounted game; runs and records are not saved. Death shows the round reached, eliminations, and elapsed time; **Try again** resets the complete run and map.

## Survival loop

- Start with 500 points, an M1911, 100 health, and five seconds to prepare.
- Clear every scheduled enemy to advance. Unspawned enemies still count toward the round, and at most 24 are active at once.
- Later rounds increase population, durability, movement speed, and spawn pressure. Seven-second transitions give a short preparation window.
- Nonlethal hits earn 10 points. Body kills earn 60, headshot kills 100, and melee kills 130. Headshots deal extra damage.
- Zombies navigate around solid map obstacles and block the player's movement. Sprinting, reloading, and leaving an escape route matter.
- Health regenerates after five seconds without damage. Three unprotected hits are lethal; there is no solo revive.
- Weapons use magazines and finite reserves. Empty magazines automatically start the normal reload sequence when reserve ammo is available, even after releasing fire. Holding fire resumes shooting when the reload finishes. Melee remains available without ammunition. Reloads consume reserves only when complete.
- Exhausting stamina requires recovery to 25 before sprinting again. Aiming, firing, reloading, and melee prevent sprinting.
- Melee has a short windup and recovery instead of instant damage. Replacing or upgrading a weapon cancels a pending melee strike without skipping its recovery.

### In-world purchases


| Station                       | Points | Effect                                                  |
| ----------------------------- | ------: | ------------------------------------------------------- |
| AR-4, west wall               | 1,000  | Automatic rifle; matching reserve refill costs 500      |
| Trench-12, east wall          | 1,250  | Seven-pellet shotgun; matching reserve refill costs 625 |
| Random Issue, southeast crate | 950    | Random pistol, rifle, or shotgun, with fresh ammo       |
| North yard gate               | 750    | Opens the northern routes and machines                  |
| Vitality, northwest machine   | 2,000  | Raises maximum health to 200 and heals                  |
| Overcharge, northeast bench   | 3,000  | Doubles the current weapon's damage                     |


One firearm is carried at a time. New acquisitions replace it and remove its Overcharge; matching wall-ammo purchases preserve the upgrade. Full reserve refills and duplicate permanent upgrades are rejected without charging points. Buying does not pause combat.

Stations require a clear approach and line of sight; prompts show the same eligibility and price used by the purchase transaction.

### Drops

Collected by walking over glowing pickups; uncollected drops expire after 25 seconds.

- **Max Ammo (green):** fills magazine and reserves. This deliberately uses the later-series magazine-refill convenience rather than claiming exact classic behavior.
- **Double Points (gold):** doubles combat earnings for 30 seconds.
- **Insta-Kill (red):** lethal hits for 20 seconds, without protecting the player.
- **Purge (blue):** clears currently spawned enemies, not pending spawns.

Every tenth kill guarantees an ammo drop; other kills have a chance of a random pickup. Survival has no fixed final round or extraction.

## Procedural presentation

All models, textures, effects, and audio are generated locally; no external art or sound files are fetched.

- **Depot:** weathered concrete, timber, steel and asphalt, surface relief, puddles, railway fittings, pipes, cables and debris. Cloud cover, a modeled moon, tone mapping and environment-only shadows establish the night scene without changing the original map footprint or collision layout.
- **Stations:** physical weapon displays, an opening supply crate, a rolling gate, a Vitality dispenser and an animated Overcharge workbench respond to purchases.
- **Zombies:** articulated worker variants with clothing and facial detail, movement-driven gait, committed attack windups and localized hit reactions. Attacks can be dodged and cannot reach through solid cover. Dead bodies stop blocking shots immediately, collapse and expire; at most ten corpses remain visible.
- **Weapons:** distinct pistol, rifle and shotgun assemblies with sights, barrels, gloved arms, aim transitions, recoil, movement sway, reload mechanisms, muzzle flashes and pooled ejected casings. Reload animation does not change ammunition accounting.
- **Combat feedback:** pooled impact fragments and bullet marks, modeled pickups with expiry blinking, weapon-specific synthesized shots, reloads, footsteps, enemy cues and environmental sound. Positional cues use distance attenuation and stereo panning; pausing, death and muting silence active voices.

The renderer warms scene materials before deployment. Slow rendered frames use bounded simulation substeps, keeping movement, reloads and short shot flashes responsive without a single oversized collision step. Impact fragments, bullet marks and casings use fixed-size pools; generated sound buffers are cached and concurrent audio voices are capped.

## Architecture

```text
src/lib/
  components/
    GameCanvas.svelte       Client lifecycle, deployment, pause, settings, death, touch controls
    HUD.svelte              Round, points, health, stamina, ammo, prompts, damage/hit feedback
    MainMenu.svelte         Menu and field manual with original depot illustration
  stores/game-ui.ts         Per-mounted-canvas state bridge
  game/
    types.ts                Game, station, weapon, and HUD contracts
    core/Game.ts            Input, simulation loop, combat, pickups, audio, disposal
    core/SceneManager.ts    Camera, atmospheric lighting, and world composition
    core/AssetManager.ts    Existing optional glTF/GLB loader
    world/createWorld.ts    Procedural depot, purchase stations, solid geometry
    world/Materials.ts      Shared procedural surface textures and materials
    entities/Horde.ts       Pursuit, separation, committed attacks, corpse lifecycle
    entities/ZombieModel.ts Articulated procedural rigs and animation poses
    player/WeaponView.ts    First-person weapon models, handling, reloads, casings
    systems/Survival.ts     Renderer-independent rules, economy, rounds, timers
    systems/Navigation.ts   Planar collision and grid-based pursuit around obstacles
    systems/CombatEffects.ts Pooled impacts, bullet marks, modeled pickups
    systems/Audio.ts        Bounded synthesized spatial and environmental audio
```

Svelte owns menus and HUD, not the frame loop. The canvas attachment lazy-loads the runtime in the browser, returns cleanup synchronously, and guards against unmount during loading. HUD snapshots publish at most once per 80 milliseconds during play, plus state transitions. Pausing stops simulation timers, enemies, spawning, reloads, and power-ups.

The arena is deliberately planar: custom circle/rectangle collision handles movement; Havok is not initialized. The installed Havok and glTF dependencies remain available for future content, but no physics-WASM or external models are loaded by this game. [STACK.md](./STACK.md) retains the original broader stack proposal.

Unmounting removes inputs and observers, releases mouse capture, stops rendering, closes audio, and disposes Babylon resources. Restart recreates the scene, including the locked gate and all pickups. The original demo routes remain independent.

## Validation

```sh
bun run check
bun run lint
bun run test:unit -- --run
bun run test:e2e
bun run build
bun audit
```

Unit coverage includes round/spawn boundaries, reload conservation, damage/recovery, death/restart, purchase rejection, pickup expiry, navigation recovery, dodging committed attacks, cover occlusion, corpse cleanup, touch firing, player collision, low-frame-rate reloads and flashes, and real scene/engine cleanup. The route test exercises firing, reloading, pause, resize, navigation, and remounting.

`bun run test` invokes npm internally, so Node/npm must also be available. On first use, `bun x playwright install chromium` installs the browser used by Vitest. Playwright's end-to-end configuration builds the application and serves it on port 4173, which must be free. Lazy Babylon dependencies are explicitly prebundled to avoid Vite reloading browser tests during initialization.

`package.json` overrides SvelteKit's transitive `cookie` dependency to `0.7.2` to fix [CVE-2024-47764](https://github.com/advisories/GHSA-pxg6-pf52-xh8x). Keep the override until SvelteKit resolves a patched version without it; verify with `bun audit` after dependency updates.

## Production

```sh
bun run build
node build
```

`bun run preview` is for local build inspection, not the production server. The Node adapter reads `HOST`, `PORT`, and `ORIGIN` from its runtime environment.

### Docker

Requires Docker with Linux containers and Docker Compose v2. No local Bun or Node installation is needed.

```sh
docker compose up --build -d --wait
```

Open [http://localhost:3000](http://localhost:3000) (or [http://localhost:3000/game](http://localhost:3000/game)). The image builds with Bun 1.3.14 and the frozen lockfile, then runs the existing Node adapter on Node 24 as a non-root user. Only the built application, package manifest, and production dependencies enter the runtime image. Docker checks the home page for health; Compose allows the adapter's graceful shutdown to finish.

```sh
docker compose ps
docker compose logs -f web
docker compose down
```

Compose binds to `127.0.0.1` by default. Set these variables in your shell or a local `.env` file beside `compose.yaml` to customize deployment:


| Variable    | Default                        | Purpose                                               |
| ----------- | ------------------------------ | ----------------------------------------------------- |
| `HOST_PORT` | `3000`                         | Published host port; container port remains `3000`    |
| `HOST_IP`   | `127.0.0.1`                    | Set `0.0.0.0` to expose the service on all interfaces |
| `ORIGIN`    | `http://localhost:<HOST_PORT>` | Exact browser-facing origin, including scheme         |


For example, behind an HTTPS reverse proxy:

```dotenv
HOST_PORT=3000
HOST_IP=127.0.0.1
ORIGIN=https://game.example.com
```

Point the host's reverse proxy at `127.0.0.1:3000` and terminate TLS there. A proxy in another container must join the Compose network and use `web:3000` instead. For direct LAN access, set `HOST_IP=0.0.0.0` and `ORIGIN=http://<server-address>:3000`; restrict access with your firewall. Recreate the service with `docker compose up -d --wait` after changing runtime variables.

`.env` files are excluded from the build context; Compose passes only the configured `ORIGIN` into the container. No secrets, database, persistent volumes, or GPU passthrough are required. Rendering still uses WebGL on the player's device, not in Docker.

To use Docker without Compose:

```sh
docker build -t dead-signal .
docker run --rm --init --stop-timeout 35 -p 127.0.0.1:3000:3000 -e ORIGIN=http://localhost:3000 dead-signal
```

The engine is lazy-loaded separately from the menu. Vite can report a large Babylon chunk; the warning is not suppressed. The renderer uses WebGL, not WebGPU.

## Scope

Implemented: one complete solo survival map, procedural 3D art and sound, three weapons, purchases, upgrades, power-ups, escalating rounds, pause/settings, death/restart, and touch controls. Multiplayer, story quests, barricade repair, special enemy types, two-weapon inventory, saves, and extraction are not part of this basic game.