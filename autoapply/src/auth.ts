import { randomBytes } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { config } from "./config.js";
import { db } from "./db/client.js";
import { sessions } from "./db/schema.js";
import { nowIso } from "./lib/time.js";

const COOKIE = "aa_session";

export function createSession(): string {
  const token = randomBytes(24).toString("hex");
  db.insert(sessions).values({ token, createdAt: nowIso() }).run();
  return token;
}

export function destroySession(token: string | undefined) {
  if (!token) return;
  db.delete(sessions).where(eq(sessions.token, token)).run();
}

export function sessionValid(token: string | undefined): boolean {
  if (!token) return false;
  return Boolean(db.select().from(sessions).where(eq(sessions.token, token)).get());
}

export async function requireAuth(c: Context, next: Next) {
  if (c.req.path === "/health" || c.req.path === "/api/login") {
    return next();
  }
  if (c.req.path.startsWith("/assets") || c.req.path === "/favicon.ico") {
    return next();
  }
  const token = getCookie(c, COOKIE);
  if (!sessionValid(token)) {
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: "unauthorized" }, 401);
    }
    return next();
  }
  return next();
}

export function attachSessionCookie(c: Context, token: string) {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: config.publicBaseUrl.startsWith("https"),
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, COOKIE, { path: "/" });
}

export { COOKIE };
