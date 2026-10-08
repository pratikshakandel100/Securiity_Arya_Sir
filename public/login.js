document.getElementById('f').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('password').value }) });
  const d = await r.json();
  msg.className = 'msg ' + (r.ok ? 'ok' : 'err');
  msg.textContent = d.message || d.error;
  if (r.ok) location.href = '/dashboard.html';
});
