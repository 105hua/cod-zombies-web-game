import type { WeaponId } from '../types';

export type AudioCue =
	| 'shot'
	| 'hit'
	| 'buy'
	| 'reload'
	| 'round'
	| 'hurt'
	| 'melee'
	| 'reloadEnd'
	| 'empty'
	| 'gate'
	| 'pickup'
	| 'zombie'
	| 'step'
	| 'zombieAttack';

export interface AudioOptions {
	weapon?: WeaponId;
	pan?: number;
	/** Distance from the listener in world metres. */
	distance?: number;
}

interface AudioState {
	moving: boolean;
	sprinting: boolean;
	health: number;
	stamina: number;
}

interface Voice {
	nodes: AudioNode[];
	sources: AudioScheduledSourceNode[];
	output: GainNode;
	remaining: number;
	ended: boolean;
}

const MAX_VOICES = 24;
const FLOOR = 0.0001;

export class GameAudio {
	private context?: AudioContext;
	private master?: GainNode;
	private compressor?: DynamicsCompressorNode;
	private noise?: AudioBuffer;
	private voices = new Set<Voice>();
	private level = 0.35;
	private paused = false;
	private disposed = false;
	private transition = 0;
	private stateTask?: Promise<void>;
	private stepClock = 0;
	private breathClock = 0;
	private ambienceClock = 0;
	private leftFoot = false;
	private variation = 0;
	private activity = 0;

	get volume() {
		return this.level;
	}

	set volume(value: number) {
		this.level = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
		if (this.level === 0) this.stopVoices();
		this.setMaster(this.paused ? 0 : this.level);
	}

	async unlock() {
		if (this.disposed) return;
		if (!this.context) {
			const context = new AudioContext();
			this.context = context;
			this.master = context.createGain();
			this.master.gain.value = 0;
			this.compressor = context.createDynamicsCompressor();
			this.compressor.threshold.value = -18;
			this.compressor.knee.value = 16;
			this.compressor.ratio.value = 4;
			this.compressor.attack.value = 0.003;
			this.compressor.release.value = 0.18;
			this.compressor.connect(this.master);
			this.master.connect(context.destination);
			const noise = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
			const data = noise.getChannelData(0);
			let seed = 0x4b574452;
			for (let i = 0; i < data.length; i++) {
				seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
				data[i] = (seed / 0x100000000) * 2 - 1;
			}
			this.noise = noise;
		}
		// Invoke resume directly in the gesture, not after a queued promise.
		await this.applyContextState(this.context, ++this.transition);
	}

	setPaused(paused: boolean) {
		if (this.disposed || paused === this.paused) return;
		this.paused = paused;
		this.stepClock = 0;
		this.breathClock = 0;
		this.ambienceClock = 0;
		this.activity = 0;
		if (paused) {
			this.setMaster(0);
			this.stopVoices();
		}
		if (this.context) {
			void this.applyContextState(this.context, ++this.transition).catch((error: unknown) => {
				if (!this.disposed) console.warn('Unable to change game audio state', error);
			});
		}
	}

	private applyContextState(context: AudioContext, revision: number): Promise<void> {
		const change = async () => {
			if (this.disposed || revision !== this.transition || context !== this.context) return;
			if (this.paused) await context.suspend();
			else await context.resume();
			if (this.disposed || revision !== this.transition || context !== this.context) return;
			this.setMaster(this.paused ? 0 : this.level);
		};
		// Serialize transitions: a late suspend cannot win over a newer resume.
		// The first resume still executes synchronously inside the unlock gesture.
		const pending = this.stateTask ? this.stateTask.then(change, change) : change();
		this.stateTask = pending;
		return pending.finally(() => {
			if (this.stateTask === pending) this.stateTask = undefined;
		});
	}

	private setMaster(level: number) {
		if (!this.context || !this.master) return;
		const now = this.context.currentTime;
		this.master.gain.cancelScheduledValues(now);
		// Pause/mute is immediate; opening the mix has a short anti-click ramp.
		if (level === 0) this.master.gain.setValueAtTime(0, now);
		else this.master.gain.setTargetAtTime(level, now, 0.015);
	}

	private get audible() {
		return !this.disposed && !this.paused && this.level > 0 && this.context?.state === 'running';
	}

	play(kind: AudioCue, options: AudioOptions = {}) {
		if (!this.audible) return;
		const voice = this.createVoice(options);
		const weapon = options.weapon ?? 'pistol';
		const pitch = 0.96 + ((this.variation++ % 7) / 6) * 0.08;
		switch (kind) {
			case 'shot': {
				this.activity = 1;
				const shotgun = weapon === 'shotgun';
				const rifle = weapon === 'rifle';
				this.noiseLayer(
					voice,
					shotgun ? 0.19 : 0.085,
					shotgun ? 0.78 : 0.5,
					'highpass',
					rifle ? 1350 : 820,
					0,
					0.001
				);
				this.tone(
					voice,
					(shotgun ? 92 : rifle ? 156 : 128) * pitch,
					34,
					shotgun ? 0.23 : 0.13,
					shotgun ? 0.6 : 0.4,
					'sine'
				);
				this.noiseLayer(
					voice,
					shotgun ? 0.55 : 0.31,
					0.15,
					'lowpass',
					shotgun ? 740 : 1150,
					0.015,
					0.004
				);
				this.noiseLayer(voice, 0.038, 0.16, 'bandpass', 2900, 0.025);
				this.tone(voice, 2200, 950, 0.025, 0.055, 'triangle', 0.018);
				break;
			}
			case 'hit':
				this.noiseLayer(voice, 0.095, 0.29, 'lowpass', 1500);
				this.tone(voice, 150 * pitch, 45, 0.085, 0.22, 'sine');
				this.noiseLayer(voice, 0.03, 0.13, 'bandpass', 2400);
				break;
			case 'melee':
				this.noiseLayer(voice, 0.23, 0.28, 'bandpass', 1300, 0, 0.065, 380);
				this.noiseLayer(voice, 0.11, 0.09, 'highpass', 3000, 0.06, 0.015);
				break;
			case 'reload':
				this.noiseLayer(voice, 0.08, 0.17, 'bandpass', 1800);
				this.tone(voice, 660, 210, 0.065, 0.055, 'triangle');
				this.noiseLayer(voice, 0.14, 0.08, 'highpass', 2700, 0.08, 0.025);
				break;
			case 'reloadEnd':
				this.noiseLayer(voice, 0.045, 0.25, 'bandpass', weapon === 'shotgun' ? 1400 : 2400);
				this.tone(voice, 310, 110, 0.085, 0.13, 'triangle');
				this.noiseLayer(voice, 0.035, 0.18, 'highpass', 1800, 0.075);
				break;
			case 'empty':
				this.noiseLayer(voice, 0.022, 0.12, 'bandpass', 2500);
				this.tone(voice, 900, 420, 0.025, 0.055, 'triangle');
				break;
			case 'buy':
				this.noiseLayer(voice, 0.09, 0.12, 'bandpass', 850);
				this.tone(voice, 440, 440, 0.18, 0.085, 'sine', 0.02);
				this.tone(voice, 660, 660, 0.25, 0.08, 'sine', 0.11);
				break;
			case 'gate':
				this.noiseLayer(voice, 0.9, 0.23, 'bandpass', 480, 0, 0.06, 130);
				this.tone(voice, 78, 42, 0.85, 0.17, 'sawtooth');
				this.noiseLayer(voice, 0.16, 0.3, 'lowpass', 1100, 0.62);
				break;
			case 'pickup':
				this.tone(voice, 520, 780, 0.16, 0.09, 'sine');
				this.tone(voice, 1040, 1040, 0.24, 0.065, 'triangle', 0.08);
				this.noiseLayer(voice, 0.13, 0.04, 'highpass', 3400);
				break;
			case 'round':
				this.tone(voice, 73.4, 69.3, 1.7, 0.16, 'triangle', 0, 0.15);
				this.tone(voice, 110, 103.8, 1.5, 0.1, 'sine', 0.12, 0.12);
				this.noiseLayer(voice, 1.4, 0.08, 'bandpass', 420, 0, 0.28, 190);
				break;
			case 'hurt':
				this.activity = 1;
				this.tone(voice, 74, 32, 0.28, 0.33, 'sine');
				this.noiseLayer(voice, 0.17, 0.19, 'lowpass', 950);
				this.noiseLayer(voice, 0.25, 0.11, 'bandpass', 510, 0.025, 0.04);
				break;
			case 'zombie':
				this.tone(voice, 79 * pitch, 48, 0.85, 0.1, 'sawtooth', 0, 0.12, 560);
				this.tone(voice, 113 * pitch, 65, 0.75, 0.045, 'triangle', 0.04, 0.08, 850);
				this.noiseLayer(voice, 0.8, 0.11, 'bandpass', 620, 0, 0.14, 350);
				break;
			case 'zombieAttack':
				this.tone(voice, 150 * pitch, 62, 0.36, 0.13, 'sawtooth', 0, 0.025, 980);
				this.noiseLayer(voice, 0.32, 0.2, 'bandpass', 900, 0, 0.035, 430);
				break;
			case 'step':
				this.tone(voice, 88 * pitch, 38, 0.085, 0.12, 'sine');
				this.noiseLayer(voice, 0.12, 0.085, 'lowpass', 1250);
				this.noiseLayer(voice, 0.06, 0.045, 'highpass', 2200, 0.035);
				break;
		}
	}

	update(dt: number, state: AudioState) {
		if (state.health <= 0) {
			this.setPaused(true);
			return;
		}
		if (!this.audible || !Number.isFinite(dt) || dt <= 0) return;
		// Cadences are simulation-driven and cannot catch up in a burst after a stalled frame.
		const elapsed = Math.min(dt, 0.1);
		this.activity = Math.max(0, this.activity - elapsed * 1.6);
		if (state.moving) {
			this.stepClock -= elapsed;
			if (this.stepClock <= 0) {
				this.leftFoot = !this.leftFoot;
				this.play('step', { pan: this.leftFoot ? -0.16 : 0.16 });
				this.stepClock = state.sprinting ? 0.29 : 0.43;
			}
		} else this.stepClock = 0;
		this.breathClock -= elapsed;
		const exertion = Math.max(
			state.sprinting ? 0.65 : 0,
			1 - state.stamina / 100,
			1 - state.health / 70
		);
		if (exertion > 0.2 && this.breathClock <= 0 && this.voices.size < 18) {
			const voice = this.createVoice({});
			const level = (0.025 + exertion * 0.045) * (1 - this.activity * 0.6);
			this.noiseLayer(voice, 0.42, level, 'bandpass', 850, 0, 0.09, 450);
			this.noiseLayer(voice, 0.35, level * 0.6, 'bandpass', 530, 0.48, 0.075);
			this.breathClock = 2.5 - Math.min(1, exertion) * 1.15;
		}
		this.ambienceClock -= elapsed;
		if (this.ambienceClock <= 0 && this.voices.size < 12) {
			const voice = this.createVoice({ pan: Math.sin(this.variation * 0.8) * 0.55 });
			const level = 0.022 * (1 - this.activity * 0.75);
			this.noiseLayer(voice, 3.8, level, 'bandpass', 310, 0, 1.2, 170);
			this.tone(voice, 59, 58.8, 3.8, level * 0.45, 'sine', 0, 1);
			this.ambienceClock = 3.5;
		}
	}

	private createVoice(options: AudioOptions): Voice {
		const context = this.context!;
		if (this.voices.size >= MAX_VOICES) this.stopVoice(this.voices.values().next().value!);
		const output = context.createGain();
		const pan = context.createStereoPanner();
		const distance = Number.isFinite(options.distance) ? Math.max(0, options.distance!) : 0;
		output.gain.value = 1 / (1 + distance * 0.12 + distance * distance * 0.006);
		pan.pan.value = Number.isFinite(options.pan) ? Math.max(-1, Math.min(1, options.pan!)) : 0;
		output.connect(pan);
		pan.connect(this.compressor!);
		const voice: Voice = { nodes: [output, pan], sources: [], output, remaining: 0, ended: false };
		this.voices.add(voice);
		return voice;
	}

	private envelope(voice: Voice, duration: number, level: number, delay: number, attack: number) {
		const context = this.context!;
		const gain = context.createGain();
		const start = context.currentTime + delay;
		gain.gain.setValueAtTime(FLOOR, start);
		gain.gain.linearRampToValueAtTime(level, start + attack);
		gain.gain.exponentialRampToValueAtTime(FLOOR, start + duration);
		gain.connect(voice.output);
		voice.nodes.push(gain);
		return { gain, start };
	}

	private noiseLayer(
		voice: Voice,
		duration: number,
		level: number,
		type: BiquadFilterType,
		frequency: number,
		delay = 0,
		attack = 0.002,
		endFrequency = frequency
	) {
		const context = this.context!;
		const { gain, start } = this.envelope(voice, duration, level, delay, attack);
		const source = context.createBufferSource();
		source.buffer = this.noise!;
		source.loop = true;
		const filter = context.createBiquadFilter();
		filter.type = type;
		filter.frequency.setValueAtTime(frequency, start);
		filter.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
		filter.Q.value = 0.7;
		source.connect(filter);
		filter.connect(gain);
		voice.nodes.push(filter);
		this.trackSource(voice, source);
		source.start(start, (this.variation++ * 0.137) % 3);
		source.stop(start + duration + 0.015);
	}

	private tone(
		voice: Voice,
		frequency: number,
		endFrequency: number,
		duration: number,
		level: number,
		type: OscillatorType,
		delay = 0,
		attack = 0.002,
		cutoff = 4500
	) {
		const context = this.context!;
		const { gain, start } = this.envelope(voice, duration, level, delay, attack);
		const source = context.createOscillator();
		source.type = type;
		source.frequency.setValueAtTime(frequency, start);
		source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
		const filter = context.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = cutoff;
		filter.Q.value = 0.5;
		source.connect(filter);
		filter.connect(gain);
		voice.nodes.push(filter);
		this.trackSource(voice, source);
		source.start(start);
		source.stop(start + duration + 0.015);
	}

	private trackSource(voice: Voice, source: AudioScheduledSourceNode) {
		voice.nodes.push(source);
		voice.sources.push(source);
		voice.remaining++;
		source.onended = () => {
			voice.remaining--;
			if (voice.remaining === 0) this.releaseVoice(voice);
		};
	}

	private releaseVoice(voice: Voice) {
		if (voice.ended) return;
		voice.ended = true;
		for (const source of voice.sources) source.onended = null;
		for (const node of voice.nodes) node.disconnect();
		this.voices.delete(voice);
	}

	private stopVoice(voice: Voice) {
		if (voice.ended) return;
		for (const source of voice.sources) {
			source.onended = null;
			source.stop();
		}
		this.releaseVoice(voice);
	}

	private stopVoices() {
		for (const voice of this.voices) this.stopVoice(voice);
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.transition++;
		this.setMaster(0);
		this.stopVoices();
		this.master?.disconnect();
		this.compressor?.disconnect();
		const context = this.context;
		this.context = undefined;
		this.master = undefined;
		this.compressor = undefined;
		this.noise = undefined;
		if (context && context.state !== 'closed') {
			void context.close().catch((error: unknown) => {
				console.warn('Unable to close game audio context', error);
			});
		}
	}
}
