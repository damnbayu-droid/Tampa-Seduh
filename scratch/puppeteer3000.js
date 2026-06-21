import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    console.log("Page 3000 loaded!");
    const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML);
    console.log("ROOT HTML LENGTH:", rootHtml.length);
  } catch (err) {
    console.log("Failed to load:", err.message);
  }
  
  await browser.close();
})();
