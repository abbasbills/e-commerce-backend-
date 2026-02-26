/**
 * scripts/get-my-ip.js
 * Run with:  node scripts/get-my-ip.js
 *
 * Fetches your current public IP and prints the exact Atlas URL to whitelist it.
 */

const https = require('https');

const services = [
  { url: 'https://api.ipify.org?format=json', parse: (d) => JSON.parse(d).ip },
  { url: 'https://ifconfig.me/all.json',       parse: (d) => JSON.parse(d).ip_addr },
  { url: 'https://ipinfo.io/json',              parse: (d) => JSON.parse(d).ip },
];

function fetchIP(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

(async () => {
  let ip = null;

  for (const svc of services) {
    try {
      const raw = await fetchIP(svc.url);
      ip = svc.parse(raw);
      break;
    } catch (_) {
      // try next service
    }
  }

  if (!ip) {
    console.error('❌  Could not fetch public IP. Check your internet connection.');
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✅  Your current public IP:  ${ip}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('  To whitelist this IP on MongoDB Atlas:\n');
  console.log('  1. Open: https://cloud.mongodb.com');
  console.log('  2. Select your project → Security → Network Access');
  console.log('  3. Click  ➕ Add IP Address');
  console.log(`  4. Paste:  ${ip}  (your current IP)`);
  console.log('     OR click "Allow Access from Anywhere" (0.0.0.0/0) for dev');
  console.log('  5. Click Confirm — wait ~30 seconds for it to apply');
  console.log('  6. Restart the server:  npm run dev\n');
  console.log('  Direct link to Network Access:');
  console.log('  https://cloud.mongodb.com/v2#/security/network/accessList\n');
})();
