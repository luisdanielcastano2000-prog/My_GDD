import { defineConfig, devices } from '@playwright/test';

// Pruebas de la app entera (web + API + base de datos), en e2e/.
// - En el Mac: `npm run test:e2e` arranca la app compilada (`npm start` en la raíz, puerto 3000)
//   si no está ya en marcha. Antes: MongoDB en marcha y `npm run build` en la raíz.
// - Contra la app publicada: `BASE_URL=https://my-gdd.onrender.com npm run test:e2e`.
// Crean cuentas de prueba (@example.com) y las borran al acabar.
const baseURL = process.env['BASE_URL'] ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // las pruebas crean cuentas: así no se pasa del límite de 10 por minuto de Sign up / Log in
  timeout: 120_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: process.env['BASE_URL']
    ? undefined
    : {
        command: 'npm start --prefix ..',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
