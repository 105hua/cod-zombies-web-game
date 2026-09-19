<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	let { children } = $props();
</script>

<svelte:head
	><link rel="icon" href={favicon} /><meta name="theme-color" content="#121d20" /></svelte:head
>
{@render children()}

<style>
	:global(:root) {
		--ink: #121d20;
		--paper: #e8e6d7;
		--sand: #c9ba95;
		--amber: #d9b475;
		--rust-light: #c8795e;
		--muted: #a7b1a8;
		--font-display: Impact, 'Arial Narrow', 'Franklin Gothic Medium', sans-serif;
		--font-mono: 'Cascadia Mono', 'Courier New', monospace;
		font-family: 'Segoe UI', Arial, sans-serif;
		color: var(--paper);
		background: var(--ink);
		font-synthesis: none;
	}
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
	}
	:global(button),
	:global(input) {
		font: inherit;
	}
	:global(button),
	:global(a),
	:global(input) {
		-webkit-tap-highlight-color: transparent;
	}
	:global(a:focus-visible),
	:global(button:focus-visible),
	:global(input:focus-visible) {
		outline: 2px solid var(--amber);
		outline-offset: 5px;
	}
	:global(button:disabled) {
		opacity: 0.5;
		cursor: wait;
	}
	:global(.eyebrow) {
		font: 10px var(--font-mono);
		letter-spacing: 0.16em;
		color: var(--sand);
	}
	:global(.primary) {
		min-height: 55px;
		padding: 18px 22px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		background: var(--amber);
		color: #172122;
		border: 1px solid var(--amber);
		text-decoration: none;
		font: 12px var(--font-mono);
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition:
			background 0.18s,
			border-color 0.18s;
	}
	:global(.primary:hover) {
		background: #ead0a2;
		border-color: #ead0a2;
	}
	:global(.primary span) {
		font-size: 20px;
		line-height: 0.8;
	}
	:global(::selection) {
		background: #d9b475;
		color: #172122;
	}
	@media (prefers-reduced-motion: reduce) {
		:global(*),
		:global(*::before),
		:global(*::after) {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
