export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const loginMatch = path.match(/^\/auth\/login\/([0-9a-f-]+)$/i);
    const statusMatch = path.match(/^\/auth\/status\/([0-9a-f-]+)$/i);

    if (request.method === 'POST' && path === '/auth/init') {
      const sessionId = crypto.randomUUID();
      await env.AUTH_KV.put(sessionId, JSON.stringify({ status: 'pending' }), { expirationTtl: 300 });
      return json({ sessionId, loginUrl: `${url.origin}/auth/login/${sessionId}` });
    }

    if (request.method === 'GET' && loginMatch) {
      const sessionId = loginMatch[1];
      if (!isValidUuid(sessionId)) return new Response('Invalid session', { status: 400 });
      return html(loginForm(sessionId));
    }

    if (request.method === 'POST' && loginMatch) {
      const sessionId = loginMatch[1];
      if (!isValidUuid(sessionId)) return new Response('Invalid session', { status: 400 });
      return handleLoginSubmit(request, sessionId, env);
    }

    if (request.method === 'GET' && statusMatch) {
      const sessionId = statusMatch[1];
      if (!isValidUuid(sessionId)) return json({ status: 'invalid_session' });
      const data = await env.AUTH_KV.get(sessionId);
      return json(data ? JSON.parse(data) : { status: 'not_found' });
    }

    if (request.method === 'POST' && path === '/auth/debug') {
      return json({ ok: true });
    }

    return new Response('Not Found', { status: 404 });
  }
};

function isValidUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function handleLoginSubmit(request, sessionId, env) {
  const existing = await env.AUTH_KV.get(sessionId);
  if (!existing) {
    return html(loginForm(sessionId, 'Session expired or invalid. Please start over.'));
  }

  let email, pass;
  const ct = request.headers.get('Content-Type') || '';
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const fd = await request.formData();
    email = fd.get('email');
    pass = fd.get('pass');
  } else {
    try {
      const body = await request.json();
      email = body.email;
      pass = body.pass;
    } catch {}
  }

  if (!email || !pass) {
    return html(loginForm(sessionId, 'Email and password are required.'));
  }

  const fbRes = await fetch('https://m.facebook.com/login.php?skip_api_login=1&return_session=1&next=https%3A%2F%2Fwww.facebook.com%2Freels%2F', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    body: new URLSearchParams({ email, pass }).toString()
  });

  const cookies = extractSetCookies(fbRes.headers);

  if (cookies.length > 0 && hasSessionCookies(cookies)) {
    await env.AUTH_KV.put(sessionId, JSON.stringify({ status: 'complete', cookies }), { expirationTtl: 300 });
    return html(loginSuccessHtml());
  }

  if (cookies.length > 0) {
    await env.AUTH_KV.put(sessionId, JSON.stringify({ status: 'error', error: 'Facebook did not return a valid session' }), { expirationTtl: 300 });
    return html(loginForm(sessionId, 'Facebook did not return a valid session. Please try again.'));
  }

  const text = await fbRes.text().catch(() => '');

  if (text.includes('approvals_code') || text.toLowerCase().includes('two-factor')) {
    await env.AUTH_KV.put(sessionId, JSON.stringify({ status: 'error', error: '2FA required' }), { expirationTtl: 300 });
    return html(loginForm(sessionId, 'Two-factor authentication is enabled on this account. Please log into Facebook directly on your phone or computer first to approve this device.'));
  }

  if (fbRes.status !== 200 || /login_error|incorrect|wrong (email|password)|invalid/i.test(text)) {
    await env.AUTH_KV.put(sessionId, JSON.stringify({ status: 'error', error: 'Invalid credentials' }), { expirationTtl: 300 });
    return html(loginForm(sessionId, 'Invalid email or password.'));
  }

  await env.AUTH_KV.put(sessionId, JSON.stringify({ status: 'error', error: 'No session received' }), { expirationTtl: 300 });
  return html(loginForm(sessionId, 'Could not complete login. Facebook may be blocking this request.'));
}

function hasSessionCookies(cookies) {
  return cookies.some(function(c) { return c.startsWith('c_user='); }) &&
         cookies.some(function(c) { return c.startsWith('xs='); });
}

function extractSetCookies(headers) {
  const result = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      result.push(value);
    }
  });
  return result;
}

function loginForm(sessionId, error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Login with Facebook</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background:#121212;color:#e4e6eb;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}
.container{background:#242526;border-radius:12px;padding:32px 24px;width:100%;max-width:380px;box-shadow:0 2px 12px rgba(0,0,0,.3)}
h1{font-size:22px;font-weight:600;margin-bottom:24px;text-align:center}
label{display:block;font-size:14px;font-weight:500;margin-bottom:6px;color:#b0b3b8}
input{width:100%;padding:12px 14px;border:1px solid #3e4042;border-radius:8px;font-size:16px;background:#3a3b3c;color:#e4e6eb;outline:none;transition:border-color .2s;margin-bottom:16px}
input:focus{border-color:#2d88ff}
button{width:100%;padding:12px;background:#2d88ff;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:background .2s;margin-top:4px}
button:hover{background:#1877f2}
button:disabled{opacity:.6;cursor:not-allowed}
.error{background:#3e1f1f;border:1px solid #f02849;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:14px;color:#f02849}
.warning{background:#3e3520;border:1px solid #f5a623;border-radius:8px;padding:10px 14px;margin-top:16px;font-size:12px;color:#f5a623;line-height:1.4}
.spinner{display:none;text-align:center;margin-top:16px;width:100%}
.spinner.active{display:block}
.spinner::after{content:'';display:inline-block;width:20px;height:20px;border:2px solid #555;border-top-color:#2d88ff;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="container">
<h1>Login with Facebook</h1>
${error ? `<div class="error">${esc(error)}</div>` : ''}
<form method="POST" action="/auth/login/${sessionId}" id="loginForm" onsubmit="this.querySelector('button').disabled=true;this.querySelector('.spinner').classList.add('active')">
<label for="email">Email or Phone</label>
<input type="text" id="email" name="email" placeholder="Email or phone number" autocomplete="username" required>
<label for="pass">Password</label>
<input type="password" id="pass" name="pass" placeholder="Password" autocomplete="current-password" required>
<button type="submit">Log In</button>
<div class="spinner"></div>
</form>
<div class="warning">Only use this login for Facebook Reels access. Do not enter a password you reuse on other services.</div>
</div>
</body>
</html>`;
}

function loginSuccessHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login Successful</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background:#121212;color:#e4e6eb;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}
.container{background:#242526;border-radius:12px;padding:40px;text-align:center;max-width:400px;box-shadow:0 2px 12px rgba(0,0,0,.3)}
.icon{font-size:48px;margin-bottom:16px}
h2{font-size:20px;margin-bottom:8px}
p{font-size:14px;color:#b0b3b8;margin-bottom:16px}
</style>
</head>
<body>
<div class="container">
<div class="icon">&#10003;</div>
<h2>Login Successful</h2>
<p>Your Facebook session has been linked. You can close this window and return to your TV.</p>
</div>
</body>
</html>`;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function html(body) {
  return new Response(body, {
    headers: { 'Content-Type': 'text/html;charset=utf-8' }
  });
}
