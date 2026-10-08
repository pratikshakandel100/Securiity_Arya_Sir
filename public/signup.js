document.getElementById('f').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.className = 'msg err'; msg.textContent = 'Please enter a valid email address.'; return; }
  const r = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const d = await r.json();
  msg.className = 'msg ' + (r.ok ? 'ok' : 'err');
  msg.textContent = d.message || d.error;
  if (r.ok) setTimeout(() => location.href = '/login.html', 1200);
});
