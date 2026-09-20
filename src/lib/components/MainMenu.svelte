<script lang="ts">
	import { asset, resolve } from '$app/paths';
	let showManual = $state(false);
	let creditsDialog: HTMLDialogElement;
</script>

<div class="menu">
	<div class="grain" aria-hidden="true"></div>
	<header>
		<a class="identity" href={resolve('/')} aria-label="Dead Signal home"
			><svg viewBox="0 0 34 34" aria-hidden="true"
				><path d="M5 4h24v26H5zM1 11h32M1 23h32M12 1v32M23 1v32" /><path
					d="m9 25 7-17 3 12 6-11"
					class="signal"
				/></svg
			><span>DEAD SIGNAL<small>AN INDEPENDENT SURVIVAL GAME</small></span></a
		><span class="mode"><i></i> SOLO / ROUND-BASED</span>
	</header>
	<main>
		<section class="intro">
			<div class="eyebrow"><span class="line"></span> THE WORLD WENT QUIET. THEY DIDN’T.</div>
			<h1>DEAD<br /><span>SIGNAL</span><b aria-hidden="true">.</b></h1>
			<p class="tagline">No extraction.<br />Just one more round.</p>
			<p class="description">
				A first-person fight against the inevitable. Hold off the horde, turn kills into better
				firepower, and see how long you last.
			</p>
			<a class="primary deploy" href={resolve('/game')}>PLAY SOLO <span>↗</span></a>
			<div class="secondary-actions">
				<button
					class="manual-button"
					aria-expanded={showManual}
					onclick={() => (showManual = !showManual)}
					><span>+</span> {showManual ? 'CLOSE FIELD MANUAL' : 'HOW TO SURVIVE'}</button
				>
				<button
					class="manual-button"
					aria-haspopup="dialog"
					aria-controls="game-credits"
					onclick={() => {
						creditsDialog.showModal();
						creditsDialog.scrollTop = 0;
					}}>CREDITS</button
				>
			</div>
			<div class="system-note">
				<span class="tiny-cross">+</span> KEYBOARD + MOUSE RECOMMENDED <span class="sep">/</span> TOUCH
				SUPPORTED
			</div>
		</section>
		<section class="deployment" aria-label="Blackwater Depot map">
			<div class="map-header"><span>YOUR NEXT LAST STAND</span><span>MAP / 001</span></div>
			<div class="scene-art">
				<svg
					viewBox="0 0 620 440"
					role="img"
					aria-label="An abandoned industrial depot under a pale moon, with a lit quarantine gate and rail tracks disappearing into the mist"
				>
					<defs
						><linearGradient id="sky" x2="0" y2="1"
							><stop stop-color="#32474c" /><stop offset="1" stop-color="#7a8274" /></linearGradient
						><linearGradient id="yard" x2="0" y2="1"
							><stop stop-color="#344444" /><stop offset="1" stop-color="#111e23" /></linearGradient
						><linearGradient id="haze" x2="0" y2="1"
							><stop stop-color="#bcb994" stop-opacity="0" /><stop
								offset=".5"
								stop-color="#bcb994"
								stop-opacity=".23"
							/><stop offset="1" stop-color="#bcb994" stop-opacity="0" /></linearGradient
						><radialGradient id="lamp"
							><stop stop-color="#ffcb6f" stop-opacity=".6" /><stop
								offset="1"
								stop-color="#efb860"
								stop-opacity="0"
							/></radialGradient
						><pattern id="windows" width="28" height="34" patternUnits="userSpaceOnUse"
							><rect
								width="13"
								height="19"
								x="7"
								y="8"
								fill="#758276"
								fill-opacity=".26"
							/></pattern
						></defs
					>
					<rect width="620" height="440" fill="url(#sky)" /><circle
						cx="436"
						cy="73"
						r="32"
						fill="#cbd0b1"
						opacity=".8"
					/><circle cx="436" cy="73" r="49" fill="#d6d5b3" opacity=".05" />
					<path
						d="M0 146 52 135 52 101 67 101 67 135 138 131 138 155 183 151 183 126 252 126 252 151 316 143 316 119 363 119 363 150 430 136 474 150 474 97 486 97 486 151 620 143V270H0Z"
						fill="#30444a"
					/>
					<path d="M310 153V70h9v83m25 0V34h12v122" stroke="#3d5053" stroke-width="9" /><path
						d="M334 38q-19-36-56-26t-47-4"
						fill="none"
						stroke="#5a6a67"
						stroke-width="24"
						opacity=".35"
					/>
					<path d="m0 180 115-52 108 47v160H0Z" fill="#24373b" /><path
						d="m0 177 115-55 113 48-7 10-106-43L0 190"
						fill="#192d32"
					/><path d="M16 189h190v93H16Z" fill="url(#windows)" /><rect
						x="78"
						y="245"
						width="73"
						height="73"
						fill="#16282c"
					/><path d="M88 245v70m15-70v70m15-70v70m15-70v70" stroke="#40504d" />
					<path d="m439 203 91-35 90 30v145H439Z" fill="#26383a" /><path
						d="m432 202 96-42 92 31v14l-91-30-95 39Z"
						fill="#1a2b30"
					/><path d="M447 217h170v59H447Z" fill="url(#windows)" />
					<path d="M0 305 301 254 620 315V440H0Z" fill="url(#yard)" /><path
						d="M264 279 197 440M279 279 242 440M341 279 390 440M351 279 437 440"
						stroke="#839083"
						stroke-width="3"
						opacity=".55"
					/><path
						d="m245 327 126 1m-134 19 145 1m-157 29 180 2m-193 34 214 2"
						stroke="#46514b"
						stroke-width="6"
					/>
					<path d="M222 215h196v77H222Z" fill="#2b3a39" /><path
						d="M233 226h173v56H233Z"
						fill="#172a2e"
					/><path
						d="M240 226v56m16-56v56m16-56v56m16-56v56m16-56v56m16-56v56m16-56v56m16-56v56m16-56v56m16-56v56m16-56v56"
						stroke="#667064"
						stroke-width="2"
					/><rect x="264" y="207" width="109" height="23" fill="#9d8560" /><text
						x="319"
						y="223"
						fill="#202c2b"
						font-family="monospace"
						font-weight="bold"
						font-size="11"
						text-anchor="middle">BLACKWATER</text
					>
					<path
						d="M202 293V148h43M423 298V151h-40"
						fill="none"
						stroke="#192d31"
						stroke-width="6"
					/><path d="M225 149h25m128 3h23" stroke="#f0c47e" stroke-width="4" /><ellipse
						cx="237"
						cy="202"
						rx="65"
						ry="80"
						fill="url(#lamp)"
					/><ellipse cx="390" cy="206" rx="64" ry="78" fill="url(#lamp)" />
					<path d="m43 336 62-17 62 16v51l-68 19-56-18Z" fill="#263d40" /><path
						d="m44 336 55 18 68-19m-68 19v51"
						fill="none"
						stroke="#52605a"
					/><path d="m56 344 0 44m30-34v43m24-44v44m34-49v39" stroke="#465953" stroke-width="3" />
					<path d="m486 336 62-13 50 26v57l-61 18-51-23Z" fill="#23383c" /><path
						d="m486 336 51 25 61-12m-61 12v63"
						fill="none"
						stroke="#53635a"
					/>
					<path
						d="M0 187q250 51 620-34M0 165q230 45 620-42"
						fill="none"
						stroke="#1b3034"
						stroke-width="2"
					/>
					<rect y="220" width="620" height="150" fill="url(#haze)" />
					<g fill="#102027"
						><circle cx="316" cy="303" r="8" /><path
							d="m309 312-5 28 7 2-2 32h7l4-28 4 28h6l-1-34 4-7-7-23Z"
						/><path d="m308 315-16 18-2 14 6 1 5-13 11-10m15-10 16 11 7 14-6 2-9-11-12-7" /></g
					>
					<path d="M0 436 620 400v40H0Z" fill="#111c20" opacity=".7" />
				</svg>
				<div class="image-label"><span class="live-dot"></span> QUARANTINE IN EFFECT</div>
				<span class="coordinate">51° 28′ N<br />00° 07′ W</span>
			</div>
			<div class="map-info">
				<div>
					<span class="eyebrow">CONTAINMENT ZONE</span>
					<h2>BLACKWATER DEPOT</h2>
					<p>One abandoned rail yard. An unending horde.</p>
				</div>
				<span class="map-number">01</span>
			</div>
			<div class="map-features">
				<span>FIRST-PERSON</span><span>IN-WORLD UPGRADES</span><span>ENDLESS WAVES</span>
			</div>
		</section>
	</main>
	{#if showManual}
		<section class="manual" aria-label="Field manual">
			<div>
				<span class="eyebrow">FIELD MANUAL</span>
				<h2>LIVE. EARN. REPEAT.</h2>
			</div>
			<article>
				<h3>Keep a way out</h3>
				<p>
					WASD to move, mouse to look. Hold Shift to sprint. Don’t let the horde cut off your
					escape.
				</p>
			</article>
			<article>
				<h3>Spend to survive</h3>
				<p>
					Hits and kills earn points. Press E near weapons, the gate, and machines to buy. Purchases
					do not pause combat.
				</p>
			</article>
			<article>
				<h3>Make it count</h3>
				<p>
					Left click fires. Right click aims. R reloads; V strikes with melee. Headshots reward
					precision. Escape pauses the run.
				</p>
			</article>
		</section>
	{/if}
	<footer>
		<span><i></i> OFFLINE-READY GAMEPLAY · NO ACCOUNT REQUIRED</span><span
			>DEATH IS THE ONLY ENDING.</span
		><span class="version">DEAD SIGNAL / 01</span>
	</footer>
</div>

<dialog
	id="game-credits"
	class="credits"
	{@attach (element) => {
		creditsDialog = element;
	}}
	aria-labelledby="credits-title"
>
	<div class="credits-heading">
		<div>
			<span class="eyebrow">DEAD SIGNAL / ACKNOWLEDGEMENTS</span>
			<h2 id="credits-title">CREDITS</h2>
		</div>
		<form method="dialog">
			<button class="credits-close" aria-label="Close credits"
				>CLOSE <span aria-hidden="true">×</span></button
			>
		</form>
	</div>
	<div class="credits-content">
		<p class="credits-intro">The people and recordings behind the sounds of Blackwater Depot.</p>
		<ul class="credit-list">
			<li>
				<span class="eyebrow">01 / GUNSHOT RECORDINGS</span>
				<h3>The Free Firearm Sound Library</h3>
				<p class="credit-authors">Ben Jaszczak, Brian Nelson, Kevin Heras &amp; Matthew Nanney</p>
				<p>
					Recorded 1911, AR-15/M4 and Winchester Model 12 reports. Adapted for the game with
					individual shot trims, mono conversion, filtering, level adjustments and fades.
				</p>
				<div class="credit-links">
					<a
						href="https://opengameart.org/content/the-free-firearm-sound-library"
						target="_blank"
						rel="noopener noreferrer">Original recordings ↗</a
					>
					<a
						href="https://creativecommons.org/publicdomain/zero/1.0/"
						target="_blank"
						rel="noopener noreferrer">CC0 1.0 ↗</a
					>
				</div>
			</li>
			<li>
				<span class="eyebrow">02 / WEAPON HANDLING</span>
				<h3>Handling Guns / Guns by Gary</h3>
				<p class="credit-authors">
					<a href="http://fossilrecords.net/" target="_blank" rel="noopener noreferrer">Gary ↗</a>
					<span> · Recorded for PARPG; shared by qubodup.</span>
				</p>
				<p>
					Magazine, slide, bolt, shell-loading and dry-fire recordings. Trimmed, filtered,
					level-adjusted and retimed for the game. Rifle handling and shotgun pump layers use
					adapted mechanical textures rather than exact-model action recordings.
				</p>
				<p>
					The adapted mechanical clips retain the Creative Commons Attribution–ShareAlike 3.0
					Unported license.
				</p>
				<div class="credit-links">
					<a
						href="https://opengameart.org/content/handling-guns"
						target="_blank"
						rel="noopener noreferrer">Original recordings ↗</a
					>
					<a
						href="https://creativecommons.org/licenses/by-sa/3.0/"
						target="_blank"
						rel="noopener noreferrer">CC-BY-SA 3.0 ↗</a
					>
				</div>
			</li>
		</ul>
		<div class="credits-notes">
			<a href={asset('/assets/audio/weapons/CREDITS.txt')} target="_blank" rel="noopener noreferrer"
				>Full audio credits &amp; source mappings ↗</a
			>
			<p>Links open in a new tab. Original creators do not endorse this game.</p>
		</div>
	</div>
</dialog>

<style>
	.menu {
		min-height: 100dvh;
		position: relative;
		isolation: isolate;
		background: radial-gradient(ellipse at 75% 35%, #2b3b3c 0, transparent 55%), var(--ink);
		padding: 0 clamp(24px, 5.3vw, 90px);
		overflow: hidden;
	}
	.grain {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.045;
		z-index: -1;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23fff' filter='url(%23n)' opacity='.7' d='M0 0h180v180H0z'/%3E%3C/svg%3E");
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30px 0;
		border-bottom: 1px solid #b5bbab24;
	}
	.identity {
		display: flex;
		gap: 12px;
		align-items: center;
		color: var(--paper);
		text-decoration: none;
		font: 22px var(--font-display);
		letter-spacing: 0.055em;
	}
	.identity svg {
		width: 32px;
		height: 32px;
		fill: none;
		stroke: #b7ac88;
		stroke-width: 0.8;
	}
	.identity .signal {
		stroke: #e0b46e;
		stroke-width: 2;
	}
	.identity small {
		display: block;
		font: 7px var(--font-mono);
		letter-spacing: 0.18em;
		color: var(--muted);
		margin-top: 5px;
	}
	.mode {
		font: 9px var(--font-mono);
		letter-spacing: 0.15em;
		color: var(--sand);
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.mode i,
	footer i {
		width: 5px;
		height: 5px;
		background: #a9b892;
		display: inline-block;
	}
	main {
		max-width: 1500px;
		margin: auto;
		display: grid;
		grid-template-columns: 0.9fr 1.1fr;
		gap: 6vw;
		padding: 65px 0 60px;
		align-items: center;
		min-height: calc(100dvh - 160px);
	}
	.intro > .eyebrow {
		font-size: 8px;
		letter-spacing: 0.16em;
		display: flex;
		align-items: center;
		gap: 10px;
		white-space: nowrap;
	}
	.line {
		display: inline-block;
		width: 26px;
		height: 1px;
		background: var(--amber);
	}
	h1 {
		font: clamp(88px, 9.5vw, 155px)/0.84 var(--font-display);
		letter-spacing: -0.015em;
		margin: 33px 0 26px;
		position: relative;
		width: fit-content;
	}
	h1 span {
		color: var(--amber);
	}
	h1 b {
		color: var(--rust-light);
		font-weight: normal;
	}
	.tagline {
		font-size: clamp(20px, 2.1vw, 28px);
		line-height: 1.35;
		margin: 0 0 18px;
		font-weight: 350;
		letter-spacing: -0.015em;
	}
	.description {
		color: var(--muted);
		max-width: 345px;
		font-size: 13px;
		line-height: 1.85;
		margin-bottom: 30px;
	}
	.deploy {
		width: 100%;
		max-width: 350px;
	}
	.secondary-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		column-gap: 28px;
	}
	.manual-button {
		background: transparent;
		border: 0;
		color: var(--sand);
		font: 10px var(--font-mono);
		letter-spacing: 0.1em;
		padding: 22px 0;
		min-height: 44px;
		cursor: pointer;
	}
	.manual-button:hover {
		color: var(--paper);
	}
	.manual-button span {
		margin-right: 10px;
		font-size: 16px;
	}
	.system-note {
		color: #94a099;
		font: 8px var(--font-mono);
		letter-spacing: 0.055em;
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
	}
	.tiny-cross {
		color: var(--amber);
		font-size: 15px;
	}
	.sep {
		color: #53645f;
	}
	.deployment {
		border: 1px solid #b7c0aa30;
		background: #122023;
		transform: rotate(-1deg);
		box-shadow: 0 20px 70px #0003;
	}
	.map-header {
		display: flex;
		justify-content: space-between;
		padding: 15px 20px;
		font: 8px var(--font-mono);
		letter-spacing: 0.13em;
		color: var(--sand);
		border-bottom: 1px solid #b7c0aa30;
	}
	.scene-art {
		position: relative;
		overflow: hidden;
	}
	.scene-art svg {
		width: 100%;
		height: auto;
		display: block;
	}
	.image-label {
		position: absolute;
		top: 18px;
		left: 18px;
		color: #e2d6b8;
		font: 8px var(--font-mono);
		letter-spacing: 0.12em;
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 7px 9px;
		background: #172626aa;
		border: 1px solid #d1bc8b44;
	}
	.live-dot {
		width: 4px;
		height: 4px;
		background: var(--amber);
	}
	.coordinate {
		position: absolute;
		bottom: 17px;
		right: 17px;
		text-align: right;
		font: 9px/1.5 var(--font-mono);
		color: #a7b1a3;
	}
	.map-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24px 25px;
		border-top: 1px solid #b7c0aa30;
	}
	.map-info .eyebrow {
		font-size: 8px;
	}
	.map-info h2 {
		font: clamp(23px, 2.5vw, 34px) var(--font-display);
		letter-spacing: 0.035em;
		margin: 7px 0;
	}
	.map-info p {
		font-size: 11px;
		margin: 0;
		color: var(--muted);
	}
	.map-number {
		font: 50px var(--font-display);
		color: #52645c;
	}
	.map-features {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		padding: 16px 25px;
		background: #0c171b66;
		border-top: 1px solid #b7c0aa25;
		font: 7px var(--font-mono);
		color: #a3aca0;
		letter-spacing: 0.08em;
	}
	.map-features span::before {
		content: '+';
		margin-right: 6px;
		color: var(--amber);
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		border-top: 1px solid #b5bbab24;
		padding: 23px 0;
		font: 8px var(--font-mono);
		letter-spacing: 0.08em;
		color: #9ba79e;
	}
	footer i {
		margin-right: 7px;
		width: 4px;
		height: 4px;
	}
	.version {
		color: #63746e;
	}
	.manual {
		display: grid;
		grid-template-columns: 1.2fr 1fr 1fr 1fr;
		gap: 30px;
		border-top: 1px solid #b5bbab24;
		padding: 35px 0;
	}
	.manual h2 {
		font: 30px var(--font-display);
		margin: 15px 0;
	}
	.manual h3 {
		font-size: 13px;
		color: var(--sand);
		margin: 0 0 10px;
	}
	.manual p {
		font-size: 12px;
		color: var(--muted);
		line-height: 1.8;
		margin: 0;
	}
	:global(body:has(#game-credits[open])) {
		overflow: hidden;
	}
	.credits {
		width: min(640px, calc(100vw - 32px));
		max-height: calc(100dvh - 48px);
		margin: auto;
		padding: 0;
		border: 1px solid #b5bbab40;
		border-top: 3px solid var(--amber);
		color: var(--paper);
		background: var(--ink);
		box-shadow: 0 24px 90px #0009;
		overscroll-behavior: contain;
	}
	.credits::backdrop {
		background: #060c10d9;
	}
	.credits-heading {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 24px clamp(20px, 4vw, 32px);
		border-bottom: 1px solid #b5bbab24;
		background: var(--ink);
	}
	.credits .eyebrow {
		color: var(--sand);
		font: 10px/1.6 var(--font-mono);
		letter-spacing: 0.1em;
	}
	.credits h2 {
		margin: 8px 0 0;
		font: 40px/1 var(--font-display);
		letter-spacing: 0.02em;
	}
	.credits-close {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		padding: 10px 12px;
		border: 1px solid #b5bbab50;
		color: var(--sand);
		background: transparent;
		font: 11px var(--font-mono);
		cursor: pointer;
	}
	.credits-close:hover {
		color: var(--ink);
		background: var(--amber);
	}
	.credits-close span {
		font-size: 20px;
	}
	.credits-content {
		padding: 0 clamp(20px, 4vw, 32px) 28px;
	}
	.credits p {
		color: var(--muted);
		font-size: 14px;
		line-height: 1.7;
		margin: 12px 0;
	}
	.credits .credits-intro {
		margin: 24px 0;
	}
	.credit-list {
		padding: 0;
		margin: 0;
		list-style: none;
	}
	.credit-list li {
		padding: 24px 0;
		border-top: 1px solid #b5bbab24;
	}
	.credits h3 {
		margin: 10px 0;
		font-size: 20px;
		font-weight: 500;
		line-height: 1.4;
	}
	.credits .credit-authors {
		color: var(--paper);
	}
	.credit-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 24px;
	}
	.credits a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--amber);
		font-size: 13px;
		line-height: 1.6;
		text-underline-offset: 4px;
	}
	.credits a:hover {
		color: var(--paper);
	}
	.credits-notes {
		padding-top: 16px;
		border-top: 1px solid #b5bbab24;
	}
	.credits-notes p {
		font-size: 12px;
	}
	@media (min-width: 1700px) {
		main {
			gap: 100px;
		}
		.intro h1 {
			font-size: 170px;
		}
		.description {
			font-size: 16px;
		}
	}
	@media (max-width: 850px) {
		main {
			gap: 35px;
		}
		.intro > .eyebrow {
			white-space: normal;
			line-height: 1.6;
		}
		.system-note {
			flex-wrap: wrap;
			font-size: 7px;
		}
		.map-info {
			padding: 20px 15px;
		}
		.map-info p {
			line-height: 1.5;
		}
		.map-number {
			display: none;
		}
		.map-features {
			flex-wrap: wrap;
			padding: 14px 15px;
			gap: 12px;
		}
		.manual {
			grid-template-columns: 1fr 1fr;
		}
		.mode {
			font-size: 8px;
		}
	}
	@media (max-width: 650px) {
		header {
			padding: 23px 0;
		}
		.identity {
			font-size: 19px;
		}
		.mode {
			display: none;
		}
		main {
			grid-template-columns: 1fr;
			padding-top: 45px;
			gap: 45px;
		}
		.intro {
			text-align: left;
		}
		h1 {
			font-size: 110px;
		}
		.description {
			max-width: 380px;
		}
		.deploy {
			max-width: none;
		}
		.tagline {
			font-size: 24px;
		}
		.deployment {
			transform: none;
		}
		.scene-art svg {
			max-height: 350px;
			object-fit: cover;
		}
		.map-info h2 {
			font-size: 28px;
		}
		.map-features {
			flex-wrap: nowrap;
		}
		.manual {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		footer {
			flex-wrap: wrap;
			line-height: 1.5;
		}
		footer > span:nth-child(2) {
			display: none;
		}
	}
</style>
