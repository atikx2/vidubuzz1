const encoder = new TextEncoder();
const SESSION_COOKIE = "__Secure-vidubuzz_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;
// Cloudflare Web Crypto supports PBKDF2 up to 100,000 iterations.
const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_FORMAT = "pbkdf2-sha256";

export interface D1Result<T = unknown> {
  results?: T[];
  success?: boolean;
  meta?: { changes?: number };
}

export interface D1PreparedStatement {
  bind(...values: Array<string | number | null>): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface AdminEnv {
  DB?: D1Database;
  ADMIN_EMAIL?: string;
  ADMIN_INITIAL_PASSWORD?: string;
  ADMIN_PASSWORD_PEPPER?: string;
  ADMIN_SESSION_SECRET?: string;
}

export interface PagesContext<E = AdminEnv> {
  request: Request;
  env: E;
}

export type AdminRow = {
  email: string;
  password_salt: string;
  password_hash: string;
  session_version: number;
  must_change_password: number;
};

type SessionClaims = { sub: string; sid: string; ver: number; exp: number };
type SessionRow = { email: string; session_version: number; must_change_password: number; token_version: number };

export class ApiError extends Error {
  constructor(message: string, public status: number, public headers?: HeadersInit) {
    super(message);
  }
}

export function jsonResponse(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(body), { status, headers });
}

export function apiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ApiError) return jsonResponse({ error: error.message }, error.status, error.headers);
  return jsonResponse({ error: fallback }, 503);
}

export function adminEmail(env: AdminEnv) {
  return (env.ADMIN_EMAIL || "atikhasan315377@gmail.com").trim().toLowerCase();
}

export function adminConfigReady(env: AdminEnv) {
  return Boolean(env.DB && (env.ADMIN_PASSWORD_PEPPER?.length ?? 0) >= 32
    && (env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32
    && env.ADMIN_PASSWORD_PEPPER !== env.ADMIN_SESSION_SECRET);
}

export function assertAdminConfig(env: AdminEnv) {
  if (!adminConfigReady(env)) {
    throw new ApiError("Admin is not configured. Connect D1 and set the admin secret bindings.", 503);
  }
}

export function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin
    && request.headers.get("sec-fetch-site") !== "cross-site");
}

export async function readJsonObject(request: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ApiError("Send an application/json request.", 415);
  }
  if (!request.body || Number(request.headers.get("content-length")) > maxBytes) {
    throw new ApiError("Request body is missing or too large.", 413);
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ApiError("Request body is too large.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("Invalid object");
    return result as Record<string, unknown>;
  } catch {
    throw new ApiError("Invalid JSON request.", 400);
  }
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encoding");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function privateKeyHash(value: string, secret: string) {
  const digest = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function randomSalt() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(16)));
}

async function derivePassword(password: string, salt: string, iterations: number) {
  const saltBytes = base64UrlToBytes(salt);
  if (saltBytes.byteLength !== 16) throw new Error("Invalid salt");
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations }, key, 256);
}

export async function makePasswordHash(password: string, salt: string, pepper: string) {
  const derived = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  const digest = await crypto.subtle.sign("HMAC", await hmacKey(pepper), derived);
  return `${PASSWORD_FORMAT}$${PASSWORD_ITERATIONS}$${bytesToBase64Url(new Uint8Array(digest))}`;
}

export async function verifyPassword(password: string, salt: string, hash: string, pepper: string) {
  try {
    const [format, count, digest, extra] = hash.split("$");
    const iterations = Number(count);
    if (format !== PASSWORD_FORMAT || extra || iterations !== PASSWORD_ITERATIONS || !digest) return false;
    const derived = await derivePassword(password, salt, iterations);
    return await crypto.subtle.verify("HMAC", await hmacKey(pepper), base64UrlToBytes(digest), derived);
  } catch {
    return false;
  }
}

async function createSessionToken(claims: SessionClaims, secret: string) {
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify(claims)));
  return `${payload}.${await privateKeyHash(payload, secret)}`;
}

async function verifySessionToken(token: string, secret: string): Promise<SessionClaims | null> {
  try {
    if (token.length > 2048) return null;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), base64UrlToBytes(signature), encoder.encode(payload));
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as SessionClaims;
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.sub !== "string" || claims.sub.length > 254 || !/^[A-Za-z0-9_-]{43}$/.test(claims.sid)
      || !Number.isInteger(claims.ver) || claims.ver < 1 || !Number.isInteger(claims.exp)
      || claims.exp <= now || claims.exp > now + SESSION_SECONDS) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function sessionCookie(email: string, version: number, env: AdminEnv) {
  assertAdminConfig(env);
  const secret = env.ADMIN_SESSION_SECRET!;
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const sid = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const token = await createSessionToken({ sub: email, sid, ver: version, exp }, secret);
  await env.DB!.batch([
    env.DB!.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(Math.floor(Date.now() / 1000)),
    env.DB!.prepare("INSERT INTO admin_sessions (id_hash, email, session_version, expires_at) VALUES (?, ?, ?, ?)")
      .bind(await sha256(sid), email, version, exp),
  ]);
  return `${SESSION_COOKIE}=${token}; Path=/api/admin; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/api/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

function requestCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  const entry = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry?.slice(name.length + 1);
}

export async function requireAdmin(request: Request, env: AdminEnv) {
  assertAdminConfig(env);
  const token = requestCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const claims = await verifySessionToken(token, env.ADMIN_SESSION_SECRET!);
  if (!claims || claims.sub !== adminEmail(env)) return null;
  const sessionHash = await sha256(claims.sid);
  const session = await env.DB!.prepare(`SELECT u.email, u.session_version, u.must_change_password, s.session_version AS token_version
    FROM admin_sessions s JOIN admin_users u ON u.email = s.email WHERE s.id_hash = ? AND s.expires_at > ?`)
    .bind(sessionHash, Math.floor(Date.now() / 1000)).first<SessionRow>();
  if (!session || session.email !== claims.sub || session.session_version !== claims.ver || session.token_version !== claims.ver) return null;
  return { email: session.email, sessionVersion: session.session_version, mustChangePassword: Boolean(session.must_change_password), sessionHash };
}
