/**
 * Decap CMS GitHub OAuth proxy (Cloudflare Worker).
 *
 * Deploy as a Cloudflare Worker (free tier).
 * Then set in `admin/config.yml`:
 *   base_url: https://<your-worker-subdomain>.workers.dev
 *   auth_endpoint: auth
 *
 * Secrets/env vars to set in Cloudflare:
 * - OAUTH_CLIENT_ID
 * - OAUTH_CLIENT_SECRET
 * - OAUTH_REDIRECT_URI   (e.g. https://<your-worker-subdomain>.workers.dev/callback)
 * - OAUTH_ORIGIN         (your site origin, e.g. https://konrad-simon.com or your kinsta domain)
 *
 * Also create a GitHub OAuth App:
 * - Authorization callback URL: https://<your-worker-subdomain>.workers.dev/callback
 */

function html(body) {
  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

function badRequest(msg) {
  return new Response(msg, { status: 400 });
}

function ensure(v, name) {
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function base64UrlEncode(str) {
  // btoa expects latin1; our payload is simple ascii/json.
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str) {
  const pad = str.length % 4 ? "=".repeat(4 - (str.length % 4)) : "";
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

function getAllowedOrigins(env) {
  // Comma-separated list, e.g.:
  // "https://konrad-simon.com,http://localhost:5173,http://localhost:5174"
  const raw = env.OAUTH_ALLOWED_ORIGINS || env.OAUTH_ORIGIN || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickRequestOrigin(request, allowedOrigins) {
  const origin = request.headers.get("Origin");
  if (origin && allowedOrigins.includes(origin)) return origin;
  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowedOrigins.includes(refOrigin)) return refOrigin;
    } catch {
      // ignore
    }
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight (Decap hits endpoints via XHR)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": env.OAUTH_ORIGIN || "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "Content-Type",
        },
      });
    }

    try {
      const clientId = ensure(env.OAUTH_CLIENT_ID, "OAUTH_CLIENT_ID");
      const clientSecret = ensure(env.OAUTH_CLIENT_SECRET, "OAUTH_CLIENT_SECRET");
      const redirectUri = ensure(env.OAUTH_REDIRECT_URI, "OAUTH_REDIRECT_URI");
      const allowedOrigins = getAllowedOrigins(env);
      if (!allowedOrigins.length) throw new Error("Missing env var: OAUTH_ALLOWED_ORIGINS (or OAUTH_ORIGIN)");

      if (url.pathname === "/auth") {
        // Decap expects this to redirect the browser to GitHub's authorize endpoint.
        const siteId = url.searchParams.get("site_id") || "site";
        const requestOrigin = pickRequestOrigin(request, allowedOrigins) || allowedOrigins[0];
        const statePayload = { siteId, origin: requestOrigin, t: Date.now() };
        const state = base64UrlEncode(JSON.stringify(statePayload));

        const gh = new URL("https://github.com/login/oauth/authorize");
        gh.searchParams.set("client_id", clientId);
        gh.searchParams.set("redirect_uri", redirectUri);
        gh.searchParams.set("scope", "repo");
        gh.searchParams.set("state", state);
        return Response.redirect(gh.toString(), 302);
      }

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state") || "";
        if (!code) return badRequest("Missing code");

        let stateOrigin = null;
        try {
          const parsed = JSON.parse(base64UrlDecode(state));
          stateOrigin = parsed?.origin || null;
        } catch {
          // ignore
        }
        if (!stateOrigin || !allowedOrigins.includes(stateOrigin)) {
          // fallback: first allowed origin
          stateOrigin = allowedOrigins[0];
        }

        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            state,
          }),
        });
        const tokenJson = await tokenRes.json();
        if (!tokenRes.ok || !tokenJson.access_token) {
          return new Response(`OAuth failed: ${JSON.stringify(tokenJson)}`, { status: 500 });
        }

        // Decap expects a STRING message in the format:
        //   "authorization:github:success:<json>"
        // See typical Netlify/Decap OAuth proxy behavior.
        const payload = { token: tokenJson.access_token, provider: "github" };
        const message = `authorization:github:success:${JSON.stringify(payload)}`;

        return html(`<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script>
      (function () {
        var msg = ${JSON.stringify(message)};
        if (!window.opener) {
          document.body.textContent = "No opener window. Keep this tab open.";
          return;
        }

        // Two-step handshake expected by Decap:
        // 1) announce "authorizing:github"
        // 2) wait for parent response, then send "authorization:github:success:..."
        function receive(e) {
          try {
            window.removeEventListener("message", receive);
            window.opener.postMessage(msg, e.origin);
          } catch (err) {}
          setTimeout(function () { window.close(); }, 250);
        }

        window.addEventListener("message", receive, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
  </body>
</html>`);
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      return new Response(String(err?.message || err), { status: 500 });
    }
  },
};

