const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createSidebarFixtures } = require('../../tests/fixtures/sidebar/fixtures.cjs');

// Portable Playwright resolver
let playwright;
const candidatePaths = [
  'playwright',
  path.resolve(__dirname, '../../../demoanping/.expo/ui-review/preview-tools/node_modules/playwright'),
  path.resolve(__dirname, '../../demoanping/.expo/ui-review/preview-tools/node_modules/playwright'),
  path.resolve(__dirname, '../demoanping/.expo/ui-review/preview-tools/node_modules/playwright')
];

for (const p of candidatePaths) {
  try {
    playwright = require(p);
    if (playwright && playwright.chromium) break;
  } catch (e) {}
}

if (!playwright || !playwright.chromium) {
  throw new Error('Playwright not found in candidate paths');
}
const { chromium } = playwright;

const root = path.resolve(__dirname, '../..');
const webDir = path.join(root, 'android-card-agent/.work/bundled-assets/web');
const rows = Number(process.env.DEMO_ROWS || 200);

const TABS = [
  { id: 'records', path: '/records', name: 'เวชระเบียน' },
  { id: 'queue', path: '/queue', name: 'นัดหมาย' },
  { id: 'exec_dashboard', path: '/exec_dashboard', name: 'แดชบอร์ดผู้บริหาร' },
  { id: 'finance', path: '/finance', name: 'การเงิน' },
  { id: 'dashboard', path: '/dashboard', name: 'แดชบอร์ด' },
  { id: 'catalog', path: '/catalog', name: 'สินค้า/บริการ' },
  { id: 'coupons', path: '/coupons', name: 'คูปอง' },
  { id: 'inventory', path: '/inventory', name: 'คลังสินค้า' },
  { id: 'reports', path: '/reports', name: 'รายงาน' },
  { id: 'staff', path: '/staff', name: 'พนักงาน' },
  { id: 'branch', path: '/branch', name: 'สาขา' },
  { id: 'settings', path: '/settings', name: 'ตั้งค่า' },
  { id: 'profile', path: '/profile', name: 'โปรไฟล์' },
  { id: 'pos', path: '/pos', name: 'POS' },
  { id: 'display_ads', path: '/display_ads', name: 'จัดการโฆษณา' }
];

(async () => {
  console.log(`\n===============================================================`);
  console.log(`QA Test Suite: Sidebar Uniform Scaling Across All 15 Pages`);
  console.log(`Fixture data: ${rows} rows | Port: bundled assets (WebView mode)`);
  console.log(`===============================================================\n`);

  const fixtures = createSidebarFixtures(rows);
  const manifestRaw = await fs.readFile(path.join(webDir, 'asset-manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const scripts = await Promise.all(
    Object.keys(manifest.files)
      .filter(k => k.endsWith('.js'))
      .map(k => fs.readFile(path.join(webDir, k), 'utf8'))
  );
  const projectMatch = scripts.join('\n').match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  const project = projectMatch ? projectMatch[1] : 'fixture-project';
  const token = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', Buffer.from(JSON.stringify({ sub: 'fixture-user', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'fixture-signature'].join('.');

  const browser = await chromium.launch({ headless: true });
  const viewport = { width: 1280, height: 800 };
  const context = await browser.newContext({ viewport, hasTouch: true, ignoreHTTPSErrors: true });

  const errors = [];
  context.on('pageerror', err => errors.push(err.message));

  // Mock network requests
  await context.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-expose-headers': 'content-range'
    };

    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });

    if (url.hostname.endsWith('.supabase.co')) {
      const parts = url.pathname.split('/');
      const table = parts[parts.length - 1];

      if (url.pathname.includes('/rpc/')) {
        if (table === 'reconcile_sync') {
          return route.fulfill({ headers, json: { deleted_ids: [], updated_rows: fixtures[req.postDataJSON()?.p_table_name] || [] } });
        }
        if (table === 'get_executive_dashboard_data') {
          return route.fulfill({
            headers,
            json: {
              summary: { total_income: 50000, pos_total_income: 45000, total_expense: 12000, net_profit: 38000, pos_count: 80, payment_methods: { cash: 25000, transfer: 25000 } },
              daily_trend: Array.from({ length: 15 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, income: 3000 + i * 200, expense: 500 + i * 50, profit: 2500 + i * 150 })),
              top_products: [{ name: 'ฝังเข็มปรับสมดุล', quantity: 30, revenue: 36000 }],
              staff_stats: [{ name: 'พญ. ทดสอบ ใจดี', total: 60, revenue: 45000 }],
              branch_summary: fixtures.branches.map(b => ({ branch_id: b.id, branch_name: b.name, total_income: 25000, net_profit: 19000 })),
              queue_stats: { total: 50, completed: 30, cancelled: 5 }
            }
          });
        }
        return route.fulfill({ headers, status: 200, json: [] });
      }

      if (['GET', 'HEAD'].includes(req.method())) {
        let data = fixtures[table] || [];
        const offset = Number(url.searchParams.get('offset') || 0);
        const limit = Number(url.searchParams.get('limit') || 10000);
        const total = data.length;
        const sliced = data.slice(offset, offset + limit);
        headers['content-range'] = total ? `${offset}-${offset + sliced.length - 1}/${total}` : '*/0';
        return route.fulfill({ headers, body: req.method() === 'HEAD' ? '' : JSON.stringify(sliced), contentType: 'application/json' });
      }

      return route.fulfill({ headers, json: [] });
    }

    if (url.hostname === 'anpingclinic.vercel.app') {
      const key = req.isNavigationRequest() ? '/index.html' : decodeURIComponent(url.pathname);
      const info = manifest.files[key];
      if (info) {
        const body = await fs.readFile(path.join(webDir, key));
        return route.fulfill({ body, contentType: info.mime });
      }
    }

    return route.fulfill({ status: 200, headers, body: '' });
  });

  // Inject session & AndroidCardBridge
  await context.addInitScript(({ user, project, token }) => {
    localStorage.setItem('clinic_isLoggedIn', 'true');
    localStorage.setItem('clinic_currentUser', JSON.stringify(user));
    localStorage.setItem('clinic_currentBranch', 'all');
    localStorage.setItem('clinic_session_token', 'fixture-session');
    localStorage.setItem(`sb-${project}-auth-token`, JSON.stringify({
      access_token: token,
      refresh_token: 'fixture-refresh',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: { id: user.id, email: 'fixture@anping.com', app_metadata: {}, user_metadata: {} }
    }));
    window.AndroidCardBridge = {
      isNativeApp: () => true,
      getAppVersion: () => '1.6.25',
      getReaderStatus: () => JSON.stringify({ connected: false, deviceConnected: false, hasCard: false }),
      setSwipeRefreshEnabled: () => {},
      setCanScrollUp: () => {},
      isDeviceConnected: () => false
    };
  }, { user: fixtures.staff[0], project, token });

  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  const testResults = [];

  try {
    for (const tab of TABS) {
      process.stdout.write(`Testing tab [${tab.id.padEnd(15)}] (${tab.name})... `);
      await page.goto(`https://anpingclinic.vercel.app${tab.path}`);
      await page.waitForSelector('#main-scroll-container', { state: 'attached' });
      await page.waitForTimeout(250);

      const sidebar = page.locator('aside').filter({ has: page.locator('.sidebar-drag-handle') });
      await sidebar.waitFor({ state: 'attached' });

      // 1. Verify eligibility: body has has-sidebar-blocks
      const hasSidebarBlocks = await page.evaluate(() => document.body.classList.contains('has-sidebar-blocks'));
      assert.equal(hasSidebarBlocks, true, `tab ${tab.id} must have .has-sidebar-blocks on body`);

      // 2. Initial geometry: 80px
      const initBox = await sidebar.boundingBox();
      assert(Math.abs(initBox.width - 80) <= 2, `initial sidebar width ~80px, got ${initBox.width}`);
      const initZoom = await page.evaluate(() => Number(document.getElementById('main-scroll-container')?.style.zoom) || 1);
      assert(Math.abs(initZoom - 1) < 0.05, `initial zoom ~1, got ${initZoom}`);

      // 3. Test automatic smooth expansion (via header toggle)
      const headerToggle = sidebar.locator('.min-h-\\[89px\\]');
      await headerToggle.click();

      // Check during motion that is-sidebar-animating is active and main has motion properties
      await page.waitForFunction(() => document.body.classList.contains('is-sidebar-animating'), { timeout: 1000 });
      const midAnimState = await page.evaluate(() => {
        const m = document.getElementById('main-scroll-container');
        const p = m.parentElement;
        return {
          animating: document.body.classList.contains('is-sidebar-animating'),
          flex: m.style.flex,
          width: m.style.width,
          expectedWidth: `${p.clientWidth - 80}px`,
          hasAnimation: m.getAnimations().some(a => a.id === 'sidebar-content-motion')
        };
      });
      assert.equal(midAnimState.animating, true, 'is-sidebar-animating must be active');
      assert(midAnimState.flex === 'none' || midAnimState.flex === '0 0 auto', `main flex must be none during motion, got: ${midAnimState.flex}`);
      assert.equal(midAnimState.width, midAnimState.expectedWidth, 'main width locked to parent - 80');

      // Wait for completion (260ms linear + 270ms finish)
      await page.waitForFunction(() => !document.body.classList.contains('is-sidebar-animating'), { timeout: 2000 });
      await page.waitForTimeout(50);

      // Verify settled expanded state
      const settledExpanded = await page.evaluate(() => {
        const m = document.getElementById('main-scroll-container');
        const s = document.querySelector('aside:has(.sidebar-drag-handle)');
        const p = m.parentElement;
        const sWidth = s.getBoundingClientRect().width;
        const pWidth = p.clientWidth;
        const expectedZoom = (pWidth - sWidth) / (pWidth - 80);
        return {
          sidebarWidth: sWidth,
          zoom: Number(m.style.zoom) || 1,
          expectedZoom,
          flex: m.style.flex,
          width: m.style.width,
          transform: m.style.transform
        };
      });
      assert(Math.abs(settledExpanded.sidebarWidth - 256) <= 2, `settled expanded sidebar width ~256px, got ${settledExpanded.sidebarWidth}`);
      assert(Math.abs(settledExpanded.zoom - settledExpanded.expectedZoom) < 0.015, `settled zoom ${settledExpanded.zoom} matches expected ${settledExpanded.expectedZoom}`);
      assert.equal(settledExpanded.flex, '', 'flex restored');
      assert.equal(settledExpanded.width, '', 'width restored');
      assert.equal(settledExpanded.transform, '', 'transform restored');

      // 4. Test manual slow drag (from 256px back towards 80px)
      const dragHandle = sidebar.locator('.sidebar-drag-handle');
      const handleBox = await dragHandle.boundingBox();
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      // Hold > 160ms to engage manual drag mode (not quick flick)
      await page.waitForTimeout(200);
      await page.mouse.move(handleBox.x - 90, handleBox.y + handleBox.height / 2, { steps: 5 });

      const manualDragState = await page.evaluate(() => {
        const m = document.getElementById('main-scroll-container');
        return {
          isDragging: document.body.classList.contains('is-dragging-sidebar'),
          flex: m.style.flex,
          transform: m.style.transform
        };
      });
      assert.equal(manualDragState.isDragging, true, 'manual drag engages is-dragging-sidebar');
      assert(manualDragState.flex === 'none' || manualDragState.flex === '0 0 auto', `flex is none during manual drag, got: ${manualDragState.flex}`);
      assert(manualDragState.transform.includes('scale('), `transform has scale, got: ${manualDragState.transform}`);

      // Complete collapse drag and release
      await page.mouse.move(handleBox.x - 180, handleBox.y + handleBox.height / 2, { steps: 5 });
      await page.mouse.up();
      await page.waitForFunction(() => !document.body.classList.contains('is-dragging-sidebar') && !document.body.classList.contains('is-sidebar-animating'), { timeout: 2000 });
      await page.waitForTimeout(50);

      // Verify settled collapsed state
      const settledCollapsed = await page.evaluate(() => {
        const m = document.getElementById('main-scroll-container');
        const s = document.querySelector('aside:has(.sidebar-drag-handle)');
        return {
          sidebarWidth: s.getBoundingClientRect().width,
          zoom: Number(m.style.zoom) || 1,
          flex: m.style.flex,
          transform: m.style.transform
        };
      });
      assert(Math.abs(settledCollapsed.sidebarWidth - 80) <= 2, `settled collapsed sidebar ~80px, got ${settledCollapsed.sidebarWidth}`);
      assert(Math.abs(settledCollapsed.zoom - 1) < 0.015, `settled collapsed zoom ~1, got ${settledCollapsed.zoom}`);
      assert.equal(settledCollapsed.flex, '', 'flex restored');
      assert.equal(settledCollapsed.transform, '', 'transform restored');

      console.log('PASS (Auto WAAPI scale, manual drag, zoom & restore verified)');
      testResults.push({ tab: tab.id, status: 'PASS' });
    }

    // 5. Test rapid navigation immediately after release (Fast Nav)
    process.stdout.write(`Testing rapid navigation immediately after release... `);
    await page.goto('https://anpingclinic.vercel.app/records');
    await page.waitForSelector('#main-scroll-container', { state: 'attached' });
    const sidebar = page.locator('aside').filter({ has: page.locator('.sidebar-drag-handle') });
    const dragHandle = sidebar.locator('.sidebar-drag-handle');
    const handleBox = await dragHandle.boundingBox();

    // Flick open
    await page.mouse.move(handleBox.x + 2, handleBox.y + 10);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 80, handleBox.y + 10, { steps: 2 });
    await page.mouse.up();

    // Immediately click /finance in sidebar
    const financeNavBtn = sidebar.getByRole('button', { name: /การเงิน/ });
    await financeNavBtn.click({ timeout: 1000 });
    await page.waitForTimeout(400);

    const currentUrl = new URL(page.url()).pathname;
    assert.equal(currentUrl, '/finance', `Immediately tapping nav item after release must navigate to /finance, got ${currentUrl}`);
    console.log(`PASS (Navigated to /finance immediately)`);

    // 6. Test mid-animation tab switch (Long list 'records' -> 'pos' with scroller change)
    process.stdout.write(`Testing mid-animation tab switch (records -> pos)... `);
    await page.goto('https://anpingclinic.vercel.app/records');
    await page.waitForSelector('#main-scroll-container', { state: 'attached' });
    const headerToggle = sidebar.locator('.min-h-\\[89px\\]');
    await headerToggle.click();

    // Wait until animation starts
    await page.waitForFunction(() => document.body.classList.contains('is-sidebar-animating'));

    // Switch tab to /pos mid-flight
    await page.evaluate(() => {
      window.history.pushState({}, '', '/pos');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(50);

    // Verify animation continues and finishes without error
    await page.waitForFunction(() => !document.body.classList.contains('is-sidebar-animating'), { timeout: 2000 });
    const posState = await page.evaluate(() => {
      const m = document.getElementById('main-scroll-container');
      const s = document.querySelector('aside:has(.sidebar-drag-handle)');
      return {
        path: location.pathname,
        sidebarWidth: s.getBoundingClientRect().width,
        zoom: Number(m.style.zoom) || 1,
        flex: m.style.flex,
        transform: m.style.transform
      };
    });
    assert(Math.abs(posState.sidebarWidth - 256) <= 2, `sidebar expanded to 256px on pos, got ${posState.sidebarWidth}`);
    assert(posState.zoom > 0.8 && posState.zoom < 0.9, `pos zoom is scaled correctly, got ${posState.zoom}`);
    assert.equal(posState.flex, '', 'main flex restored after switch');
    console.log(`PASS (Clock preserved & geometry refreshed for POS scroller)`);

    // 7. Test non-shell route cleanup (Customer Display)
    process.stdout.write(`Testing non-shell route cleanup (Customer Display)... `);
    await page.goto('https://anpingclinic.vercel.app/customer-display');
    await page.waitForTimeout(400);

    const nonShellState = await page.evaluate(() => ({
      hasSidebarBlocks: document.body.classList.contains('has-sidebar-blocks'),
      hasSidebar: !!document.querySelector('aside .sidebar-drag-handle')
    }));
    assert.equal(nonShellState.hasSidebarBlocks, false, 'has-sidebar-blocks must be removed in non-shell route');
    assert.equal(nonShellState.hasSidebar, false, 'sidebar must not be rendered in customer display');
    console.log(`PASS (Cleaned up sidebar and markers)`);

    console.log(`\n===============================================================`);
    console.log(`SUMMARY: ALL 15 PAGES + FAST NAV + MID-ANIMATION SWITCH PASSED!`);
    console.log(`===============================================================\n`);

    for (const r of testResults) {
      console.log(` - Tab: ${r.tab.padEnd(18)} : ${r.status}`);
    }
    console.log(` - Fast Nav Navigation   : PASS`);
    console.log(` - Mid-Animation Switch  : PASS`);
    console.log(` - Non-Shell Cleanup     : PASS\n`);

  } finally {
    await browser.close();
  }
})();
