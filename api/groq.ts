import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadGroqKey(): string | undefined {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  for (const name of [".env.local", ".env"]) {
    try {
      const m = readFileSync(join(process.cwd(), name), "utf8").match(
        /^\s*GROQ_API_KEY\s*=\s*(.+)\s*$/m,
      );
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {
      // file missing or unreadable — try next
    }
  }
  return undefined;
}

const GROQ_KEY = loadGroqKey();

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const RATE_MAP_SOFT_CAP = 1000;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > RATE_MAP_SOFT_CAP) {
    hits.forEach((v, k) => {
      if (!v.length || now - v[v.length - 1] >= RATE_WINDOW_MS) hits.delete(k);
    });
  }
  return false;
}

function clientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0].trim();
  if (Array.isArray(xff) && xff.length) return xff[0];
  return req.socket?.remoteAddress ?? "unknown";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  if (isRateLimited(clientIp(req))) {
    return res
      .status(429)
      .json({ error: { message: "Too many requests — try again in a minute." } });
  }

  if (!GROQ_KEY) {
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
          Authorization: `Bearer ${GROQ_KEY}`,
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
