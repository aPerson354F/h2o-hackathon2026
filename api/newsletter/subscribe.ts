import type { VercelRequest, VercelResponse } from "@vercel/node";

// Adds a contact to the appropriate Resend audience (weekly or monthly).
// Idempotent: re-subscribing the same email is a no-op on Resend's side.

const RESEND_API_BASE = "https://api.resend.com";
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
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
  return false;
}

function clientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0].trim();
  if (Array.isArray(xff) && xff.length) return xff[0];
  return req.socket?.remoteAddress ?? "unknown";
}

function audienceIdFor(frequency: "weekly" | "monthly"): string | null {
  return frequency === "weekly"
    ? (process.env.RESEND_AUDIENCE_WEEKLY_ID ?? null)
    : (process.env.RESEND_AUDIENCE_MONTHLY_ID ?? null);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }
  if (isRateLimited(clientIp(req))) {
    return res
      .status(429)
      .json({
        error: { message: "Too many requests — try again in a minute." },
      });
  }

  const { email, frequency, firstName } = (req.body ?? {}) as {
    email?: string;
    frequency?: "weekly" | "monthly";
    firstName?: string;
  };

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: { message: "Invalid email" } });
  }
  if (frequency !== "weekly" && frequency !== "monthly") {
    return res
      .status(400)
      .json({
        error: { message: "Frequency must be 'weekly' or 'monthly'" },
      });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res
      .status(503)
      .json({ error: { message: "Newsletter not configured (RESEND_API_KEY)" } });
  }
  const audienceId = audienceIdFor(frequency);
  if (!audienceId) {
    return res
      .status(503)
      .json({
        error: { message: `Newsletter audience for ${frequency} not configured` },
      });
  }

  try {
    const r = await fetch(
      `${RESEND_API_BASE}/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          first_name: firstName?.trim() || undefined,
          unsubscribed: false,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!r.ok) {
      const detail = await r.text();
      return res
        .status(502)
        .json({ error: { message: "Resend rejected", detail } });
    }
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res
      .status(502)
      .json({ error: { message: e?.message ?? "Subscribe failed" } });
  }
}
