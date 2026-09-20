import { defineConfig } from '@playwright/test';

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const ci = Boolean(process.env.CI);

export default defineConfig({
	webServer: externalBaseURL
		? undefined
		: { command: 'bun run build && bun run preview', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}',
	timeout: 120_000,
	expect: { timeout: 30_000 },
	workers: ci ? 1 : undefined,
	forbidOnly: ci,
	reporter: ci ? [['list'], ['junit', { outputFile: 'reports/playwright.xml' }]] : 'list',
	outputDir: 'test-results',
	use: {
		baseURL: externalBaseURL || 'http://127.0.0.1:4173',
		browserName: 'chromium',
		// Full Chromium preserves held mouse buttons under pointer lock; headless-shell does not.
		channel: 'chromium',
		headless: true,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		launchOptions: {
			args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
		}
	}
});
