import { writable } from 'svelte/store';
import type { HudSnapshot } from '$lib/game/types';

export type GameUI = {
	status: 'loading' | 'ready' | 'error';
	message?: string;
	hud?: HudSnapshot;
};

// One store per mounted canvas, never shared across SSR requests.
export function createGameUI() {
	return writable<GameUI>({ status: 'loading' });
}
