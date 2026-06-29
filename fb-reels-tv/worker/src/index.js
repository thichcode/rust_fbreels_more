export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'POST' && path === '/auth/init') {
      const sessionId = crypto.randomUUID();
      const qrUrl = `${url.origin}/auth/flow/${sessionId}`;
      await env.AUTH_KV.put(sessionId, JSON.stringify({ status: 'pending', cookies: null }), { expirationTtl: 300 });
      return new Response(JSON.stringify({ sessionId, qrUrl }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (request.method === 'GET' && path.startsWith('/auth/flow/')) {
      const sessionId = path.split('/').pop();
      const fbAuthUrl = `https://www.facebook.com/login.php?skip_api_login=1&api_key=0&next=https%3A%2F%2Fwww.facebook.com%2Freels%2F&display=popup&return_session=1&session_version=3&fbapp_pres=0`;
      await env.AUTH_KV.put(sessionId, JSON.stringify({ status: 'pending', cookies: null, redirectUrl: `${url.origin}/auth/callback/${sessionId}` }), { expirationTtl: 300 });
      return Response.redirect(fbAuthUrl, 302);
    }

    if (request.method === 'GET' && path.startsWith('/auth/callback/')) {
      const sessionId = path.split('/').pop();
      const cookies = request.headers.get('Cookie') || '';
      const setCookies = request.headers.get('Set-Cookie') || '';
      const data = JSON.stringify({ status: 'complete', cookies: setCookies || cookies, timestamp: Date.now() });
      await env.AUTH_KV.put(sessionId, data, { expirationTtl: 300 });
      return new Response('Login successful! You can close this window.', {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (request.method === 'GET' && path.startsWith('/auth/status/')) {
      const sessionId = path.split('/').pop();
      const data = await env.AUTH_KV.get(sessionId);
      if (!data) {
        return new Response(JSON.stringify({ status: 'not_found' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      return new Response(data, {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}
