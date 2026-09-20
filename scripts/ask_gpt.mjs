import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const promptText = fs.readFileSync('scripts/review_prompt.txt', 'utf8').trim();

console.log('Sending prompt to ChatGPT via opencli...');
// Use execFileSync to avoid cmd argument splitting issues
const sendRes = spawnSync('opencli.cmd', ['chatgpt', 'send', promptText], {
  encoding: 'utf8',
  stdio: 'pipe'
});

console.log('Send output:', sendRes.stdout || sendRes.stderr);

console.log('Polling ChatGPT response...');
let lastText = '';
for (let i = 0; i < 30; i++) {
  // wait 5s
  execFileSync('node', ['-e', 'setTimeout(()=>{}, 5000)']);

  const readRes = spawnSync('opencli.cmd', ['chatgpt', 'read', '-f', 'json'], {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (readRes.status === 0 && readRes.stdout) {
    try {
      const data = JSON.parse(readRes.stdout);
      const msgs = Array.isArray(data) ? data : data.messages || [];
      const assistant = msgs.filter(m => (m.role || '').toLowerCase() === 'assistant');
      if (assistant.length > 0) {
        const text = assistant[assistant.length - 1].text || '';
        if (text.length > 100 && text === lastText) {
          console.log('\n=== CHATGPT RESPONSE RECEIVED ===\n');
          console.log(text);
          fs.writeFileSync('docs/phase-c1/gpt-review.md', text, 'utf8');
          console.log('\nSaved to docs/phase-c1/gpt-review.md');
          process.exit(0);
        }
        lastText = text;
        console.log(`[${(i + 1) * 5}s] Generating... (${text.length} chars)`);
      } else {
        console.log(`[${(i + 1) * 5}s] Waiting for assistant message...`);
      }
    } catch (e) {
      console.log(`[${(i + 1) * 5}s] Parse waiting:`, e.message);
    }
  } else {
    console.log(`[${(i + 1) * 5}s] Read attempt returned:`, readRes.stderr?.trim() || readRes.stdout?.trim());
  }
}

if (lastText) {
  console.log('\nSaving captured response...');
  fs.writeFileSync('docs/phase-c1/gpt-review.md', lastText, 'utf8');
}
