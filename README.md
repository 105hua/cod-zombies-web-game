# Dead Signal

**Notice:** This is just a game I'm building to test the capabilities of GPT-6 properly. I don't expect it to ever become a serious thing, just something to build to pass the time. I might keep working on this for a while, or drop it tomorrow, I don't know.

---

An original solo, first-person zombie survival game built with SvelteKit, TypeScript, and Babylon.js. Survive escalating rounds in **Blackwater Depot**, earn points, and purchase equipment while the horde remains active.

The gameplay reference is the collected [Survival research](./docs/README.md). The game uses a classic-inspired hit/kill points economy and compact-map progression. Enemy curves, prices, timings, and drop probabilities are original balance choices—not verified Call of Duty formulas. Visuals, environment, and non-weapon synthesized sounds are original; weapon audio uses licensed firearm recordings. No Call of Duty assets are included.

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

The **Credits** button beside **How to Survive** on the Play Solo screen opens the audio acknowledgements, source links, and licenses. The scrollable dialog supports keyboard navigation, closes with **Close** or **Escape**, and returns focus to the Credits button. Source links and the full attribution file open in a new tab without starting a game.

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
| ----------------------------- | -----: | ------------------------------------------------------- |
| AR-4, west wall               |  1,000 | Automatic rifle; matching reserve refill costs 500      |
| Trench-12, east wall          |  1,250 | Seven-pellet shotgun; matching reserve refill costs 625 |
| Random Issue, southeast crate |    950 | Random pistol, rifle, or shotgun, with fresh ammo       |
| North yard gate               |    750 | Opens the northern routes and machines                  |
| Vitality, northwest machine   |  2,000 | Raises maximum health to 200 and heals                  |
| Overcharge, northeast bench   |  3,000 | Doubles the current weapon's damage                     |

One firearm is carried at a time. New acquisitions replace it and remove its Overcharge; matching wall-ammo purchases preserve the upgrade. Full reserve refills and duplicate permanent upgrades are rejected without charging points. Buying does not pause combat.

Stations require a clear approach and line of sight; prompts show the same eligibility and price used by the purchase transaction.

### Drops

Collected by walking over glowing pickups; uncollected drops expire after 25 seconds.

- **Max Ammo (green):** fills magazine and reserves. This deliberately uses the later-series magazine-refill convenience rather than claiming exact classic behavior.
- **Double Points (gold):** doubles combat earnings for 30 seconds.
- **Insta-Kill (red):** lethal hits for 20 seconds, without protecting the player.
- **Purge (blue):** clears currently spawned enemies, not pending spawns.

Every tenth kill guarantees an ammo drop; other kills have a chance of a random pickup. Survival has no fixed final round or extraction.

## Presentation and audio

Models, textures, and visual effects are generated locally. Weapon recordings are bundled with the game; no third-party asset service is contacted during play. Other audio remains synthesized.

- **Depot:** weathered concrete, timber, steel and asphalt, surface relief, puddles, railway fittings, pipes, cables and debris. Cloud cover, a modeled moon, tone mapping and environment-only shadows establish the night scene without changing the original map footprint or collision layout.
- **Stations:** physical weapon displays, an opening supply crate, a rolling gate, a Vitality dispenser and an animated Overcharge workbench respond to purchases.
- **Zombies:** three articulated worker variants with continuous anatomical meshes, carved eye sockets and cheek hollows, amber eyes, open jaws and individual teeth/fingers. Ragged workwear, exposed ribs, skin discoloration, facial creases and shared 256px color/normal maps replace the primitive block-and-oval look. Individual pace, limp and arm posture variations blend from shambling to running as round speed increases. Zombies accelerate into forward-facing movement, slow for sharp turns and pursue directly over clear ground while retaining obstacle-aware routing. Distance-driven, asymmetric steps, supporting-boot contact, torso counter-rotation and approaching arm reaches replace uniform marching. Committed attack windups, localized hit reactions and headshot regions remain intact. Attacks can be dodged and cannot reach through solid cover. Dead bodies stop blocking shots immediately, collapse and expire; at most ten corpses remain visible.
- **Weapons:** distinct pistol, rifle and shotgun assemblies with sights, barrels, gloved arms, aim transitions, recoil, movement sway, reload mechanisms, muzzle flashes and pooled ejected casings. Reload animation does not change ammunition accounting.
- **Player camera:** subtle distance-driven head bob and strafe roll, with stronger sprint motion and 90% camera-motion attenuation at full ADS. Camera and weapon share a stride phase; collision-blocked movement stops advancing the gait and smoothly settles the view. Mouse look and recoil stay immediate, and cosmetic motion never shifts the horizontal collision position. Walking/sprinting bob amplitudes are 1.1/1.8 cm, with a 3.6 m left/right stride; these are original tuning, not extracted Call of Duty values.
- **Combat feedback:** pooled impact fragments and bullet marks, modeled pickups with expiry blinking, recorded weapon reports and mechanical actions, synthesized footsteps, enemy cues and environmental sound. Positional cues use distance attenuation and stereo panning; pausing, death and muting silence active voices.
- **Weapon audio:** two close-recorded takes each of a 1911, AR-15/M4 and Winchester Model 12 replace the shared noise/bass-sweep gunshots. Recorded magazine, slide, shell and bolt textures follow reload and pump animation phases, including last-shell auto-reloads and pause/resume. Fifteen mono WAV clips total approximately 630 KiB and are decoded once before the ready screen. A loading failure is logged and reported in the HUD when play begins; gameplay remains available without sound.
- **Audio credits:** gunshots by Ben Jaszczak, Brian Nelson, Kevin Heras and Matthew Nanney ([The Free Firearm Sound Library](https://opengameart.org/content/the-free-firearm-sound-library), CC0). Mechanical recordings by Gary ([Handling Guns](https://opengameart.org/content/handling-guns), CC-BY-SA 3.0); the adapted mechanical WAVs retain that license. Rifle handling and shotgun pump sounds use adapted mechanical textures, not exact-model action recordings. Full source mappings, modifications and license links accompany the assets in [CREDITS.txt](./static/assets/audio/weapons/CREDITS.txt).

Zombie art takes visual cues from the gaunt faces, worn clothing and amber eyes of [Black Ops-era Kino der Toten](https://static.wikia.nocookie.net/callofduty/images/f/fb/Zombie_Mouth_Open_Kino_BO1.png/revision/latest) and [Black Ops III's The Giant](https://static.wikia.nocookie.net/callofduty/images/5/58/TheGiant_Zombies_BO3.png/revision/latest). These are reference images only: all shipped geometry and textures are original procedural work, not extracted game assets. Detail is merged by animated joint, material and hit region; surface maps are shared across the horde and disposed with the scene.

Movement references: [World at War animation-set examples](https://zombiemodding.com/index.php?topic=9692.0) distinguish walk/run/sprint cycles and multiple sprint animations; [Black Ops III's zombie behavior scripts](https://bo3explorer.zeroy.com/zombie_8gsc_source.html) expose locomotion speed types, arm-up/down postures and dedicated turn behavior. These sources inform variety and transitions, not an exact recreation of Treyarch's animation or pathfinding systems. Acceleration, turn rates, stance timing, procedural floor contact and small individual pace differences are original tuning for this game's rig. The 2.9-unit/second ceiling, attack reach, windup/strike/recovery timings and damage are unchanged. Crawlers, traversal animations and BO3's conditional stumble/juke behaviors are not added by this movement update.

Player-camera references: archived [MW2 speed-scaled view bob](https://www.gamerconfig.eu/command/call-of-duty-modern-warfare-2/bg_viewBobAmplitudeStanding/), [Black Ops ADS-specific view bob](https://www.gamerconfig.eu/command/call-of-duty-black-ops/bg_viewBobAmplitudeStandingAds/) and [CoD4 sprint-camera bob](https://www.gamerconfig.eu/command/call-of-duty-4-modern-warfare/player_sprintCameraBob/) document separate locomotion/aiming controls. Treyarch's [Black Ops III latency presentation](https://www.gdcvault.com/play/1022943/Fighting-Latency-on-Call-of) informs the decision to retain immediate look input rather than add camera-follow lag. These references support the mechanisms and responsiveness goals, not exact animation curves or a frame-matched recreation.

The renderer warms scene materials before deployment. Slow rendered frames use bounded simulation substeps, keeping movement, reloads and short shot flashes responsive without a single oversized collision step. Impact fragments, bullet marks and casings use fixed-size pools; decoded recordings and generated noise buffers are cached, and concurrent audio voices are capped.

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
    entities/Horde.ts       Smooth pursuit, procedural gait, attacks, corpse lifecycle
    entities/ZombieModel.ts Articulated procedural rigs and boot contact dimensions
    player/WeaponView.ts    First-person weapon models, handling, reloads, casings
    player/CameraMotion.ts  Shared distance-driven gait, view bob, strafe roll, FOV transitions
    systems/Survival.ts     Renderer-independent rules, economy, rounds, timers
    systems/Navigation.ts   Planar collision and grid-based pursuit around obstacles
    systems/CombatEffects.ts Pooled impacts, bullet marks, modeled pickups
    systems/Audio.ts        Recorded weapons, synthesized ambience, bounded spatial audio
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

### Jenkins: same-VPS deployment behind Nginx Proxy Manager

`Jenkinsfile` checks out the configured GitHub SCM, builds an isolated CI image, runs
type checks, formatting/ESLint, `bun audit`, and all Vitest tests, then builds the
production image. Playwright exercises that **production container**, including
shooting, reloading, pause, resize, and route remounts. Failed checks stop deployment.
JUnit results, browser failure traces, and other test artifacts are retained by Jenkins.

The job exposes these separately timed stages:

```text
Checkout → Install Dependencies → Prepare Browser Tests → Type Check → Lint
         → Dependency Audit → Unit Tests → Build Production Image → Smoke Tests → Deploy
```

Install **[Pipeline: Stage View](https://plugins.jenkins.io/pipeline-stage-view/)**
in Jenkins to see stage status, duration, and stage-specific logs on the job page.
Dependency installation and browser preparation use separate Docker build targets
and reuse cached layers. A cached stage can therefore finish quickly without
reinstalling dependencies. Deployment remains one stage so promotion and rollback
stay within the same coordinated operation.

The isolated smoke network uses `http://app.test:3000`. Do not shorten this to
`http://app:3000`: Chromium's HSTS preload list forces the bare `app` hostname to
HTTPS, causing `ERR_SSL_PROTOCOL_ERROR` against the HTTP-only container.
This internal test address does not change the public `ORIGIN` or NPM TLS setup.

The deployment path is separate from the manual `compose.yaml` service:

```text
Nginx Proxy Manager (domain + TLS)
  -> dead-signal-gateway:3000
      -> current release container
      -> candidate release, promoted only after health and browser checks
```

`deploy/deploy.sh` tests the candidate, archives its immutable assets, validates
Nginx configuration, and gracefully reloads the gateway to switch new requests.
Existing requests finish on the previous release. Fresh HTTP connections must
return the candidate's release header and HTTP 200 before promotion is accepted.
A failed post-switch check restores and verifies the previous configuration.
The gateway is not recreated on subsequent deployments.

This avoids a planned outage during release switches; it does not provide
high availability against VPS failure, Docker restarts, resource exhaustion,
or changes to NPM itself. The initial NPM upstream migration can interrupt
requests. Budget CPU/RAM for CI browsers alongside the live and candidate games.

#### Jenkins prerequisites and job setup

1. Provide a **Linux agent on the VPS**, labelled `docker`, with Git, Bash, and the
   Docker CLI connected to the VPS's Docker daemon. No host Bun, Node, browser,
   Compose, registry, or SSH deployment connection is needed for this pipeline.
   A containerized Jenkins agent can use the host Docker socket; the CLI still
   needs to be installed and permitted to access it. CI uses baked images and
   `docker cp`, not host workspace bind mounts.
2. Install Jenkins **Pipeline**, **Git**, **JUnit**, and **Timestamper** plugins
   and their dependencies. Use a supported Jenkins LTS release.
3. Create a **Pipeline** job with **Pipeline script from SCM → Git**:
   repository `git@github.com:105hua/cod-zombies-web-game.git`, branch `*/main`,
   script path `Jenkinsfile`. Configure a Jenkins SSH private-key credential
   for GitHub checkout and Git host-key verification. An HTTPS repository URL
   with appropriate Jenkins credentials also works. Never put keys in the repo.
4. Ensure NPM is attached to the external `npm_proxy` Docker network. The pipeline
   checks that the network exists; it deliberately does not reconfigure NPM.
   Declare the network in NPM's own Compose configuration so it survives NPM
   recreation. If needed, create it once with `docker network create npm_proxy`.
5. Run the job once with deployment disabled. Configure these build parameters:

| Parameter        | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| `ORIGIN`         | Exact public origin, e.g. `https://game.example.com`; no path or trailing slash |
| `DEPLOY_PROJECT` | `dead-signal` unless you need another namespace                                 |
| `PROXY_NETWORK`  | `npm_proxy`, or the existing network shared with NPM                            |
| `DEPLOY_ENABLED` | Initially `false`; enable after checks and VPS configuration are ready          |

Production deployment requires `main`, no pull-request context, and
`DEPLOY_ENABLED=true`. Other builds still run validation and image smoke tests.
The release name includes the commit, build number, and a random token; the
combined project/release container DNS name must fit 63 characters. Keep project
names short and use only lowercase letters, digits, and hyphens.

**Security:** Docker daemon access is effectively host-root access. Run only
trusted repository code on this agent. Branch deployment conditions do **not**
make untrusted fork PRs safe: their builds and Jenkinsfiles can execute code
before the deployment stage. Use a separate isolated agent for untrusted code.
Keep Jenkins off the public application network where possible.

For push-triggered builds, optionally install/configure Jenkins' GitHub plugin,
enable **GitHub hook trigger for GITScm polling**, and configure the repository's
push webhook to your Jenkins `/github-webhook/` endpoint. Manual builds also work.
GitHub credentials, webhook configuration, and Jenkins jobs are not created by
checking in this file.

#### First deployment and NPM configuration

Run an enabled `main` build with the real `ORIGIN`. After it succeeds, configure
the NPM Proxy Host:

- Domain: your game domain.
- Scheme: `http`.
- Forward hostname: `dead-signal-gateway` (or `<DEPLOY_PROJECT>-gateway`).
- Forward port: `3000`.
- TLS/certificate: managed by NPM; use HTTPS matching `ORIGIN`.
- Do not enable an HTML cache or add a second upstream switch in NPM.

No app or gateway host ports are published by this deployment. NPM reaches the
gateway over the shared Docker network; app containers use a separate internal
network. Verify the public route after the initial migration:

```sh
curl -fsS -D - https://game.example.com/ -o /dev/null
```

Expect HTTP 200 and `X-Deployment-Release`. Jenkins verifies the internal
candidate and gateway paths, not your public DNS, NPM certificate, or firewall.
Once public access works, retire any old manual Compose deployment separately.
Do not point NPM at the release-specific container name.

#### Rollback, interrupted jobs, and retention

Deployments are serialized per Jenkins job and additionally use an atomic Docker
lock named `<project>-deploy-lock` across jobs. The lock is a **stopped container**;
stopped does not mean stale. Do not remove it while a deployment is running.

Persistent volumes are `<project>-gateway-config` and
`<project>-immutable-assets`. The first contains `current`, an atomic symlink to
`releases/<release-id>`, whose `state` file records active and previous release IDs.
The second retains hashed JS/CSS from earlier releases so open browser tabs can
still lazy-load their original code after promotion. Conflicting bytes at the
same immutable asset path reject the candidate rather than overwrite old assets.

For the default project:

```sh
docker exec dead-signal-gateway cat /deploy/current/state
docker exec dead-signal-gateway readlink /deploy/current
docker logs --tail 100 dead-signal-gateway
docker ps -a --filter label=deploy.project=dead-signal
docker top dead-signal-gateway -eo pid,args
```

Ordinary candidate health/browser failures leave the live release untouched.
Confirmed post-switch failures attempt an automatic rollback. An interrupted
Docker operation can still be executing remotely after its CLI exits: in that
case the script retains the lock, helper, and release containers and fails
loudly instead of racing another configuration change. A surviving
`/deploy/pending` journal also blocks further deployments.

For interrupted-operation recovery, stop/disable deployment jobs, inspect the
retained helper with `docker top`, and establish that abandoned Docker operations
have finished before changing state. Using a temporary Nginx container with the
configuration volume mounted read-write, select a known-good release by creating
`current.next` as a relative symlink to `releases/<id>` and atomically renaming it
over `current`. Test and gracefully reload the gateway:

```sh
docker exec dead-signal-gateway nginx -t -c /deploy/current/nginx.conf
docker exec dead-signal-gateway nginx -s reload -c /deploy/current/nginx.conf
curl -fsS -D - https://game.example.com/ -o /dev/null
```

Verify the expected release header on fresh requests **before** removing
`/deploy/pending`, abandoned helper containers, or the deployment lock. If the
first deployment failed before a gateway existed, there is no previous live
release; inspect and recover that bootstrap state rather than assume rollback.
The comments in `deploy/deploy.sh` describe the same recovery constraints.

Old release containers and their images are deliberately retained, including
failed candidates that might still serve draining requests. **They continue
consuming resources.** Regularly review disk/RAM usage. Remove obsolete containers
only after confirming they are neither active nor previous and no old Nginx
worker still uses them; `docker top` shows workers shutting down. Then remove
their unreferenced images. Unused images from non-deploying Jenkins builds are
removed automatically. Never broadly prune deployment volumes. Deleting archived
immutable assets can break old browser tabs; retain them for your chosen client
lifetime and back up both deployment volumes.

## Scope

Implemented: one complete solo survival map, procedural 3D art, recorded weapon audio and synthesized environmental sound, three weapons, purchases, upgrades, power-ups, escalating rounds, pause/settings, death/restart, and touch controls. Multiplayer, story quests, barricade repair, special enemy types, two-weapon inventory, saves, and extraction are not part of this basic game.
