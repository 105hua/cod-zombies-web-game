<script lang="ts">
	import type { HudSnapshot } from '$lib/game/types';
	let { state }: { state: HudSnapshot } = $props();
</script>

<div class="hud" class:down={state.health < 35}>
	<div class="damage" style:opacity={state.damageFlash}></div>
	<div class="topline"><span>BLACKWATER DEPOT</span><span>SOLO SURVIVAL</span></div>
	<section class="round" aria-label="Round status">
		<span class="eyebrow">ROUND</span>
		<strong>{String(state.round).padStart(2, '0')}</strong>
		<span>{state.intermission > 0 ? 'PREPARE YOURSELF' : `${state.remaining} REMAINING`}</span>
	</section>
	{#if state.intermission > 0}
		<div class="wave">
			<span>{state.round === 1 ? 'THE SIGNAL IS DEAD.' : 'THEY KEEP COMING.'}</span>
			<h2>ROUND {state.round}</h2>
			<p>Incoming in {Math.ceil(state.intermission)} seconds</p>
		</div>
	{/if}
	<div class="crosshair" class:hit={state.hit > 0}><i></i><i></i><i></i><i></i></div>
	{#if state.hit > 0}<div class="hitmarker">×</div>{/if}
	<div class="notices" aria-live="polite">
		{#if state.message}<p class="notice">{state.message}</p>{/if}
		{#if state.prompt}<p class="prompt"><kbd>E</kbd> {state.prompt}</p>{/if}
		{#if state.reloading > 0}<p class="action">RELOADING</p>
		{:else if state.magazine === 0}<p class="action">
				{state.reserve > 0 ? 'R — RELOAD' : 'OUT OF AMMO · V TO MELEE'}
			</p>{/if}
	</div>
	<div class="effects">
		{#if state.doublePoints > 0}<span>2× POINTS <b>{Math.ceil(state.doublePoints)}s</b></span>{/if}
		{#if state.instakill > 0}<span>INSTA-KILL <b>{Math.ceil(state.instakill)}s</b></span>{/if}
	</div>
	<div class="bottomline">
		<section class="score">
			<span class="eyebrow">POINTS</span><strong>{state.points.toLocaleString()}</strong><small
				>{state.kills} ELIMINATIONS</small
			>
		</section>
		<section class="vitals" aria-label="Player health">
			<div class="health-label">
				<span>VITALS <b>{Math.ceil(state.health)} / {state.maxHealth}</b></span><span
					>{state.vitality ? 'VITALITY +' : 'SURVIVOR'}</span
				>
			</div>
			<div class="bar health">
				<i style:width={`${(state.health / state.maxHealth) * 100}%`}></i>
			</div>
			<div class="bar stamina"><i style:width={`${state.stamina}%`}></i></div>
			<small>SHIFT SPRINT <span>V MELEE</span></small>
		</section>
		<section class="ammo" aria-label="Weapon ammunition">
			<span class="eyebrow">{state.upgraded ? 'OVERCHARGED · ' : ''}{state.weaponName}</span>
			<div><strong>{state.magazine}</strong><span>/ {state.reserve}</span></div>
			<small>R RELOAD <span>RMB AIM</span></small>
		</section>
	</div>
</div>

<style>
	.hud {
		position: absolute;
		inset: 0;
		pointer-events: none;
		color: #f1eddf;
		text-shadow: 0 2px 8px #000;
		font-family: var(--font-mono);
	}
	.topline {
		display: flex;
		justify-content: space-between;
		position: absolute;
		top: 26px;
		left: 32px;
		right: 105px;
		font-size: 10px;
		letter-spacing: 0.18em;
		color: #d1d4c5;
	}
	.round {
		position: absolute;
		left: 32px;
		top: 76px;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.eyebrow {
		font-size: 11px;
		letter-spacing: 0.16em;
		color: var(--sand);
	}
	.round strong {
		font: 76px/0.95 var(--font-display);
		color: var(--rust-light);
	}
	.round > span:last-child {
		font-size: 10px;
		letter-spacing: 0.1em;
	}
	.wave {
		position: absolute;
		top: 24%;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		width: 90%;
	}
	.wave > span {
		font-size: 10px;
		letter-spacing: 0.3em;
		color: var(--sand);
	}
	.wave h2 {
		font: clamp(36px, 5vw, 64px)/1.1 var(--font-display);
		letter-spacing: 0.05em;
		margin: 10px 0;
	}
	.wave p {
		font-size: 12px;
		margin: 0;
		color: #d1d4c5;
	}
	.crosshair {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 22px;
		height: 22px;
		transform: translate(-50%, -50%);
	}
	.crosshair i {
		position: absolute;
		background: #ececdfba;
		box-shadow: 0 0 2px #000;
	}
	.crosshair i:nth-child(1),
	.crosshair i:nth-child(2) {
		width: 2px;
		height: 5px;
		left: 10px;
	}
	.crosshair i:nth-child(2) {
		bottom: 0;
	}
	.crosshair i:nth-child(3),
	.crosshair i:nth-child(4) {
		height: 2px;
		width: 5px;
		top: 10px;
	}
	.crosshair i:nth-child(4) {
		right: 0;
	}
	.crosshair.hit {
		opacity: 0;
	}
	.hitmarker {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -52%);
		font-size: 35px;
		color: #e6bf78;
	}
	.notices {
		position: absolute;
		bottom: 25%;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		width: min(90%, 600px);
	}
	.notice {
		font-size: 13px;
		color: #efc985;
	}
	.prompt {
		padding: 12px 20px;
		background: #0c1418d9;
		border: 1px solid #a69b7155;
		font-size: 13px;
	}
	kbd {
		display: inline-block;
		border: 1px solid #c0bba3;
		padding: 2px 6px;
		margin-right: 8px;
		font: inherit;
	}
	.action {
		font-size: 11px;
		letter-spacing: 0.2em;
	}
	.effects {
		position: absolute;
		top: 80px;
		right: 32px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 11px;
		color: #e9c77c;
	}
	.effects span {
		padding: 8px 12px;
		border-right: 2px solid #e9c77c;
		background: #121b1caa;
	}
	.effects b {
		margin-left: 14px;
	}
	.bottomline {
		position: absolute;
		bottom: 30px;
		left: 32px;
		right: 32px;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 20px;
	}
	.score,
	.ammo {
		min-width: 150px;
	}
	.score {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.score strong {
		font: 38px/1 var(--font-display);
		letter-spacing: 0.03em;
	}
	small {
		font-size: 9px;
		letter-spacing: 0.08em;
		color: #c2c7bb;
	}
	.vitals {
		width: 260px;
	}
	.health-label {
		display: flex;
		justify-content: space-between;
		font-size: 9px;
		margin-bottom: 8px;
		color: #cccbbd;
	}
	.health-label b {
		color: #fff;
		margin-left: 8px;
	}
	.bar {
		background: #151d1dc9;
		height: 6px;
		border: 1px solid #e5dfc02a;
	}
	.bar i {
		display: block;
		height: 100%;
		background: #ced7bd;
	}
	.stamina {
		height: 3px;
		margin: 5px 0 10px;
		border: 0;
	}
	.stamina i {
		background: #b5a26e;
	}
	.vitals small {
		display: flex;
		justify-content: space-between;
	}
	.ammo {
		text-align: right;
	}
	.ammo strong {
		font: 54px/1.1 var(--font-display);
	}
	.ammo div > span {
		color: #c4c8b9;
		margin-left: 12px;
		font-size: 20px;
	}
	.ammo small span {
		margin-left: 16px;
	}
	.damage {
		position: absolute;
		inset: 0;
		box-shadow: inset 0 0 140px 60px #bb231d;
	}
	.down .health i {
		background: #d86b57;
	}
	@media (max-width: 650px) {
		.topline {
			left: 18px;
			top: 20px;
			font-size: 8px;
		}
		.topline span:last-child {
			display: none;
		}
		.round {
			left: 18px;
			top: 52px;
		}
		.round strong {
			font-size: 52px;
		}
		.bottomline {
			left: 18px;
			right: 18px;
			bottom: 18px;
			gap: 12px;
		}
		.score,
		.ammo {
			min-width: 90px;
		}
		.score strong {
			font-size: 28px;
		}
		.ammo strong {
			font-size: 38px;
		}
		.ammo div > span {
			font-size: 14px;
		}
		.vitals {
			position: absolute;
			bottom: 90px;
			width: 170px;
			left: 0;
		}
		.vitals small,
		.ammo small {
			display: none;
		}
		.eyebrow {
			font-size: 9px;
		}
		.effects {
			right: 18px;
			font-size: 9px;
		}
		.notices {
			bottom: 34%;
		}
		.prompt {
			font-size: 11px;
		}
		.wave {
			top: 20%;
		}
	}
</style>
