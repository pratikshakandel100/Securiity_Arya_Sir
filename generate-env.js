// Run once: node generate-env.js  -> creates .env with random secrets
const crypto = require('crypto');
const fs = require('fs');
if (fs.existsSync('.env')) { console.log('.env already exists, not overwriting.'); process.exit(0); }
const env = [
  'PORT=3443',
  'HTTP_REDIRECT_PORT=3080',
  '# 32-byte key for AES-256-GCM (email encryption)',
  'AES_KEY=' + crypto.randomBytes(32).toString('hex'),
  '# separate key for HMAC lookup hash of the email',
  'EMAIL_HMAC_KEY=' + crypto.randomBytes(32).toString('hex'),
  'SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'),
  ''
].join('\n');
fs.writeFileSync('.env', env);
console.log('.env created with fresh random keys.');
