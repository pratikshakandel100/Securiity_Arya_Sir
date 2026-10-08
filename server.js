require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const db = require('./db');
const { encryptEmail, decryptEmail, emailLookupHash } = require('./crypto-utils');

const HTTPS_PORT = +process.env.PORT || 3443;
const HTTP_PORT = +process.env.HTTP_REDIRECT_PORT || 3080;
const BCRYPT_ROUNDS = 12;
// Dummy hash so login takes similar time whether or not the user exists
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

const app = express();
app.disable('x-powered-by');
app.use(helmet());                       // CSP, HSTS, nosniff, etc.
app.use(express.json({ limit: '10kb' }));
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 15 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' } });

// ---------- SIGNUP ----------
app.post('/api/signup', authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string')
    return res.status(400).json({ error: 'Email and password are required.' });

  const cleanEmail = email.trim().toLowerCase();
  if (!validator.isEmail(cleanEmail) || cleanEmail.length > 254)
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (password.length < 8 || Buffer.byteLength(password) > 72)
    return res.status(400).json({ error: 'Password must be 8-72 characters.' });

  const emailHash = emailLookupHash(cleanEmail);
  if (db.prepare('SELECT 1 FROM users WHERE email_hash = ?').get(emailHash))
    return res.status(409).json({ error: 'An account with this email already exists.' });

  const emailEnc = encryptEmail(cleanEmail);                       // AES-256-GCM
  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);   // bcrypt + salt
  db.prepare('INSERT INTO users (email_hash, email_enc, password_hash) VALUES (?, ?, ?)')
    .run(emailHash, emailEnc, passwordHash);

  res.status(201).json({ message: 'Account created. You can now log in.' });
});

// ---------- LOGIN ----------
app.post('/api/login', authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string')
    return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email_hash = ?')
    .get(emailLookupHash(email.trim().toLowerCase()));
  const ok = bcrypt.compareSync(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !ok) return res.status(401).json({ error: 'Invalid email or password.' }); // generic

  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Login failed.' });
    req.session.userId = user.id;
    res.json({ message: 'Login successful.' });
  });
});

// ---------- PROTECTED ----------
app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated.' });
  const user = db.prepare('SELECT email_enc, created_at FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ email: decryptEmail(user.email_enc), createdAt: user.created_at });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => { res.clearCookie('sid'); res.json({ message: 'Logged out.' }); });
});

// ---------- HTTPS SERVER ----------
const tlsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.crt')),
  minVersion: 'TLSv1.2',   // refuse SSL3/TLS1.0/TLS1.1
  honorCipherOrder: true
};
https.createServer(tlsOptions, app).listen(HTTPS_PORT, () =>
  console.log(`HTTPS server running: https://localhost:${HTTPS_PORT}`));

// Plain HTTP port ONLY redirects to HTTPS; it never serves the app or API
http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://localhost:${HTTPS_PORT}${req.url}` });
  res.end();
}).listen(HTTP_PORT, () => console.log(`HTTP :${HTTP_PORT} -> redirects to HTTPS`));
