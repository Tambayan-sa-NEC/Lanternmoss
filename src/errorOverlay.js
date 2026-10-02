/* Classic (non-module) script loaded before the game: if anything throws, show it on screen.
   The usual cause is no internet connection, since Three.js comes from a CDN. */
window.addEventListener('error', e => {
  const el = document.getElementById('err'); if (!el) return; el.style.display = 'block';
  el.textContent = 'Error: ' + e.message + ' (an internet connection is needed to load Three.js from the CDN)';
});
