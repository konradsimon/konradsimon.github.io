## Decap CMS GitHub OAuth Proxy (Cloudflare Worker)

This is a tiny OAuth proxy so Decap CMS can login via GitHub on a static site.

### 1) Create a GitHub OAuth App

- **Homepage URL**: your site (Kinsta domain)
- **Authorization callback URL**: `https://<your-worker-subdomain>.workers.dev/callback`

Copy:
- **Client ID**
- **Client Secret**

### 2) Deploy the Worker

- Create a new Cloudflare Worker (free tier).
- Paste `oauth-proxy/worker.js` as the Worker code.
- Set Worker environment variables:
  - `OAUTH_CLIENT_ID`: GitHub Client ID
  - `OAUTH_CLIENT_SECRET`: GitHub Client Secret
  - `OAUTH_REDIRECT_URI`: `https://<your-worker-subdomain>.workers.dev/callback`
  - `OAUTH_ALLOWED_ORIGINS`: comma-separated allowed origins, e.g.
    - `https://konrad-simon.com,http://localhost:5173,http://localhost:5174`
    - must match exactly (protocol + domain + optional port, no trailing slash)

### 3) Configure Decap

Edit `admin/config.yml`:

- `repo`: `OWNER/REPO`
- `base_url`: `https://<your-worker-subdomain>.workers.dev`
- `auth_endpoint`: `auth`

Then open `/admin/` on your deployed site and login.

