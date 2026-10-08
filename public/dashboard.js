(async () => {
  const info = document.getElementById('info');
  const r = await fetch('/api/me');
  if (!r.ok) { location.href = '/login.html'; return; }
  const d = await r.json();
  info.textContent = 'Email (decrypted from AES): ' + d.email + '\nMember since: ' + d.createdAt;
  info.style.whiteSpace = 'pre-line';
})();
document.getElementById('out').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/login.html';
});
