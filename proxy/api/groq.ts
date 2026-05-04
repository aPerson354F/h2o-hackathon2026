import type { VercelRequest, VercelResponse } from "@vercel/node";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadGroqKey(): string | undefined {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  for (const name of [".env.local", ".env"]) {
    const p = join(process.cwd(), name);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, "utf8").match(/^\s*GROQ_API_KEY\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:8083",
  "http://localhost:19006",
];

function getAllowedOrigins(): string[] {
  const fromEnv = process.env.ALLOWED_ORIGINS;
  if (!fromEnv) return DEFAULT_ALLOWED_ORIGINS;
  return fromEnv.split(",").map((s) => s.trim()).filter(Boolean);
}

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (window.length >= RATE_MAX) {
    hits.set(ip, window);
    return true;
  }
  window.push(now);
  hits.set(ip, window);
  return false;
}

function clientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0].trim();
  if (Array.isArray(xff) && xff.length) return xff[0];
  return req.socket?.remoteAddress ?? "unknown";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowed = getAllowedOrigins();
  const origin = (req.headers.origin as string | undefined) ?? "";
  const corsOrigin = allowed.includes(origin) ? origin : "";

  if (req.method === "OPTIONS") {
    if (corsOrigin) {
      res.setHeader("Access-Control-Allow-Origin", corsOrigin);
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Vary", "Origin");
    }
    return res.status(204).end();
  }

  if (origin && !corsOrigin) {
    return res.status(403).json({ error: { message: "Origin not allowed" } });
  }
  if (corsOrigin) {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader("Vary", "Origin");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  if (isRateLimited(clientIp(req))) {
    return res
      .status(429)
      .json({ error: { message: "Too many requests — try again in a minute." } });
  }

  const apiKey = loadGroqKey();
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: { message: "Server is missing GROQ_API_KEY" } });
  }

  try {
    const upstream = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(req.body),
      },
    );
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (e: any) {
    return res
      .status(502)
      .json({ error: { message: `Proxy error: ${e?.message ?? "unknown"}` } });
  }
}
