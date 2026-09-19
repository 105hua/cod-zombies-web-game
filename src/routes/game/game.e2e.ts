import { expect, test } from '@playwright/test';

test('survival supports shooting, reloading, pause, resize and clean route remounts', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/');
	await page.getByRole('link', { name: 'PLAY SOLO' }).click();
	await page.getByRole('button', { name: 'BEGIN SURVIVAL' }).click();
	const canvas = page.getByLabel('3D survival game world');
	await expect(canvas).toBeVisible();
	await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
	const ammo = page.getByRole('region', { name: 'Weapon ammunition' });
	await expect(ammo.locator('strong')).toHaveText('8');
	await page.mouse.down();
	await expect(ammo.locator('strong')).not.toHaveText('8');
	await page.mouse.up();
	await page.keyboard.press('KeyR');
	await expect(ammo.locator('strong')).toHaveText('8');
	await expect(ammo).not.toContainText('/ 80');
	await page.keyboard.press('KeyP');
	await expect(page.getByRole('button', { name: 'RESUME SURVIVAL' })).toBeVisible();
	await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
	const before = await canvas.evaluate((element) => (element as HTMLCanvasElement).width);
	await page.setViewportSize({ width: 800, height: 600 });
	await expect
		.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).width))
		.not.toBe(before);
	await page.getByRole('link', { name: 'End run & return to menu' }).click();
	await expect(canvas).toHaveCount(0);
	await page.getByRole('link', { name: 'PLAY SOLO' }).click();
	await expect(page.getByRole('button', { name: 'BEGIN SURVIVAL' })).toBeEnabled();
	expect(errors).toEqual([]);
});
