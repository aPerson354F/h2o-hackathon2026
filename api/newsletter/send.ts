import type { VercelRequest, VercelResponse } from "@vercel/node";

// Cron-driven newsletter sender. Vercel Cron hits this with ?frequency=weekly
// or ?frequency=monthly on the configured schedule. Auth is enforced via the
// CRON_SECRET env var (Vercel automatically attaches it as a Bearer token to
// outbound cron requests when the env var is set).
//
// On invocation:
//   1. Fetches a fresh statewide-water snapshot from /api/cdec.
//   2. Composes an HTML + plain-text email tailored to the chosen cadence.
//   3. Creates a Resend Broadcast against the matching audience and sends it.
//
// The Resend Broadcasts API automatically appends a List-Unsubscribe header
// and a one-click unsubscribe link, satisfying CAN-SPAM and RFC 8058.
//
// Test mode (?testMode=1&to=<email>) bypasses Broadcasts entirely and sends a
// single email via /emails — useful while we're still on the resend.dev
// sandbox (which forbids Broadcasts but allows direct sends to the Resend
// account owner). Still gated by CRON_SECRET. Once a custom domain is
// verified in Resend, switch back to the Broadcasts path.

const RESEND_API_BASE = "https://api.resend.com";

type CdecPayload = {
  generatedAt: string;
  reservoirs: Array<{
    id: string;
    cdec: string;
    region: string;
    river: string;
    name: string;
    capacityAF: number;
    currentAF: number | null;
    currentPct: number | null;
    asOf: string | null;
  }>;
};

function selfBaseUrl(req: VercelRequest): string {
  const host = req.headers.host;
  if (host) return `https://${host}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://h2otoyou.vercel.app";
}

async function fetchCdec(req: VercelRequest): Promise<CdecPayload> {
  const url = `${selfBaseUrl(req)}/api/cdec`;
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`CDEC fetch failed: HTTP ${r.status}`);
  return (await r.json()) as CdecPayload;
}

function summarize(payload: CdecPayload) {
  const valid = payload.reservoirs.filter((r) => r.currentPct != null);
  const avg = valid.length
    ? Math.round(
        valid.reduce((s, r) => s + (r.currentPct ?? 0), 0) / valid.length,
      )
    : null;
  const byRegion = new Map<
    string,
    { name: string; pct: number | null; asOf: string | null }[]
  >();
  for (const r of payload.reservoirs) {
    const arr = byRegion.get(r.region) ?? [];
    arr.push({ name: r.name, pct: r.currentPct, asOf: r.asOf });
    byRegion.set(r.region, arr);
  }
  const asOf =
    payload.reservoirs.find((r) => r.asOf)?.asOf ??
    payload.generatedAt.split("T")[0];
  return { avg, byRegion, asOf };
}

function regionRow(name: string, pct: number | null): string {
  const display = pct == null ? "—" : `${pct}%`;
  const color = pct == null ? "#94a3b8" : pct < 50 ? "#ef4444" : pct < 75 ? "#f59e0b" : "#22c55e";
  return `<tr>
    <td style="padding:6px 0;color:#0f172a;font-size:13px">${escapeHtml(name)}</td>
    <td style="padding:6px 0;color:${color};font-size:13px;font-weight:700;text-align:right">${display}</td>
  </tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmail(args: {
  avg: number | null;
  byRegion: Map<string, { name: string; pct: number | null }[]>;
  asOf: string;
  frequency: "weekly" | "monthly";
}): { html: string; text: string; subject: string } {
  const { avg, byRegion, asOf, frequency } = args;
  const cadenceLabel = frequency === "weekly" ? "Weekly" : "Monthly";
  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const subject = `California water update — ${dateLabel}`;

  const regionsHtml = Array.from(byRegion.entries())
    .map(
      ([region, list]) => `
      <h3 style="font-size:14px;font-weight:800;color:#0f172a;margin:18px 0 6px">${escapeHtml(region)}</h3>
      <table style="width:100%;border-collapse:collapse">
        ${list.map((l) => regionRow(l.name, l.pct)).join("")}
      </table>`,
    )
    .join("");

  const avgPct = avg == null ? "—" : `${avg}%`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#f1f5f9;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e2e8f0">
    <p style="font-size:11px;font-weight:800;color:#38bdf8;letter-spacing:1px;margin:0 0 6px;text-transform:uppercase">${cadenceLabel} water update · ${escapeHtml(dateLabel)}</p>
    <h1 style="font-size:22px;margin:0 0 16px;color:#0f172a">California reservoirs at a glance</h1>
    <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;padding:20px;border-radius:10px;margin-bottom:18px">
      <div style="font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:0.6px">Statewide reservoir storage</div>
      <div style="font-size:40px;font-weight:800;margin-top:4px;line-height:1">${avgPct}</div>
      <div style="font-size:11px;opacity:0.7;margin-top:6px">As of ${escapeHtml(asOf)}</div>
    </div>
    ${regionsHtml}
    <p style="font-size:12px;color:#64748b;margin-top:24px;line-height:1.5">
      Data sourced from the California Data Exchange Center
      (cdec.water.ca.gov). Values are provisional and may be revised.
    </p>
    <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0" />
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0">
      You're receiving this because you opted in via the H2O to You app.
    </p>
  </div>
</body></html>`;

  const regionsText = Array.from(byRegion.entries())
    .map(
      ([region, list]) =>
        `${region}\n${list
          .map(
            (l) =>
              `  - ${l.name}: ${l.pct == null ? "—" : `${l.pct}%`}`,
          )
          .join("\n")}`,
    )
    .join("\n\n");

  const text = `${cadenceLabel} water update — ${dateLabel}

Statewide reservoir storage: ${avgPct}
As of ${asOf}

${regionsText}

Data sourced from the California Data Exchange Center (cdec.water.ca.gov).
Values are provisional and may be revised.

You're receiving this because you opted in via the H2O to You app.`;

  return { html, text, subject };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Auth: when CRON_SECRET is set, Vercel Cron forwards it as a Bearer token.
  // Reject anything that doesn't match.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${expected}`) {
      return res
        .status(401)
        .json({ error: { message: "Unauthorized" } });
    }
  }

  const frequency = req.query.frequency;
  if (frequency !== "weekly" && frequency !== "monthly") {
    return res
      .status(400)
      .json({ error: { message: "?frequency=weekly|monthly required" } });
  }

  const testMode = req.query.testMode === "1";
  const testTo =
    typeof req.query.to === "string" ? req.query.to.trim() : "";
  if (testMode && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo)) {
    return res
      .status(400)
      .json({ error: { message: "?testMode=1 requires a valid ?to=<email>" } });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId =
    frequency === "weekly"
      ? process.env.RESEND_AUDIENCE_WEEKLY_ID
      : process.env.RESEND_AUDIENCE_MONTHLY_ID;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ?? "H2O to You <onboarding@resend.dev>";

  if (!apiKey || (!testMode && !audienceId)) {
    return res
      .status(503)
      .json({ error: { message: "Newsletter not configured" } });
  }

  try {
    const cdec = await fetchCdec(req);
    const summary = summarize(cdec);
    const { html, text, subject } = buildEmail({ ...summary, frequency });

    // Test mode bypasses Broadcasts (which require a verified custom domain)
    // and sends a single email via /emails. Combined with the resend.dev
    // sandbox sender — which only delivers to the account owner — this lets
    // us preview the rendered newsletter without buying a domain. Production
    // sends still go through the Broadcasts path below.
    if (testMode) {
      const r = await fetch(`${RESEND_API_BASE}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [testTo],
          subject: `[TEST] ${subject}`,
          html,
          text,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) {
        const detail = await r.text();
        return res
          .status(502)
          .json({ error: { message: "Resend test send failed", detail } });
      }
      const sent = (await r.json()) as { id?: string };
      return res
        .status(200)
        .json({ ok: true, testMode: true, to: testTo, id: sent.id });
    }

    const create = await fetch(`${RESEND_API_BASE}/broadcasts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audience_id: audienceId,
        from: fromEmail,
        subject,
        html,
        text,
        name: `H2O ${frequency} ${new Date().toISOString().split("T")[0]}`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!create.ok) {
      const detail = await create.text();
      return res
        .status(502)
        .json({
          error: { message: "Resend create-broadcast failed", detail },
        });
    }
    const broadcast = (await create.json()) as { id: string };

    const send = await fetch(
      `${RESEND_API_BASE}/broadcasts/${broadcast.id}/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!send.ok) {
      const detail = await send.text();
      return res
        .status(502)
        .json({ error: { message: "Resend send failed", detail } });
    }

    return res
      .status(200)
      .json({ ok: true, frequency, broadcastId: broadcast.id });
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: { message: e?.message ?? "Send failed" } });
  }
}
