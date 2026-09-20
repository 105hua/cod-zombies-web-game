import { userEvent } from 'vitest/browser';
import { expect, it, vi } from 'vitest';
import { GameAudio } from './Audio';

it('reports unavailable weapon recordings instead of silently playing without them', async () => {
	const audio = new GameAudio();
	const fetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
	const button = document.createElement('button');
	document.body.append(button);
	let unlocking: Promise<void> | undefined;
	button.onclick = () => {
		unlocking = audio.unlock();
		// The rejection is asserted after the browser dispatches the gesture.
		void unlocking.catch(() => {});
	};
	try {
		await userEvent.click(button);
		await expect(unlocking).rejects.toThrow(/weapon audio/i);
	} finally {
		audio.dispose();
		fetch.mockRestore();
		button.remove();
	}
});

it('plays the remaining shotgun action after unmuting without replaying the shot', async () => {
	const audio = new GameAudio();
	const button = document.createElement('button');
	document.body.append(button);
	let unlocking: Promise<void> | undefined;
	button.onclick = () => {
		unlocking = audio.unlock();
	};
	try {
		await audio.prepare();
		await userEvent.click(button);
		await unlocking;
		const { context, master } = audio as unknown as {
			context: AudioContext;
			master: GainNode;
		};
		const analyser = context.createAnalyser();
		analyser.fftSize = 2048;
		master.connect(analyser);
		const samples = new Float32Array(analyser.fftSize);
		const state = {
			health: 100,
			stamina: 100,
			moving: false,
			sprinting: false,
			weapon: 'shotgun' as const,
			reloadProgress: 0
		};
		audio.volume = 0;
		audio.play('shot', { weapon: 'shotgun' });
		audio.update(0.1, state);
		audio.update(0.1, state);
		analyser.getFloatTimeDomainData(samples);
		expect(samples.every((value) => value === 0)).toBe(true);

		audio.volume = 1;
		audio.update(0.1, state);
		audio.update(0.05, state);
		// The report and backward stroke elapsed while muted. Only the future
		// forward stroke can produce this signal; ambience is far below 0.02.
		await expect
			.poll(
				() => {
					analyser.getFloatTimeDomainData(samples);
					return samples.some((value) => Math.abs(value) > 0.02);
				},
				{ interval: 8, timeout: 1000 }
			)
			.toBe(true);
	} finally {
		audio.dispose();
		button.remove();
	}
});
