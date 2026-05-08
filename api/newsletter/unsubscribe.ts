import type { VercelRequest, VercelResponse } from "@vercel/node";

// Removes a contact from both newsletter audiences. Accepts POST (from the
// app) and GET (for unsubscribe links clicked from emails). GET responds
// with a friendly HTML confirmation page.

const RESEND_API_BASE = "https://api.resend.com";

async function removeFromAudience(
  audienceId: string,
  email: string,
  apiKey: string,
): Promise<void> {
  const r = await fetch(
    `${RESEND_API_BASE}/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    },
  );
  // Treat 404 (not in audience) as success — the user is effectively removed.
  if (!r.ok && r.status !== 404) {
    throw new Error(`Resend DELETE returned ${r.status}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  let email: string | undefined;
  if (req.method === "POST") {
    email = ((req.body ?? {}) as { email?: string }).email;
  } else if (req.method === "GET") {
    const q = req.query.email;
    email = typeof q === "string" ? q : undefined;
  } else {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: { message: "Invalid email" } });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res
      .status(503)
      .json({ error: { message: "Newsletter not configured" } });
  }

  const targets = [
    process.env.RESEND_AUDIENCE_WEEKLY_ID,
    process.env.RESEND_AUDIENCE_MONTHLY_ID,
  ].filter((v): v is string => !!v);
  if (!targets.length) {
    return res
      .status(503)
      .json({ error: { message: "Newsletter audiences not configured" } });
  }

  const lower = email.toLowerCase().trim();
  try {
    await Promise.all(
      targets.map((id) => removeFromAudience(id, lower, apiKey)),
    );
  } catch (e: any) {
    return res
      .status(502)
      .json({ error: { message: e?.message ?? "Unsubscribe failed" } });
  }

  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Unsubscribed — H2O to You</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#020617;color:#e2e8f0;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
  .box{background:#0d1f35;border:1px solid #1e3a5f;border-radius:14px;padding:32px;max-width:480px;text-align:center}
  h1{font-size:22px;font-weight:800;margin:0 0 12px;color:#38bdf8}
  p{color:#94a3b8;line-height:1.5;font-size:14px;margin:0 0 8px}
  .email{color:#e2e8f0;font-weight:700}
</style></head><body>
<div class="box">
  <h1>You're unsubscribed</h1>
  <p><span class="email">${escapeHtml(lower)}</span> has been removed from H2O to You newsletters.</p>
  <p>If you change your mind, you can re-subscribe from the app's Settings screen at any time.</p>
</div></body></html>`);
  }

  return res.status(200).json({ ok: true });
}
