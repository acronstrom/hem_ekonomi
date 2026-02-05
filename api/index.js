import app from "../server/src/app.js";

/**
 * Vercel invokes this for /api (and /api/* via rewrite with ?path=...).
 * Restore the full path so Express can route correctly.
 */
export default function handler(req, res) {
  const path = req.query.path;
  if (path !== undefined && path !== "") {
    req.url = "/api" + (path.startsWith("/") ? path : "/" + path);
    req.originalUrl = req.url;
  } else if (!req.url?.startsWith("/api")) {
    req.url = "/api" + (req.url || "");
    req.originalUrl = req.url;
  }
  return app(req, res);
}
