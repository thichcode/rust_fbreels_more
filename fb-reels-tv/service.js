// NodeJS service runs on TV inside TizenBrew
// Handles auth polling + cookie persistence

const WORKER_URL = '__WORKER_URL__';

export async function pollAuth(sessionId) {
  const maxAttempts = 150;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(WORKER_URL + '/auth/status/' + sessionId);
      const data = await res.json();
      if (data.status === 'complete' && data.cookies && data.cookies.length > 0) {
        return data.cookies;
      }
      if (data.status === 'error') {
        return null;
      }
    } catch (e) {}
    await new Promise(function (r) { return setTimeout(r, 2000); });
  }
  return null;
}

export async function saveCookies(cookies) {
  try {
    var fs = require('fs');
    fs.writeFileSync('/tmp/fb_cookies.json', JSON.stringify(cookies), 'utf-8');
  } catch (e) {}
}

export async function loadCookies() {
  try {
    var fs = require('fs');
    var data = fs.readFileSync('/tmp/fb_cookies.json', 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}
