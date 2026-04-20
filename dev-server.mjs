import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number(process.env.PORT || 5173);

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

function safeDecodeURIComponent(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function toFilePath(urlPathname) {
  const rawPath = safeDecodeURIComponent(urlPathname);
  const clean = rawPath.split("?")[0].split("#")[0];
  const withoutLeadingSlash = clean.replace(/^\/+/, "");
  const isDirLike = clean.endsWith("/");
  const normalized = path.normalize(withoutLeadingSlash);

  // Prevent directory traversal outside project root.
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return null;

  if (!normalized) {
    return path.join(__dirname, "index.html");
  }

  if (isDirLike) {
    return path.join(__dirname, normalized, "index.html");
  }
  return path.join(__dirname, normalized);
}

async function fileExists(p) {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const filePath = toFilePath(url.pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  let finalPath = filePath;

  // If path is a directory-like route, try index.html inside it.
  // (e.g. /admin -> /admin/index.html)
  if (!(await fileExists(finalPath))) {
    const maybeIndex = path.join(finalPath, "index.html");
    if (await fileExists(maybeIndex)) finalPath = maybeIndex;
  }

  if (!(await fileExists(finalPath))) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const ext = path.extname(finalPath).toLowerCase();
  const contentType = mimeByExt[ext] || "application/octet-stream";

  const headers = {
    "content-type": contentType,
    // Let Decap CMS and asset fetches work locally.
    "access-control-allow-origin": "*",
    "cache-control": "no-store"
  };

  try {
    const buf = await fs.readFile(finalPath);
    res.writeHead(200, headers);
    res.end(buf);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(String(err?.message || err));
  }
});

server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
  console.log(`- Admin:  http://localhost:${port}/admin/`);
  console.log(`- Example project: http://localhost:${port}/project.html?slug=example`);
});

