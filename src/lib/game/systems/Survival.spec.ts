import { describe, expect, it } from 'vitest';
import { Survival, WEAPONS } from './Survival';

function startRun() {
	const run = new Survival(() => 0.5);
	run.start();
	return run;
}

function clearRound(run: Survival) {
	const round = run.state.round;
	for (let step = 0; step < 200 && run.state.round === round; step++) {
		if (run.tick(10)) run.hit(false, true);
	}
	if (run.state.round === round) throw new Error('Round did not finish');
}

describe('Survival', () => {
	it('keeps the last scheduled enemy in the round until it is killed', () => {
		const run = startRun();
		const population = run.snapshot().remaining;
		for (let index = 0; index < population - 1; index++) {
			expect(run.tick(10)).toBe(1);
			run.hit(false, true);
			expect(run.state.round).toBe(1);
		}
		expect(run.tick(10)).toBe(1);
		expect(run.snapshot().remaining).toBe(1);
		expect(run.alive).toBe(1);
		expect(run.tick(30)).toBe(0);
		expect(run.state.round).toBe(1);
		run.hit(false, true);
		expect(run.state.round).toBe(2);
		expect(run.state.intermission).toBe(7);
		expect(run.snapshot().remaining).toBe(9);
		expect(run.tick(6)).toBe(0);
		expect(run.tick(1)).toBe(1);
	});

	it('caps simultaneous enemies without losing the unspawned budget', () => {
		const run = startRun();
		while (run.state.round < 8) clearRound(run);
		for (let index = 0; index < 24; index++) expect(run.tick(10)).toBe(1);
		expect(run.alive).toBe(24);
		expect(run.snapshot().remaining).toBe(27);
		expect(run.tick(100)).toBe(0);
		run.hit(false, true);
		expect(run.tick(1)).toBe(1);
		expect(run.alive).toBe(24);
		expect(run.snapshot().remaining).toBe(26);
	});

	it('freezes every gameplay timer while paused', () => {
		const run = startRun();
		run.finishShot();
		run.reload();
		run.damage(30);
		run.pickup('double');
		run.pickup('instakill');
		run.notify('Hold position');
		run.pause();
		const before = run.snapshot();
		expect(run.tick(60)).toBe(0);
		expect(run.snapshot()).toEqual(before);
		expect(run.finishShot()).toBe(false);
		run.resume();
		run.tick(1);
		expect(run.state.elapsed).toBe(1);
		expect(run.state.reloading).toBeCloseTo(0.4);
		expect(run.state.health).toBe(70);
		expect(run.state.doublePoints).toBe(29);
		expect(run.state.instakill).toBe(19);
	});

	it('transfers only available reserve ammunition when a reload completes', () => {
		const run = startRun();
		for (let index = 0; index < 5; index++) {
			run.finishShot();
			run.tick(WEAPONS.pistol.interval);
		}
		run.state.reserve = 2;
		run.reload();
		expect(run.state.magazine).toBe(3);
		expect(run.state.reserve).toBe(2);
		expect(run.finishShot()).toBe(false);
		run.tick(WEAPONS.pistol.reload / 2);
		expect(run.state.magazine).toBe(3);
		run.tick(WEAPONS.pistol.reload / 2);
		expect(run.state.magazine).toBe(5);
		expect(run.state.reserve).toBe(0);
		run.reload();
		expect(run.state.reloading).toBe(0);
	});

	it('consumes rounds only for accepted shots and enforces the fire interval', () => {
		const run = startRun();
		expect(run.finishShot()).toBe(true);
		expect(run.finishShot()).toBe(false);
		expect(run.state.magazine).toBe(7);
		for (let index = 0; index < 7; index++) {
			run.tick(WEAPONS.pistol.interval);
			expect(run.finishShot()).toBe(true);
		}
		run.tick(WEAPONS.pistol.interval);
		expect(run.finishShot()).toBe(false);
		expect(run.state.magazine).toBe(0);
	});

	it('does not charge insufficient or duplicate permanent purchases', () => {
		const run = startRun();
		expect(run.buy('gate')).toBe(false);
		expect(run.state.points).toBe(500);
		expect(run.state.gateOpen).toBe(false);
		run.state.points = 10000;
		for (const id of ['gate', 'vitality', 'upgrade'] as const) {
			expect(run.buy(id)).toBe(true);
			const afterPurchase = run.state.points;
			expect(run.buy(id)).toBe(false);
			expect(run.state.points).toBe(afterPurchase);
		}
		expect(run.state.points).toBe(4250);
		expect(run.state.health).toBe(200);
		expect(run.state.maxHealth).toBe(200);
	});

	it('refills matching wall-weapon reserves at half price without removing an upgrade', () => {
		const run = startRun();
		run.state.points = 10000;
		run.buy('rifle');
		run.buy('upgrade');
		const before = run.state.points;
		expect(run.buy('rifle')).toBe(false);
		expect(run.state.points).toBe(before);
		run.finishShot();
		run.reload();
		run.tick(WEAPONS.rifle.reload);
		run.finishShot();
		const magazine = run.state.magazine;
		expect(run.buy('rifle')).toBe(true);
		expect(run.state.points).toBe(before - 500);
		expect(run.state.reserve).toBe(180);
		expect(run.state.magazine).toBe(magazine);
		expect(run.state.upgraded).toBe(true);
		expect(run.buy('shotgun')).toBe(true);
		expect(run.state.upgraded).toBe(false);
	});

	it('uses injected randomness for all three box weapons and cancels old reloads', () => {
		const values = [0, 0.5, 0.999];
		const run = new Survival(() => values.shift()!);
		run.start();
		run.state.points = 5000;
		for (const weapon of ['pistol', 'rifle', 'shotgun'] as const) {
			run.finishShot();
			run.reload();
			expect(run.buy('box')).toBe(true);
			expect(run.state.weapon).toBe(weapon);
			expect(run.state.reloading).toBe(0);
		}
		expect(run.state.points).toBe(2150);
	});

	it('prevents damage, purchases, rewards, pickups and round progress after death', () => {
		const run = startRun();
		run.tick(5);
		run.damage(1000);
		const before = run.snapshot();
		expect(before.phase).toBe('dead');
		expect(before.health).toBe(0);
		expect(run.finishShot()).toBe(false);
		expect(run.buy('gate')).toBe(false);
		run.reload();
		run.damage(10);
		run.hit(true, true);
		run.pickup('ammo');
		run.pause();
		run.resume();
		expect(run.tick(100)).toBe(0);
		expect(run.snapshot()).toEqual(before);
	});

	it('restarts with fresh round budget, resources and timers', () => {
		const run = startRun();
		run.state.points = 10000;
		run.buy('rifle');
		run.buy('vitality');
		run.buy('gate');
		run.buy('upgrade');
		run.pickup('double');
		run.pickup('instakill');
		run.tick(5);
		run.hit(true, true);
		run.finishShot();
		run.reload();
		run.damage(200);
		run.start();
		expect(run.snapshot()).toEqual(startRun().snapshot());
		expect(run.alive).toBe(0);
		expect(run.finishShot()).toBe(true);
		run.damage(10);
		expect(run.state.health).toBe(90);
	});

	it('expires temporary powers and applies doubled rewards only while active', () => {
		const run = startRun();
		run.pickup('double');
		run.pickup('instakill');
		run.hit(false, false);
		expect(run.state.points).toBe(520);
		run.tick(20);
		expect(run.state.instakill).toBe(0);
		expect(run.state.doublePoints).toBe(10);
		run.hit(true, true);
		expect(run.state.points).toBe(720);
		expect(run.state.headshots).toBe(1);
		run.tick(10);
		run.hit(false, false);
		expect(run.state.doublePoints).toBe(0);
		expect(run.state.points).toBe(730);
	});

	it('protects against repeated damage briefly and heals only time after the delay', () => {
		const run = startRun();
		run.damage(40);
		run.damage(40);
		expect(run.state.health).toBe(60);
		run.tick(0.7);
		run.damage(20);
		expect(run.state.health).toBe(40);
		run.tick(6);
		expect(run.state.health).toBeCloseTo(52);
		run.tick(20);
		expect(run.state.health).toBe(100);
	});

	it('max ammo cancels a reload and nuke announcements do not erase future enemies', () => {
		const run = startRun();
		run.finishShot();
		run.reload();
		run.pickup('ammo');
		expect(run.state.magazine).toBe(8);
		expect(run.state.reserve).toBe(80);
		expect(run.state.reloading).toBe(0);
		run.tick(5);
		const remaining = run.snapshot().remaining;
		run.pickup('nuke');
		expect(run.alive).toBe(1);
		expect(run.snapshot().remaining).toBe(remaining);
		run.hit(false, true, true);
		expect(run.state.points).toBe(630);
		expect(run.state.round).toBe(1);
	});

	it('expires messages without exposing mutable snapshots', () => {
		const run = startRun();
		run.notify('Move out');
		const snapshot = run.snapshot();
		snapshot.points = 0;
		expect(run.state.points).toBe(500);
		run.tick(2);
		expect(run.state.message).toBe('Move out');
		run.tick(1);
		expect(run.state.message).toBe('');
	});
});
