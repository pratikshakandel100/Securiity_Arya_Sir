const crypto = require('crypto');

// AES-256 key derived from a passphrase (your name) using scrypt,
// which stretches it to exactly 32 bytes.
if (!process.env.AES_PASSPHRASE) {
  throw new Error('Set AES_PASSPHRASE in .env (example: AES_PASSPHRASE=Pratiksha)');
}
const AES_KEY = crypto.scryptSync(
  process.env.AES_PASSPHRASE,
  process.env.AES_SALT || 'secure-auth-lab-salt',
  32
);

const HMAC_KEY = Buffer.from(process.env.EMAIL_HMAC_KEY || '', 'hex');
if (HMAC_KEY.length !== 32) {
  throw new Error('EMAIL_HMAC_KEY must be 32 bytes (64 hex chars). Run: node generate-env.js');
}

// AES-256-GCM: confidentiality + integrity. A fresh random IV for every encryption.
function encryptEmail(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map(b => b.toString('base64')).join('.');
}

function decryptEmail(stored) {
  const [iv, tag, enc] = stored.split('.').map(s => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// Random IVs make ciphertext non-searchable, so we store a keyed hash (HMAC)
// of the email purely for lookup/uniqueness. It cannot be reversed to the email.
function emailLookupHash(email) {
  return crypto.createHmac('sha256', HMAC_KEY).update(email).digest('hex');
}

module.exports = { encryptEmail, decryptEmail, emailLookupHash };