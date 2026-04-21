const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    console.log('Page loaded');
    
    // Switch to Dashboard/Appointment tab if needed (by default it's on Appointment? No, it's 'Dashboard' or 'Queue')
    // Wait for the 'เพิ่มนัดหมายใหม่' button and click it
    await page.waitForSelector('::-p-xpath(//button[contains(., "เพิ่มนัดหมายใหม่")])', { timeout: 5000 });
    const button = await page.$('::-p-xpath(//button[contains(., "เพิ่มนัดหมายใหม่")])');
    
    if (button) {
      console.log('Found add button, clicking...');
      await button.click();
      await new Promise(r => setTimeout(r, 2000)); // Wait to see if error happens
    } else {
      console.log('Add button not found');
    }
  } catch (e) {
    console.error('SCRIPT ERROR:', e.message);
  }
  
  await browser.close();
})();