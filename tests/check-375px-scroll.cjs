const puppeteer = require('../Hisaab/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Strict 375px mobile viewport (iPhone SE / mini standard)
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });

  const results = [];

  async function checkOverflow(testName, screenshotName) {
    const data = await page.evaluate(() => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const winWidth = window.innerWidth;
      
      // Find any element with bounding rect extending beyond 375px
      const overflowingElements = [];
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const r = el.getBoundingClientRect();
        if (r.right > 375.5) { // allow 0.5px subpixel antialiasing
          overflowingElements.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: (el.className || '').toString().slice(0, 50),
            right: Math.round(r.right),
            width: Math.round(r.width)
          });
        }
      }

      return {
        docScrollWidth,
        bodyScrollWidth,
        winWidth,
        hasHorizontalScroll: docScrollWidth > winWidth || bodyScrollWidth > winWidth,
        overflowingElements: overflowingElements.slice(0, 5) // top 5
      };
    });

    if (screenshotName) {
      await page.screenshot({ path: screenshotName });
    }

    const passed = !data.hasHorizontalScroll && data.overflowingElements.length === 0;
    results.push({
      testName,
      passed,
      docScrollWidth: data.docScrollWidth,
      winWidth: data.winWidth,
      overflowingElements: data.overflowingElements,
      screenshot: screenshotName
    });

    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testName}`);
    console.log(`       scrollWidth = ${data.docScrollWidth}px, windowWidth = ${data.winWidth}px`);
    if (data.overflowingElements.length > 0) {
      console.log(`       ⚠️ Overflowing elements found:`, data.overflowingElements);
    }
  }

  console.log('📱 TESTING 375px VIEWPORT ON LOCAL BUILD (http://localhost:3000)...');

  // 1. Patient Chat - Light Mode
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await checkOverflow('1. Patient Chat (Light Mode)', 'check-375-patient-light.png');

  // 2. Patient Chat - Dark Mode
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await checkOverflow('2. Patient Chat (Dark Mode)', 'check-375-patient-dark.png');

  // 3. Patient Chat - With active conversation
  await page.type('#chat-input', 'What time do you open on Saturday?');
  await page.click('#chat-send');
  await new Promise(r => setTimeout(r, 600));
  await checkOverflow('3. Patient Chat with Active Messages', 'check-375-patient-conversation.png');

  // 4. Staff Portal - Locked Login Screen (Light & Dark)
  await page.goto('http://localhost:3000/staff', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await checkOverflow('4. Staff Locked Screen (Light Mode)', 'check-375-staff-locked-light.png');

  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await checkOverflow('5. Staff Locked Screen (Dark Mode)', 'check-375-staff-locked-dark.png');

  // 5. Staff Portal - Authenticated Dashboard with Tickets (Light Mode)
  await page.type('#staff-code-input', 'Staff@0369');
  await page.click('#staff-login-btn');
  await page.waitForSelector('#ticket-queue');

  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await checkOverflow('6. Staff Dashboard (Light Mode)', 'check-375-staff-dashboard-light.png');

  // 6. Staff Portal - Authenticated Dashboard with Tickets (Dark Mode)
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await checkOverflow('7. Staff Dashboard (Dark Mode)', 'check-375-staff-dashboard-dark.png');

  // 7. Staff Dashboard - Edit Data Drawer Open
  await page.evaluate(() => {
    const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Edit Data'));
    if (editBtn) editBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));
  await checkOverflow('8. Staff Edit Clinic Data Drawer Open', 'check-375-staff-edit-drawer.png');

  // Close drawer
  await page.evaluate(() => {
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Close'));
    if (closeBtn) closeBtn.click();
  });

  // 8. Staff Dashboard - Gemini API Key Modal Open
  await page.evaluate(() => {
    const keyBtn = document.querySelector('#staff-gemini-key-btn');
    if (keyBtn) keyBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));
  await checkOverflow('9. Gemini Key Modal Open', 'check-375-gemini-modal.png');

  console.log('\n🌐 TESTING 375px VIEWPORT ON LIVE PRODUCTION (https://frontdesk-ai-dental.vercel.app)...');

  // 10. Live Site - Patient Chat
  await page.goto('https://frontdesk-ai-dental.vercel.app', { waitUntil: 'networkidle0' });
  await checkOverflow('10. Live Vercel Production - Patient Chat', 'check-375-live-patient.png');

  // 11. Live Site - Staff Portal
  await page.goto('https://frontdesk-ai-dental.vercel.app/staff', { waitUntil: 'networkidle0' });
  await page.type('#staff-code-input', 'Staff@0369');
  await page.click('#staff-login-btn');
  await page.waitForSelector('#ticket-queue');
  await checkOverflow('11. Live Vercel Production - Staff Dashboard', 'check-375-live-staff.png');

  await browser.close();

  const allPassed = results.every(r => r.passed);
  console.log('\n==============================================');
  console.log(`🏁 375px SIDEWAYS SCROLL BATTERY: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  console.log(`   OVERALL ZERO-SCROLL STATUS: ${allPassed ? '100% CLEAN - NO SIDEWAYS SCROLL' : 'FAILED - OVERFLOW DETECTED'}`);
  console.log('==============================================');
})();
