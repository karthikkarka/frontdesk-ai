const puppeteer = require('../Hisaab/node_modules/puppeteer');
const fs = require('fs');

async function testSync() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
    executablePath: fs.existsSync(edgePath) ? edgePath : undefined
  });
  const page = await browser.newPage();
  const BASE_URL = 'http://localhost:3000';

  console.log('1. Patient opens chat and asks question...');
  await page.goto(`${BASE_URL}/?q=Do+you+do+teeth+implants%3F`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const activeTicketId = await page.evaluate(() => {
    return localStorage.getItem('bright_roots_active_ticket_id');
  });
  console.log('Patient activeTicketId is:', activeTicketId);

  console.log('2. Staff opens /staff...');
  await page.goto(`${BASE_URL}/staff`, { waitUntil: 'networkidle0' });

  // Locate the specific ticket container for this patient's active ticket
  const targetTicketSelector = `[data-ticket="${activeTicketId}"]`;
  const targetTicketEl = await page.$(targetTicketSelector);
  console.log(`Found target ticket element (${targetTicketSelector}):`, !!targetTicketEl);

  const replyText = `Dr. Meera: Dental implants are available and ready for you! [${Date.now()}]`;

  if (targetTicketEl) {
    const replyTextarea = await targetTicketEl.$('#staff-reply');
    const sendButton = await targetTicketEl.$('#staff-send');

    await replyTextarea.type(replyText);
    await sendButton.click();
    console.log('Clicked #staff-send on patient ticket.');
    await new Promise(r => setTimeout(r, 800));
  } else {
    // If not found by ID, use first
    await page.type('#staff-reply', replyText);
    await page.click('#staff-send');
    console.log('Clicked #staff-send on first ticket.');
    await new Promise(r => setTimeout(r, 800));
  }

  console.log('3. Patient returns to chat...');
  await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const messagesInChat = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.bot-msg')).map(el => el.innerText);
  });
  console.log('Messages in patient chat:\n', messagesInChat);

  const hasReply = messagesInChat.some(m => m.includes(replyText));
  console.log('Staff reply present in patient chat:', hasReply);

  await browser.close();
}

testSync();
