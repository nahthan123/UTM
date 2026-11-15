// Run with Playwright available in NODE_PATH and a disposable test database.
// Requires UTM_TEST_ADMIN and UTM_TEST_PASSWORD; never use production credentials.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');

(async () => {
  const password = process.env.UTM_TEST_PASSWORD;
  const admin = process.env.UTM_TEST_ADMIN;
  assert(password && admin, 'Set UTM_TEST_ADMIN and UTM_TEST_PASSWORD');
  const browser = await chromium.launch({headless: true, channel: 'msedge'});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    const suffix = randomUUID().slice(0, 8);
    const operator = 'pilot.' + suffix, manager = 'manager.' + suffix;
    const fill = (form, field, value) => page.locator(`#${form} [name="${field}"]`).fill(String(value));
    const submit = async (form, endpoint) => {
      const response = page.waitForResponse(r => r.url().endsWith(endpoint) && ['POST', 'PUT'].includes(r.request().method()));
      await page.locator(`#${form} button.primary`).click();
      const result = await response;
      assert(result.ok(), `${endpoint}: ${result.status()} ${await result.text()}`);
      return result.json();
    };
    const login = async username => {
      await page.locator('#loginForm').waitFor({state: 'visible'});
      await fill('loginForm', 'username', username);
      await fill('loginForm', 'password', password);
      await submit('loginForm', '/api/auth/login');
      await page.locator('#appShell').waitFor({state: 'visible'});
      await page.waitForFunction(() => document.querySelector('#pageInfo').textContent.includes('bản ghi'));
    };
    const tab = async name => {
      const response = page.waitForResponse(r => r.url().includes('/api/' + name + '?') && r.request().method() === 'GET');
      await page.locator(`#nav [data-tab="${name}"]`).click();
      assert((await response).ok());
    };
    await page.goto(process.env.UTM_TEST_URL || 'http://localhost:18080');
    await page.locator('[data-auth="register"]').click();
    for (const [key, value] of Object.entries({username: operator, fullName: 'Demo Pilot', email: operator + '@example.test', phone: '0901234567', password, confirmPassword: password}))
      await fill('registerForm', key, value);
    await submit('registerForm', '/api/auth/register');
    await page.locator('#appShell').waitFor({state: 'visible'});
    assert.equal(await page.locator('#nav [data-tab="users"]').isVisible(), false);
    for (const [key, value] of Object.entries({serialNumber: 'SN-' + suffix, model: 'Demo Hybrid', maxFlightTime: 45, maxSpeed: 15.5}))
      await fill('droneForm', key, value);
    await page.locator('#droneForm [name="droneType"]').selectOption('HYBRID');
    const drone = await submit('droneForm', '/api/drones');
    assert.equal(drone.droneType, 'HYBRID');
    await page.locator('#list').getByText('SN-' + suffix, {exact: false}).waitFor();
    await tab('flights');
    await page.locator('#droneSelect').selectOption(drone.id);
    const start = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    const end = new Date(Date.now() + 86400000 + 1200000).toISOString().slice(0, 16);
    await fill('flightForm', 'startTime', start);
    await fill('flightForm', 'endTime', end);
    for (let i = 0; i < 2; i++) {
      const row = page.locator('.waypoint').nth(i);
      for (const [field, value] of Object.entries({latitude: 10.8 + i * .01, longitude: 106.7 + i * .01, altitude: 60, time: i ? end : start}))
        await row.locator(`[data-field="${field}"]`).fill(String(value));
    }
    const flight = await submit('flightForm', '/api/flights');
    assert.equal(flight.status, 'PENDING');
    assert(flight.startTime.endsWith('Z'));
    assert.equal(await page.locator('#flightReviewCard').isVisible(), false);
    assert.equal(await page.locator('#list [data-action^="status:"]').count(), 0);
    await page.locator('#list .badge.PENDING').waitFor();
    await page.screenshot({path: 'target/utm-client-plans.png', fullPage: true});
    await page.locator('#logout').click();
    await login(admin);
    assert.equal(await page.locator('#flightSubmitCard').isVisible(), false);
    assert.equal(await page.locator('#flightReviewCard').isVisible(), true);
    assert.equal(await page.locator('#flightFilter').inputValue(), 'PENDING');
    await page.locator('#list .badge.PENDING').waitFor();
    await page.screenshot({path: 'target/utm-admin-review.png', fullPage: true});
    await tab('users');
    for (const [key, value] of Object.entries({username: manager, fullName: 'Demo Manager', email: manager + '@example.test', phone: '0901234567', password}))
      await fill('userForm', key, value);
    await page.locator('#roleSelect').selectOption({label: 'MANAGER (MANAGER)'});
    await submit('userForm', '/api/users');
    await page.locator('#logout').click();
    await login(manager);
    await tab('flights');
    assert.equal(await page.locator('#flightSubmitCard').isVisible(), false);
    assert.equal(await page.locator('#nav [data-tab="roles"]').isVisible(), false);
    const allFlights = page.waitForResponse(r => r.url().includes('/api/flights?') && !r.url().includes('status='));
    await page.locator('#flightFilter').selectOption('');
    await allFlights;
    for (const status of ['APPROVED', 'ACTIVE', 'COMPLETED']) {
      const response = page.waitForResponse(r => r.url().endsWith(`/api/flights/${flight.id}/status`));
      await page.locator(`[data-id="${flight.id}"][data-action="status:${status}"]`).click();
      assert.equal((await (await response).json()).status, status);
    }
    await tab('logs');
    await page.locator('#list').getByText('FLIGHT_STATUS', {exact: true}).first().waitFor();
    await page.screenshot({path: 'target/utm-browser-desktop.png', fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    await page.screenshot({path: 'target/utm-browser-mobile.png', fullPage: true});
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    console.log('PASS: register operator → create hybrid UAV → submit 4D plan → admin creates manager → manager approves/activates/completes → logs; no JavaScript errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
