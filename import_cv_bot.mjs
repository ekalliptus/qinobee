import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

async function main() {
  const pdfData = new Uint8Array(fs.readFileSync('Web Developer_Haikal Akhalul Azhar.pdf'));
  const loadingTask = pdfjs.getDocument({ data: pdfData });
  const doc = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(' ') + '\n';
  }

  const cookieMatch = fs.readFileSync('/tmp/cookies.txt', 'utf8').match(/qb_session\s+([^\s]+)/);
  const cookieStr = cookieMatch ? `qb_session=${cookieMatch[1]}` : '';

  console.log(`Extracted ${fullText.length} chars. Posting...`);

  const res = await fetch('https://qinobee.ekalliptus.workers.dev/api/resume/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieStr,
      'Origin': 'https://qinobee.ekalliptus.workers.dev',
      'Referer': 'https://qinobee.ekalliptus.workers.dev/app/resume/new'
    },
    body: JSON.stringify({
      text: fullText,
      title: 'Haikal Akhalul Azhar CV',
      language: 'id',
      templateId: 'modern',
      useAi: true
    })
  });
  
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${text}`);
}

main().catch(console.error);