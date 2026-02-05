// Use VITE_API_ORIGIN in .env (e.g. http://localhost:3001) when the dev proxy
// isn't used (e.g. you open the app on a different port than the Vite dev server).
// Leave unset to use relative /api (proxied to backend by Vite).
const origin = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_ORIGIN;
export const API_BASE = origin ? origin.replace(/\/$/, "") : "";
