const puppeteer = require('../Hisaab/node_modules/puppeteer');
const fs = require('fs');

async function testStaffSorting() {
  console.log('🧪 Starting Rigorous Ticket Sorting & Priority Verification Battery (Local + Live Vercel)...\n');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  if (fs.existsSync(edgePath)) {
    launchOptions.executablePath = edgePath;
  }

  const browser = await puppeteer.launch(launchOptions);
  let totalPassed = 0;
  let totalFailed = 0;

  async function runSuiteOnTarget(baseUrl, targetName) {
    console.log(`\n======================================================`);
    console.log(`🎯 TESTING TARGET: ${targetName} (${baseUrl})`);
    console.log(`======================================================`);

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });

    function assert(condition, message, details = '') {
      if (condition) {
        console.log(`  ✅ PASS: ${message} ${details ? '(' + details + ')' : ''}`);
        totalPassed++;
      } else {
        console.error(`  ❌ FAIL: ${message} ${details ? '(' + details + ')' : ''}`);
        totalFailed++;
      }
    }

    try {
      await page.goto(`${baseUrl}/staff?code=Staff@0369`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#ticket-queue');

      const now = Date.now();
      // Seed controlled dataset with distinct creation timestamps
      // U1: Urgent created 30m ago (oldest urgent)
      // U2: Urgent created 10m ago (newer urgent)
      // H1: Needs Human created 45m ago (oldest human)
      // H2: Needs Human created 15m ago (newer human)
      // A1: Answered created 60m ago (oldest answered)
      // A2: Answered created 20m ago (newer answered)
      const testTickets = [
        {
          id: 'TICK-H2-HUMAN-NEW',
          patientSessionId: 'sess_h2',
          query: 'H2: Inquiring about Invisalign cost (15m ago)',
          status: 'needs human',
          createdAt: now - 15 * 60 * 1000,
          updatedAt: now - 15 * 60 * 1000,
          messages: [{ id: 'm1', sender: 'patient', text: 'H2 query', timestamp: now - 15 * 60 * 1000 }]
        },
        {
          id: 'TICK-U2-URGENT-NEW',
          patientSessionId: 'sess_u2',
          query: 'U2: Severe toothache emergency (10m ago)',
          status: 'urgent',
          createdAt: now - 10 * 60 * 1000,
          updatedAt: now - 10 * 60 * 1000,
          messages: [{ id: 'm2', sender: 'patient', text: 'U2 query', timestamp: now - 10 * 60 * 1000 }]
        },
        {
          id: 'TICK-H1-HUMAN-OLD',
          patientSessionId: 'sess_h1',
          query: 'H1: Needs human doctor consultation (45m ago - oldest human)',
          status: 'needs human',
          createdAt: now - 45 * 60 * 1000,
          updatedAt: now - 45 * 60 * 1000,
          messages: [{ id: 'm3', sender: 'patient', text: 'H1 query', timestamp: now - 45 * 60 * 1000 }]
        },
        {
          id: 'TICK-U1-URGENT-OLD',
          patientSessionId: 'sess_u1',
          query: 'U1: Bleeding gums trauma emergency (30m ago - oldest urgent)',
          status: 'urgent',
          createdAt: now - 30 * 60 * 1000,
          updatedAt: now - 30 * 60 * 1000,
          messages: [{ id: 'm4', sender: 'patient', text: 'U1 query', timestamp: now - 30 * 60 * 1000 }]
        },
        {
          id: 'TICK-A1-ANS-OLD',
          patientSessionId: 'sess_a1',
          query: 'A1: Timing question (60m ago - oldest answered)',
          status: 'answered',
          createdAt: now - 60 * 60 * 1000,
          updatedAt: now - 20 * 60 * 1000,
          messages: [{ id: 'm5', sender: 'patient', text: 'A1 query', timestamp: now - 60 * 60 * 1000 }]
        },
        {
          id: 'TICK-A2-ANS-NEW',
          patientSessionId: 'sess_a2',
          query: 'A2: Pricing question (20m ago - newer answered)',
          status: 'answered',
          createdAt: now - 20 * 60 * 1000,
          updatedAt: now - 5 * 60 * 1000,
          messages: [{ id: 'm6', sender: 'patient', text: 'A2 query', timestamp: now - 20 * 60 * 1000 }]
        }
      ];

      await page.evaluate((tickets) => {
        localStorage.setItem('bright_roots_tickets', JSON.stringify(tickets));
        window.dispatchEvent(new CustomEvent('tickets_updated', { detail: tickets }));
      }, testTickets);

      await new Promise(r => setTimeout(r, 400));

      // TEST 1: ALL QUEUE SORTING
      console.log('📋 Test 1: All View Sorting Order (Urgent first, oldest first within category)');
      const allQueueOrder = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('#ticket-queue [data-ticket]'));
        return items.map(el => ({
          id: el.getAttribute('data-ticket'),
          status: el.getAttribute('data-status')
        }));
      });

      console.log('   Rendered All Queue IDs:', allQueueOrder.map(t => t.id));

      // 1. U1 (oldest urgent) must be #1
      assert(allQueueOrder[0]?.id === 'TICK-U1-URGENT-OLD',
        'Oldest urgent ticket (U1, 30m ago) is at the very top of the queue',
        `Found: ${allQueueOrder[0]?.id}`);

      // 2. U2 (newer urgent) must be #2
      assert(allQueueOrder[1]?.id === 'TICK-U2-URGENT-NEW',
        'Newer urgent ticket (U2, 10m ago) is second in queue',
        `Found: ${allQueueOrder[1]?.id}`);

      // 3. Urgent is always on top of Need Human
      assert(allQueueOrder[0]?.status === 'urgent' && allQueueOrder[1]?.status === 'urgent',
        'All urgent tickets appear before non-urgent tickets');

      // 4. H1 (oldest human, 45m ago) must be #3 (ahead of H2)
      assert(allQueueOrder[2]?.id === 'TICK-H1-HUMAN-OLD',
        'Oldest Needs Human ticket (H1, 45m ago) is on top of Need Human section in queue',
        `Found: ${allQueueOrder[2]?.id}`);

      // 5. H2 (newer human, 15m ago) must be #4
      assert(allQueueOrder[3]?.id === 'TICK-H2-HUMAN-NEW',
        'Newer Needs Human ticket (H2, 15m ago) is after older human ticket',
        `Found: ${allQueueOrder[3]?.id}`);

      // 6. A1 (oldest answered, 60m ago) must be before A2 (newer answered, 20m ago)
      assert(allQueueOrder[4]?.id === 'TICK-A1-ANS-OLD',
        'Oldest Answered ticket (A1, 60m ago) appears before newer answered ticket',
        `Found: ${allQueueOrder[4]?.id}`);
      assert(allQueueOrder[5]?.id === 'TICK-A2-ANS-NEW',
        'Newer Answered ticket (A2, 20m ago) appears after older answered ticket',
        `Found: ${allQueueOrder[5]?.id}`);

      // TEST 2: URGENT TAB SPECIFIC VIEW
      console.log('\n📋 Test 2: Specific Urgent Section Tab (Oldest urgent is highest priority)');
      const urgentTabBtn = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Urgent'));
      });
      await urgentTabBtn.click();
      await new Promise(r => setTimeout(r, 300));

      const urgentQueueOrder = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('#ticket-queue [data-ticket]'));
        return items.map(el => el.getAttribute('data-ticket'));
      });
      console.log('   Rendered Urgent Tab IDs:', urgentQueueOrder);

      assert(urgentQueueOrder.length === 2,
        'Urgent section tab displays only the 2 urgent tickets',
        `Found ${urgentQueueOrder.length}`);
      assert(urgentQueueOrder[0] === 'TICK-U1-URGENT-OLD',
        'In Urgent section, oldest ticket (U1, 30m ago) is #1 highest priority',
        `Found: ${urgentQueueOrder[0]}`);
      assert(urgentQueueOrder[1] === 'TICK-U2-URGENT-NEW',
        'In Urgent section, newer ticket (U2, 10m ago) is #2',
        `Found: ${urgentQueueOrder[1]}`);

      // TEST 3: NEED HUMAN TAB SPECIFIC VIEW
      console.log('\n📋 Test 3: Specific Need Human Section Tab (Oldest ticket is top priority)');
      const needHumanTabBtn = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Needs Human'));
      });
      await needHumanTabBtn.click();
      await new Promise(r => setTimeout(r, 300));

      const humanQueueOrder = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('#ticket-queue [data-ticket]'));
        return items.map(el => el.getAttribute('data-ticket'));
      });
      console.log('   Rendered Need Human Tab IDs:', humanQueueOrder);

      assert(humanQueueOrder.length === 2,
        'Need human section tab displays only the 2 need human tickets',
        `Found ${humanQueueOrder.length}`);
      assert(humanQueueOrder[0] === 'TICK-H1-HUMAN-OLD',
        'In Need Human section, oldest ticket (H1, 45m ago) is #1 on top',
        `Found: ${humanQueueOrder[0]}`);
      assert(humanQueueOrder[1] === 'TICK-H2-HUMAN-NEW',
        'In Need Human section, newer ticket (H2, 15m ago) is #2 below oldest',
        `Found: ${humanQueueOrder[1]}`);

      // TEST 4: DYNAMIC TICKET ARRIVAL (Brand new ticket does not jump ahead of older tickets)
      console.log('\n📋 Test 4: Dynamic Arrival of Brand-New Urgent & Human Tickets');
      await page.evaluate(() => {
        const raw = localStorage.getItem('bright_roots_tickets');
        const list = raw ? JSON.parse(raw) : [];
        list.unshift({
          id: 'TICK-U3-JUST-NOW',
          patientSessionId: 'sess_u3',
          query: 'U3: Emergency just happened right now!',
          status: 'urgent',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [{ id: 'm7', sender: 'patient', text: 'Brand new urgent', timestamp: Date.now() }]
        });
        list.unshift({
          id: 'TICK-H3-JUST-NOW',
          patientSessionId: 'sess_h3',
          query: 'H3: Question asked right now',
          status: 'needs human',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [{ id: 'm8', sender: 'patient', text: 'Brand new question', timestamp: Date.now() }]
        });
        localStorage.setItem('bright_roots_tickets', JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('tickets_updated', { detail: list }));
      });

      await new Promise(r => setTimeout(r, 400));

      // Switch back to All tab
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('All'));
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 300));

      const dynamicAllQueue = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('#ticket-queue [data-ticket]'));
        return items.map(el => el.getAttribute('data-ticket'));
      });
      console.log('   Rendered Dynamic Queue IDs:', dynamicAllQueue);

      assert(dynamicAllQueue[0] === 'TICK-U1-URGENT-OLD',
        'Oldest urgent ticket (U1, 30m ago) STAYS #1 even after brand new tickets arrive',
        `Found: ${dynamicAllQueue[0]}`);
      assert(dynamicAllQueue[1] === 'TICK-U2-URGENT-NEW',
        'Second urgent ticket (U2, 10m ago) STAYS #2',
        `Found: ${dynamicAllQueue[1]}`);
      assert(dynamicAllQueue[2] === 'TICK-U3-JUST-NOW',
        'Brand new urgent ticket (U3, Just now) is #3 (all urgent still precede need human)',
        `Found: ${dynamicAllQueue[2]}`);
      assert(dynamicAllQueue[3] === 'TICK-H1-HUMAN-OLD',
        'Oldest need human ticket (H1, 45m ago) STAYS top of Need Human section',
        `Found: ${dynamicAllQueue[3]}`);
      assert(dynamicAllQueue[4] === 'TICK-H2-HUMAN-NEW',
        'Second need human ticket (H2, 15m ago) is #5',
        `Found: ${dynamicAllQueue[4]}`);
      assert(dynamicAllQueue[5] === 'TICK-H3-JUST-NOW',
        'Brand new need human ticket (H3, Just now) is placed after older human tickets',
        `Found: ${dynamicAllQueue[5]}`);

      const screenshotName = targetName.toLowerCase().includes('live')
        ? 'live-vercel-staff-sorting-run.png'
        : 'test-staff-sorting-verified.png';
      await page.screenshot({ path: screenshotName });
      console.log(`  📸 Screenshot saved: ${screenshotName}`);

    } catch (err) {
      console.error(`Error on target ${targetName}:`, err);
      totalFailed++;
    } finally {
      await page.close();
    }
  }

  try {
    // 1. Run on Local Preview Server
    await runSuiteOnTarget('http://localhost:3000', 'Local Preview');

    // 2. Run on Live Vercel Production
    await runSuiteOnTarget('https://frontdesk-ai-dental.vercel.app', 'Live Vercel Production');

  } finally {
    await browser.close();
  }

  console.log(`\n======================================================`);
  console.log(`🏁 OVERALL BATTERY RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log(`======================================================\n`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

testStaffSorting();
