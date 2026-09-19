<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Game } from '$lib/game/core/Game';
	import { createGameUI } from '$lib/stores/game-ui';
	import HUD from './HUD.svelte';

	const ui = createGameUI();
	let game = $state<Game>();
	let sensitivity = $state(1);
	let volume = $state(0.35);
	let touchMode = $state(false);
	let lookPointer: { id: number; x: number; y: number } | undefined;
	let movePointer: { id: number; x: number; y: number } | undefined;
	const hud = $derived($ui.hud);
	const phase = $derived(hud?.phase);
	const overlay = $derived($ui.status !== 'ready' || phase !== 'playing');

	$effect(() => {
		game?.setSettings({ sensitivity, volume });
	});

	function mountGame(canvas: HTMLCanvasElement) {
		let cancelled = false;
		let instance: Game | undefined;
		touchMode = window.matchMedia('(pointer: coarse)').matches;
		async function initialise() {
			try {
				// Keep the browser-only renderer out of the SSR and main-menu bundles.
				const runtime = await import('$lib/game/core/Game');
				if (cancelled) return;
				instance = new runtime.Game(canvas, (snapshot) => {
					if (!cancelled) ui.set({ status: 'ready', hud: snapshot });
				});
				await instance.start();
				if (!cancelled) game = instance;
			} catch (error) {
				instance?.dispose();
				if (!cancelled) {
					console.error('Game initialisation failed', error);
					ui.set({
						status: 'error',
						message:
							'The 3D engine could not start. Enable hardware acceleration and WebGL in your browser, then reload.'
					});
				}
			}
		}
		void initialise();
		return () => {
			cancelled = true;
			instance?.dispose();
			game = undefined;
		};
	}

	function start() {
		game?.begin(touchMode);
	}
	function resume() {
		game?.resume(touchMode);
	}
	function touchLook(event: PointerEvent) {
		if (lookPointer?.id !== event.pointerId) return;
		game?.look(event.clientX - lookPointer.x, event.clientY - lookPointer.y);
		lookPointer.x = event.clientX;
		lookPointer.y = event.clientY;
	}
	function move(event: PointerEvent) {
		if (movePointer?.id !== event.pointerId) return;
		game?.setTouchMove(
			Math.max(-1, Math.min(1, (event.clientX - movePointer.x) / 40)),
			Math.max(-1, Math.min(1, (movePointer.y - event.clientY) / 40))
		);
	}
	function stopMove() {
		movePointer = undefined;
		game?.setTouchMove(0, 0);
	}
</script>

<div class="game-frame">
	<canvas {@attach mountGame} aria-label="3D survival game world" tabindex="0"></canvas>
	{#if hud && phase !== 'ready'}<HUD state={hud} />{/if}
	{#if !overlay}
		<button class="pause-button" aria-label="Pause game" onclick={() => game?.pause()}
			>Ⅱ <span>ESC</span></button
		>
		{#if touchMode}
			<div class="touch-controls">
				<button
					class="look-zone"
					aria-label="Drag to look"
					onpointerdown={(event) => {
						event.currentTarget.setPointerCapture(event.pointerId);
						lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
					}}
					onpointermove={touchLook}
					onpointerup={() => (lookPointer = undefined)}
					onpointercancel={() => (lookPointer = undefined)}
				></button>
				<button
					class="move-zone"
					aria-label="Drag to move"
					onpointerdown={(event) => {
						event.currentTarget.setPointerCapture(event.pointerId);
						movePointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
					}}
					onpointermove={move}
					onpointerup={stopMove}
					onpointercancel={stopMove}>MOVE</button
				>
				<div class="touch-actions">
					<button
						aria-label="Fire weapon"
						onpointerdown={(event) => {
							event.currentTarget.setPointerCapture(event.pointerId);
							game?.setFiring(true);
						}}
						onpointerup={() => game?.setFiring(false)}
						onpointercancel={() => game?.setFiring(false)}>FIRE</button
					>
					<button onclick={() => game?.reload()}>RELOAD</button><button
						onclick={() => game?.interact()}>USE</button
					><button onclick={() => game?.melee()}>MELEE</button>
				</div>
			</div>
		{/if}
	{:else}
		<div class="overlay">
			<div class="overlay-top">
				<a href={resolve('/')} class="wordmark">DEAD SIGNAL<span>SOLO SURVIVAL</span></a><span
					class="map-tag">BWD / RESTRICTED ZONE</span
				>
			</div>
			<section class="panel" aria-label="Game menu">
				{#if $ui.status === 'loading'}
					<span class="eyebrow">ESTABLISHING CONNECTION</span>
					<h1>ENTERING<br />THE DEAD ZONE.</h1>
					<p role="status">Loading Blackwater Depot…</p>
					<div class="loading-track"></div>
				{:else if $ui.status === 'error'}
					<span class="eyebrow">CONNECTION FAILED</span>
					<h1>NO SIGNAL.</h1>
					<p role="alert">{$ui.message}</p>
					<button class="primary" onclick={() => window.location.reload()}
						>RELOAD GAME <span>↗</span></button
					><a class="text-link" href={resolve('/')}>Return to menu</a>
				{:else if phase === 'ready'}
					<span class="eyebrow">DEPLOYMENT BRIEF / SOLO</span>
					<h1>BLACKWATER<br /><em>DEPOT.</em></h1>
					<p>
						The last train never left. Neither did they.<br />Hold the yard. Buy yourself another
						round.
					</p>
					<div class="brief">
						<span><b>500</b> STARTING POINTS</span><span><b>M1911</b> SIDEARM</span><span
							><b>∞</b> ROUNDS</span
						>
					</div>
					<button class="primary" onclick={start} disabled={!game}
						>BEGIN SURVIVAL <span>→</span></button
					>
					<p class="capture-note">
						{touchMode
							? 'Touch controls enabled. Drag the right side to look.'
							: 'Click to capture your mouse. Escape releases it and pauses.'}
					</p>
				{:else if phase === 'paused'}
					<span class="eyebrow">SIGNAL INTERRUPTED / ROUND {hud?.round}</span>
					<h1>HOLD YOUR<br /><em>GROUND.</em></h1>
					<p role="status">Game paused. The horde can wait.</p>
					{#if hud?.message}<p class="feedback">{hud.message}</p>{/if}
					<div class="settings">
						<label for="sensitivity"
							>Mouse sensitivity <output>{sensitivity.toFixed(1)}×</output></label
						><input
							id="sensitivity"
							type="range"
							min="0.3"
							max="2.5"
							step="0.1"
							bind:value={sensitivity}
						/><label for="volume">Sound volume <output>{Math.round(volume * 100)}%</output></label
						><input id="volume" type="range" min="0" max="1" step="0.05" bind:value={volume} />
					</div>
					<button class="primary" onclick={resume}>RESUME SURVIVAL <span>→</span></button><a
						class="text-link"
						href={resolve('/')}>End run & return to menu</a
					>
				{:else if phase === 'dead' && hud}
					<span class="eyebrow">TRANSMISSION LOST</span>
					<h1>NO ONE<br /><em>IS COMING.</em></h1>
					<p>You held out. The depot remembers.</p>
					<div class="results">
						<div><strong>{hud.round}</strong><span>ROUND REACHED</span></div>
						<div><strong>{hud.kills}</strong><span>ELIMINATIONS</span></div>
						<div>
							<strong
								>{Math.floor(hud.elapsed / 60)}:{String(Math.floor(hud.elapsed % 60)).padStart(
									2,
									'0'
								)}</strong
							><span>TIME SURVIVED</span>
						</div>
					</div>
					<button class="primary" onclick={start}>TRY AGAIN <span>↻</span></button><a
						class="text-link"
						href={resolve('/')}>Return to menu</a
					>
				{/if}
			</section>
			{#if $ui.status === 'ready' && phase !== 'dead'}
				<aside class="field-guide">
					<span class="eyebrow">FIELD MANUAL</span>
					<h2>KEEP MOVING.<br />MAKE EVERY SHOT COUNT.</h2>
					<dl>
						<div>
							<dt>W A S D</dt>
							<dd>Move</dd>
						</div>
						<div>
							<dt>MOUSE</dt>
							<dd>Look · left click fire · right click aim</dd>
						</div>
						<div>
							<dt>SHIFT</dt>
							<dd>Sprint</dd>
						</div>
						<div>
							<dt>R / V</dt>
							<dd>Reload / melee</dd>
						</div>
						<div>
							<dt>E</dt>
							<dd>Buy or interact</dd>
						</div>
						<div>
							<dt>ESC / P</dt>
							<dd>Pause</dd>
						</div>
					</dl>
					<p>
						Earn points from hits and kills. Buy weapons at the wall. Open the north yard for
						Vitality and Overcharge. Collect glowing drops for temporary advantages.
					</p>
				</aside>
			{/if}
			<div class="overlay-footer">
				<span>NO EXTRACTION. NO REINFORCEMENTS.</span><span>JUST ONE MORE ROUND.</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.game-frame {
		position: relative;
		width: 100%;
		height: 100dvh;
		min-height: 420px;
		overflow: hidden;
		background: var(--ink);
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
		outline: none;
	}
	canvas:focus-visible {
		outline: 1px solid var(--amber);
		outline-offset: -1px;
	}
	.overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, #0b1418ed 0%, #10191be6 38%, #111b1ca8 100%);
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		align-content: center;
		padding: 100px clamp(24px, 6vw, 100px) 80px;
		gap: 6vw;
		overflow-y: auto;
	}
	.overlay-top {
		position: absolute;
		top: 28px;
		left: clamp(24px, 6vw, 100px);
		right: clamp(24px, 6vw, 100px);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.wordmark {
		font: 24px var(--font-display);
		letter-spacing: 0.05em;
		text-decoration: none;
		color: var(--paper);
	}
	.wordmark span {
		display: block;
		font: 8px var(--font-mono);
		letter-spacing: 0.32em;
		margin-top: 5px;
		color: var(--sand);
	}
	.map-tag {
		font: 10px var(--font-mono);
		color: var(--muted);
		letter-spacing: 0.14em;
	}
	.panel {
		max-width: 560px;
	}
	h1 {
		font: clamp(44px, 5.6vw, 82px)/0.98 var(--font-display);
		letter-spacing: 0.01em;
		margin: 22px 0;
	}
	em {
		font-style: normal;
		color: var(--amber);
	}
	.panel > p {
		color: var(--muted);
		font-size: 14px;
		line-height: 1.7;
	}
	.brief {
		display: flex;
		gap: 26px;
		margin: 26px 0;
		font: 8px var(--font-mono);
		letter-spacing: 0.05em;
		color: var(--muted);
	}
	.brief b {
		display: block;
		font: 22px var(--font-display);
		margin-bottom: 5px;
		color: var(--paper);
	}
	.primary {
		width: min(100%, 360px);
		margin-top: 10px;
	}
	.capture-note {
		font: 10px/1.6 var(--font-mono) !important;
		max-width: 360px;
	}
	.text-link {
		display: block;
		color: var(--muted);
		font-size: 12px;
		width: fit-content;
		margin-top: 20px;
		text-underline-offset: 5px;
	}
	.field-guide {
		align-self: center;
		max-width: 370px;
		border-left: 1px solid #cbb78b38;
		padding-left: 38px;
	}
	.field-guide h2 {
		font: 28px/1.2 var(--font-display);
		letter-spacing: 0.025em;
		margin: 15px 0 25px;
	}
	dl {
		font-size: 12px;
	}
	dl div {
		display: flex;
		align-items: center;
		gap: 20px;
		margin: 14px 0;
	}
	dt {
		min-width: 80px;
		font: 10px var(--font-mono);
		color: var(--sand);
	}
	dd {
		margin: 0;
		color: var(--muted);
	}
	.field-guide p {
		font-size: 12px;
		line-height: 1.8;
		color: var(--muted);
		border-top: 1px solid #cbb78b30;
		padding-top: 20px;
	}
	.overlay-footer {
		position: absolute;
		bottom: 25px;
		left: clamp(24px, 6vw, 100px);
		right: clamp(24px, 6vw, 100px);
		display: flex;
		justify-content: space-between;
		font: 9px var(--font-mono);
		letter-spacing: 0.12em;
		color: var(--muted);
	}
	.pause-button {
		position: absolute;
		right: 24px;
		top: 16px;
		color: var(--paper);
		background: #152023b0;
		border: 1px solid #d0c9b540;
		min-height: 40px;
		padding: 7px 12px;
		cursor: pointer;
		z-index: 3;
	}
	.pause-button span {
		font: 9px var(--font-mono);
		margin-left: 8px;
	}
	.settings {
		max-width: 360px;
		margin: 22px 0;
	}
	.settings label {
		display: flex;
		justify-content: space-between;
		font: 11px var(--font-mono);
		margin-top: 15px;
		color: var(--muted);
	}
	.settings output {
		color: var(--sand);
	}
	.settings input {
		width: 100%;
		margin: 12px 0 0;
		accent-color: var(--amber);
	}
	.results {
		display: flex;
		gap: 35px;
		padding: 20px 0;
		margin: 24px 0;
		border-top: 1px solid #cbb78b38;
		border-bottom: 1px solid #cbb78b38;
	}
	.results strong {
		display: block;
		font: 40px var(--font-display);
	}
	.results span {
		font: 9px var(--font-mono);
		color: var(--muted);
	}
	.loading-track {
		width: 220px;
		height: 2px;
		background: var(--amber);
		margin: 25px 0;
	}
	.feedback {
		color: var(--amber) !important;
	}
	.touch-controls {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.touch-controls button {
		pointer-events: auto;
		touch-action: none;
		user-select: none;
		color: var(--paper);
		background: #10202577;
		border: 1px solid #d0c9b566;
		font: 10px var(--font-mono);
	}
	.look-zone {
		position: absolute;
		left: 45%;
		right: 0;
		top: 60px;
		bottom: 180px;
		background: transparent !important;
		border: 0 !important;
	}
	.move-zone {
		position: absolute;
		left: 25px;
		bottom: 155px;
		width: 90px;
		height: 90px;
		border-radius: 50%;
	}
	.touch-actions {
		position: absolute;
		right: 20px;
		bottom: 140px;
		display: grid;
		grid-template-columns: repeat(2, 60px);
		gap: 8px;
	}
	.touch-actions button {
		min-height: 48px;
	}
	@media (max-width: 760px) {
		.overlay {
			grid-template-columns: 1fr;
			align-content: start;
			padding-top: 120px;
			padding-bottom: 80px;
		}
		.panel {
			max-width: 500px;
		}
		.field-guide {
			border-left: 0;
			border-top: 1px solid #cbb78b38;
			padding: 24px 0 0;
			max-width: 500px;
		}
		.field-guide h2 {
			font-size: 23px;
		}
		.field-guide dl {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0 20px;
		}
		.field-guide dl div {
			display: block;
		}
		.field-guide dd {
			margin-top: 6px;
		}
		.overlay-footer {
			display: none;
		}
		.map-tag {
			font-size: 8px;
		}
		.brief {
			gap: 20px;
		}
	}
	@media (max-height: 650px) and (min-width: 761px) {
		.overlay {
			padding-top: 100px;
			padding-bottom: 30px;
			align-content: start;
		}
		h1 {
			font-size: 48px;
			margin: 14px 0;
		}
		.overlay-footer {
			display: none;
		}
		.field-guide {
			margin-top: 10px;
		}
	}
</style>
