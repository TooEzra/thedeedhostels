import path from "node:path";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  return v;
}

/** Environment config. Getters so each value is validated only where it's used (e.g. the seed script doesn't need AUTH_SECRET). */
export const config = {
  get port() {
    return Number(process.env.PORT) || 4000;
  },
  get mongoUri() {
    return need("MONGODB_URI");
  },
  get authSecret() {
    const s = need("AUTH_SECRET");
    if (s.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
    return s;
  },
  get frontendUrls(): string[] {
    return (process.env.FRONTEND_URL || "http://localhost:3000")
      .split(",")
      .map((s) => s.trim().replace(/\/$/, ""))
      .filter(Boolean);
  },
  get dueDay(): number {
    const n = Number(process.env.DUE_DAY);
    return Number.isInteger(n) && n >= 1 && n <= 28 ? n : 5;
  },
  get uploadDir() {
    return path.resolve(process.env.UPLOAD_DIR || "./uploads");
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
  get trustProxy() {
    return process.env.TRUST_PROXY === "1";
  },
};
