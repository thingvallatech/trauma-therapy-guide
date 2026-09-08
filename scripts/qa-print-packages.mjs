import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const baseURL=process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4322';
const outputDirectory=process.env.PRINT_QA_OUTPUT || '/tmp/traumasite-print-qa';
const browser=await chromium.launch();
try {
  const page=await browser.newPage();
  await mkdir(outputDirectory,{recursive:true});
  for (const lang of ['en','es']) {
    await page.goto(`${baseURL}/${lang==='es'?'es/':''}clinicians/emdr/print-package`);
    await page.locator(lang==='es'?'#print-selected':'#print-btn').waitFor();
    await page.waitForFunction(()=>!document.querySelector('#print-selected, #print-btn').disabled);
    await page.pdf({path:`${outputDirectory}/${lang}.pdf`,format:'Letter',printBackground:true});
    console.log(`Printed ${lang} package.`);
  }
} finally {await browser.close();}
