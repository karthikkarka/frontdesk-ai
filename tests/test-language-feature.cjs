const puppeteer = require('../Hisaab/node_modules/puppeteer');
const fs = require('fs');

async function testLanguageFeature() {
  console.log('🧪 Starting Dual-Target Language Feature Verification (Local + Live Vercel)...\n');

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
    await page.setViewport({ width: 375, height: 667 });

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
      // -----------------------------------------------------------
      // STEP 1: Verify Default Language (English) at 375px
      // -----------------------------------------------------------
      console.log('📋 Test 1: Default Language (English) on Load at 375px');
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      await page.evaluate(() => localStorage.removeItem('patient_language'));
      await page.reload({ waitUntil: 'networkidle0' });

      // Verification: Staff Login button relocated to top row, exactly left of theme toggle
      const staffLoginBtn = await page.$('#staff-login-tab-btn');
      assert(!!staffLoginBtn, 'Staff Login button (#staff-login-tab-btn) exists in header');

      const staffLoginText = await page.$eval('#staff-login-tab-btn', el => el.textContent.trim());
      assert(staffLoginText.includes('Staff Login'), `Staff Login button text is strictly in English: "${staffLoginText}"`);

      // Verify Staff Login is positioned exactly to the left of the theme toggle
      const layoutPositions = await page.evaluate(() => {
        const staffBtn = document.querySelector('#staff-login-tab-btn');
        const themeBtn = document.querySelector('#theme-toggle-btn');
        if (!staffBtn || !themeBtn) return null;
        const staffRect = staffBtn.getBoundingClientRect();
        const themeRect = themeBtn.getBoundingClientRect();
        return {
          staffRight: staffRect.right,
          themeLeft: themeRect.left,
          staffTop: staffRect.top,
          themeTop: themeRect.top,
          isLeftOfTheme: staffRect.right <= themeRect.left + 5 && Math.abs(staffRect.top - themeRect.top) < 15
        };
      });
      assert(layoutPositions && layoutPositions.isLeftOfTheme, 'Staff Login button is positioned on top, EXACTLY left of the dark/light mode toggle');

      // Verification: Language Selector relocated to the right side of the patient chart
      const langSelector = await page.$('#language-selector');
      assert(!!langSelector, 'Language selector #language-selector exists on the patient chart');

      const chartRowPositions = await page.evaluate(() => {
        const chatTab = document.querySelector('#patient-chat-tab-btn');
        const selector = document.querySelector('#language-selector');
        if (!chatTab || !selector) return null;
        const chatRect = chatTab.getBoundingClientRect();
        const selRect = selector.getBoundingClientRect();
        return {
          isSelectorOnRight: selRect.left >= chatRect.right,
          chatLeft: chatRect.left,
          selRight: selRect.right
        };
      });
      assert(chartRowPositions && chartRowPositions.isSelectorOnRight, 'Language selector is positioned on the right side of the patient chart');

      // Verification: Emergency label in English
      const emergencyLabelEn = await page.$eval('#emergency-phone-label', el => el.textContent.trim());
      assert(emergencyLabelEn.startsWith('Emergency:') && emergencyLabelEn.includes('98000 00123'), `Emergency label in English starts with Emergency: ("${emergencyLabelEn}")`);

      const scrollWidthEn = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(scrollWidthEn <= 375, `375px viewport has zero horizontal scroll in English (scrollWidth = ${scrollWidthEn}px)`);

      const langBtns = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('#language-selector button'));
        return btns.map(b => b.textContent.trim());
      });
      console.log('   Language buttons found:', langBtns);
      assert(langBtns.includes('English'), 'English button exists in selector');
      assert(langBtns.includes('Hindi'), 'Hindi button exists in selector');
      assert(langBtns.includes('Telugu'), 'Telugu button exists in selector');

      const firstMsgText = await page.evaluate(() => {
        const msg = document.querySelector('.bot-msg');
        return msg ? msg.innerText : '';
      });
      assert(firstMsgText.includes('Hello! Welcome to Bright Roots Dental'), 'Initial greeting is in English by default');

      const quickRepliesEn = await page.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('div.flex-wrap button'));
        return chips.map(c => c.textContent.trim());
      });
      assert(quickRepliesEn.some(c => c.includes('Consultation Fee')), 'Quick reply Consultation Fee exists in English');
      assert(quickRepliesEn.some(c => c.includes('Saturday Hours')), 'Quick reply Saturday Hours exists in English');
      assert(quickRepliesEn.some(c => c.includes('Root Canal Cost')), 'Quick reply Root Canal Cost exists in English');
      assert(quickRepliesEn.some(c => c.includes('Children Doctor')), 'Quick reply Children Doctor exists in English');
      assert(quickRepliesEn.some(c => c.includes('Book Visit')), 'Quick reply Book Visit exists in English');
      assert(quickRepliesEn.some(c => c.includes('Emergency Contact')), 'Quick reply Emergency Contact exists in English');

      const placeholderEn = await page.$eval('#chat-input', el => el.getAttribute('placeholder'));
      assert(placeholderEn.includes('timings, doctors, prices'), `Input placeholder is in English: "${placeholderEn}"`);

      const prefix = targetName.toLowerCase().includes('live') ? 'live-vercel' : 'local';
      try {
        await page.screenshot({ path: `${prefix}-language-en-375-run.png` });
        console.log(`  📸 Screenshot saved: ${prefix}-language-en-375-run.png\n`);
      } catch (e) {
        console.log(`  (Screenshot notice: ${e.message})`);
      }

      // -----------------------------------------------------------
      // STEP 2: Switch to Hindi
      // -----------------------------------------------------------
      console.log('📋 Test 2: Switching Interface to Hindi');
      const hindiBtn = await page.$('#lang-btn-hi');
      assert(!!hindiBtn, '#lang-btn-hi exists');
      await hindiBtn.click();
      await new Promise(r => setTimeout(r, 400));

      // Verify Staff Login stays in English only even when language is Hindi
      const staffLoginTextInHindi = await page.$eval('#staff-login-tab-btn', el => el.textContent.trim());
      assert(staffLoginTextInHindi.includes('Staff Login'), `Staff Login tab stays strictly in English ("${staffLoginTextInHindi}")`);

      // Verify Emergency label changes to Hindi
      const emergencyLabelHi = await page.$eval('#emergency-phone-label', el => el.textContent.trim());
      assert(emergencyLabelHi.startsWith('आपातकालीन:') && emergencyLabelHi.includes('98000 00123'), `Emergency label changed to Hindi: "${emergencyLabelHi}"`);

      const scrollWidthHi = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(scrollWidthHi <= 375, `375px viewport has zero horizontal scroll in Hindi (scrollWidth = ${scrollWidthHi}px)`);

      const hindiMsgText = await page.evaluate(() => {
        const msg = document.querySelector('.bot-msg');
        return msg ? msg.innerText : '';
      });
      assert(hindiMsgText.includes('नमस्ते!') && hindiMsgText.includes('ब्राइट रूट्स डेंटल'), 'Welcome greeting switched completely to Hindi');

      const quickRepliesHi = await page.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('div.flex-wrap button'));
        return chips.map(c => c.textContent.trim());
      });
      assert(quickRepliesHi.some(c => c.includes('परामर्श शुल्क')), 'Quick reply contains Hindi परामर्श शुल्क (Consultation Fee)');
      assert(quickRepliesHi.some(c => c.includes('शनिवार का समय')), 'Quick reply contains Hindi शनिवार का समय (Saturday Hours)');
      assert(quickRepliesHi.some(c => c.includes('रूट कैनाल खर्च')), 'Quick reply contains Hindi रूट कैनाल खर्च (Root Canal Cost)');
      assert(quickRepliesHi.some(c => c.includes('बच्चों के डॉक्टर')), 'Quick reply contains Hindi बच्चों के डॉक्टर (Children Doctor)');
      assert(quickRepliesHi.some(c => c.includes('अपॉइंटमेंट बुक')), 'Quick reply contains Hindi अपॉइंटमेंट बुक (Book Visit)');
      assert(quickRepliesHi.some(c => c.includes('आपातकालीन संपर्क')), 'Quick reply contains Hindi आपातकालीन संपर्क (Emergency Contact)');

      const placeholderHi = await page.$eval('#chat-input', el => el.getAttribute('placeholder'));
      assert(placeholderHi.includes('समय, डॉक्टर और उपचार शुल्क'), `Input placeholder is in Hindi: "${placeholderHi}"`);

      const chatTabLabelHi = await page.evaluate(() => {
        const tab = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('मरीज़ चैट'));
        return tab ? tab.textContent.trim() : '';
      });
      assert(chatTabLabelHi.includes('मरीज़ चैट'), `Patient Chat tab label changed to Hindi: "${chatTabLabelHi}"`);

      console.log('   Clicking Hindi Quick Reply for Root Canal...');
      await page.evaluate(() => {
        const chip = Array.from(document.querySelectorAll('div.flex-wrap button')).find(b => b.textContent.includes('रूट कैनाल खर्च'));
        if (chip) chip.click();
      });
      await page.waitForFunction(() => {
        const msgs = Array.from(document.querySelectorAll('.bot-msg'));
        const last = msgs[msgs.length - 1];
        return last && !last.textContent.includes('जांचे जा रहे') && msgs.length >= 2;
      }, { timeout: 10000 });

      const botRepliesHi = await page.evaluate(() => {
        const msgs = Array.from(document.querySelectorAll('.bot-msg')).filter(m => !m.textContent.includes('जांचे जा रहे'));
        return msgs[msgs.length - 1].innerText;
      });
      assert(botRepliesHi.includes('रूट कैनाल') && botRepliesHi.includes('6,500'), 'Bot replied to Hindi query with accurate pricing and Hindi text');

      try {
        await page.screenshot({ path: `${prefix}-language-hi-375-run.png` });
        console.log(`  📸 Screenshot saved: ${prefix}-language-hi-375-run.png\n`);
      } catch (e) {
        console.log(`  (Screenshot notice: ${e.message})`);
      }

      // -----------------------------------------------------------
      // STEP 3: Switch to Telugu
      // -----------------------------------------------------------
      console.log('📋 Test 3: Switching Interface to Telugu');
      const teluguBtn = await page.$('#lang-btn-te');
      assert(!!teluguBtn, '#lang-btn-te exists');
      await teluguBtn.click();
      await new Promise(r => setTimeout(r, 400));

      // Verify Staff Login stays in English only even when language is Telugu
      const staffLoginTextInTelugu = await page.$eval('#staff-login-tab-btn', el => el.textContent.trim());
      assert(staffLoginTextInTelugu.includes('Staff Login'), `Staff Login tab stays strictly in English ("${staffLoginTextInTelugu}")`);

      // Verify Emergency label changes to Telugu
      const emergencyLabelTe = await page.$eval('#emergency-phone-label', el => el.textContent.trim());
      assert(emergencyLabelTe.startsWith('అత్యవసరం:') && emergencyLabelTe.includes('98000 00123'), `Emergency label changed to Telugu: "${emergencyLabelTe}"`);

      const scrollWidthTe = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(scrollWidthTe <= 375, `375px viewport has zero horizontal scroll in Telugu (scrollWidth = ${scrollWidthTe}px)`);

      const teluguMsgText = await page.evaluate(() => {
        const msg = document.querySelector('.bot-msg');
        return msg ? msg.innerText : '';
      });
      assert(teluguMsgText.includes('నమస్కారం!') && teluguMsgText.includes('బ్రైట్ రూట్స్ డెంటల్'), 'Welcome greeting switched completely to Telugu');

      const quickRepliesTe = await page.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('div.flex-wrap button'));
        return chips.map(c => c.textContent.trim());
      });
      assert(quickRepliesTe.some(c => c.includes('కన్సల్టేషన్ ఫీజు')), 'Quick reply contains Telugu కన్సల్టేషన్ ఫీజు (Consultation Fee)');
      assert(quickRepliesTe.some(c => c.includes('శనివారం వేళలు')), 'Quick reply contains Telugu శనివారం వేళలు (Saturday Hours)');
      assert(quickRepliesTe.some(c => c.includes('రూట్ కెనాల్ ఖర్చు')), 'Quick reply contains Telugu రూట్ కెనాల్ ఖర్చు (Root Canal Cost)');
      assert(quickRepliesTe.some(c => c.includes('పిల్లల డాక్టర్')), 'Quick reply contains Telugu పిల్లల డాక్టర్ (Children Doctor)');
      assert(quickRepliesTe.some(c => c.includes('అపాయింట్‌మెంట్ బుక్')), 'Quick reply contains Telugu అపాయింట్‌మెంట్ బుక్ (Book Visit)');
      assert(quickRepliesTe.some(c => c.includes('అత్యవసర కాంటాక్ట్')), 'Quick reply contains Telugu అత్యవసర కాంటాక్ట్ (Emergency Contact)');

      const placeholderTe = await page.$eval('#chat-input', el => el.getAttribute('placeholder'));
      assert(placeholderTe.includes('క్లినిక్ వేళలు, డాక్టర్లు మరియు ధరల గురించి'), `Input placeholder is in Telugu: "${placeholderTe}"`);

      const chatTabLabelTe = await page.evaluate(() => {
        const tab = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('రోగి చాట్'));
        return tab ? tab.textContent.trim() : '';
      });
      assert(chatTabLabelTe.includes('రోగి చాట్'), `Patient Chat tab label changed to Telugu: "${chatTabLabelTe}"`);

      console.log('   Clicking Telugu Quick Reply for Saturday Hours...');
      await page.evaluate(() => {
        const chip = Array.from(document.querySelectorAll('div.flex-wrap button')).find(b => b.textContent.includes('శనివారం వేళలు'));
        if (chip) chip.click();
      });
      await page.waitForFunction(() => {
        const msgs = Array.from(document.querySelectorAll('.bot-msg'));
        const last = msgs[msgs.length - 1];
        return last && !last.textContent.includes('పరిశీలిస్తున్నాము') && msgs.length >= 3;
      }, { timeout: 10000 });

      const botRepliesTe = await page.evaluate(() => {
        const msgs = Array.from(document.querySelectorAll('.bot-msg')).filter(m => !m.textContent.includes('పరిశీలిస్తున్నాము'));
        return msgs[msgs.length - 1].innerText;
      });
      assert(botRepliesTe.includes('శనివారం') && (botRepliesTe.includes('9:00 am') || botRepliesTe.includes('8:00 pm')), 'Bot replied to Telugu query with accurate timings in Telugu');

      try {
        await page.screenshot({ path: `${prefix}-language-te-375-run.png` });
        console.log(`  📸 Screenshot saved: ${prefix}-language-te-375-run.png\n`);
      } catch (e) {
        console.log(`  (Screenshot notice: ${e.message})`);
      }

      // -----------------------------------------------------------
      // STEP 4: Switch Back to English & LocalStorage Persistence
      // -----------------------------------------------------------
      console.log('📋 Test 4: Switching Back to English & LocalStorage Persistence');
      const englishBtn = await page.$('#lang-btn-en');
      assert(!!englishBtn, '#lang-btn-en exists');
      await englishBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const quickRepliesBackEn = await page.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('div.flex-wrap button'));
        return chips.map(c => c.textContent.trim());
      });
      assert(quickRepliesBackEn.some(c => c.includes('Consultation Fee')), 'Quick replies cleanly reverted to English');

      await page.reload({ waitUntil: 'networkidle0' });
      const storedLang = await page.evaluate(() => localStorage.getItem('patient_language'));
      assert(storedLang === 'en', `localStorage stored selected language 'en' (found ${storedLang})`);

      // -----------------------------------------------------------
      // STEP 5: Verify Staff Login button click navigates to /staff
      // -----------------------------------------------------------
      console.log('📋 Test 5: Staff Login Button Navigation & Back Navigation');
      await page.click('#staff-login-tab-btn');
      await new Promise(r => setTimeout(r, 400));
      const currentUrl = page.url();
      assert(currentUrl.includes('/staff'), `Clicking Staff Login navigates to /staff (url: ${currentUrl})`);

      const staffLoginScreen = await page.$('#staff-code-input, #ticket-queue');
      assert(!!staffLoginScreen, 'Staff screen interface loaded');

      // VERIFICATION: On the staff page, Staff Login button must NOT be visible again
      const staffLoginOnStaff = await page.$('#staff-login-tab-btn');
      assert(!staffLoginOnStaff, 'Staff Login button is NOT visible again on the staff page');

      // VERIFICATION: On the staff page, Language selection (English, Hindi, Telugu) must NOT be present
      const langSelectorOnStaff = await page.$('#language-selector');
      assert(!langSelectorOnStaff, 'Language selector (English, Hindi, Telugu) is NOT visible on the staff page');

      // VERIFICATION: Patient Chart button has only a SINGLE arrow (no duplicate arrows)
      const arrowInfo = await page.evaluate(() => {
        const btn = document.querySelector('#patient-chat-tab-btn');
        if (!btn) return null;
        const text = btn.textContent.trim();
        const svgCount = btn.querySelectorAll('svg').length;
        const rawArrowCount = (text.match(/←/g) || []).length;
        return { text, svgCount, rawArrowCount };
      });
      assert(arrowInfo && arrowInfo.rawArrowCount === 0 && arrowInfo.svgCount === 1, `Patient Chart button has exactly a single arrow icon and clean text (text: "${arrowInfo ? arrowInfo.text : ''}", svgs: ${arrowInfo ? arrowInfo.svgCount : 0})`);

      try {
        await page.screenshot({ path: `${prefix}-staff-clean-header-375.png` });
        console.log(`  📸 Screenshot saved: ${prefix}-staff-clean-header-375.png\n`);
      } catch (e) {
        console.log(`  (Screenshot notice: ${e.message})`);
      }

      // Click back to Patient Chat
      const backChatBtn = await page.$('#patient-chat-tab-btn');
      if (backChatBtn) {
        await backChatBtn.click();
        await new Promise(r => setTimeout(r, 400));
        const backUrl = page.url();
        assert(!backUrl.includes('/staff'), `Clicking Patient Chart navigates back to chat (url: ${backUrl})`);
      }

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
  console.log(`🏁 DUAL-TARGET LANGUAGE BATTERY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log(`======================================================\n`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

testLanguageFeature();
