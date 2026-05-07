import type { VercelRequest, VercelResponse } from "@vercel/node";

// Live reservoir-conditions proxy. The CDEC daily JSON service is not
// CORS-friendly, so the browser app proxies through here. Cached at the edge
// for an hour because CDEC publishes daily and we don't need to hammer it.

const RESERVOIRS = [
  { id: "shasta",   cdec: "SHA", region: "Northern",  river: "Sacramento",     name: "Shasta",       capacityAF: 4552000 },
  { id: "trinity",  cdec: "CLE", region: "Northern",  river: "Trinity",        name: "Trinity",      capacityAF: 2447650 },
  { id: "oroville", cdec: "ORO", region: "Northern",  river: "Feather",        name: "Oroville",     capacityAF: 3537577 },
  { id: "newmel",   cdec: "NML", region: "SJ Delta",  river: "Stanislaus",     name: "New Melones",  capacityAF: 2400000 },
  { id: "donpedro", cdec: "DNP", region: "SJ Delta",  river: "Tuolumne",       name: "Don Pedro",    capacityAF: 2030000 },
  { id: "hetch",    cdec: "HTH", region: "SJ Delta",  river: "Tuolumne",       name: "Hetch Hetchy", capacityAF:  360000 },
  { id: "camanche", cdec: "CMN", region: "SJ Delta",  river: "Mokelumne",      name: "Camanche",     capacityAF:  417120 },
  { id: "newhogan", cdec: "NHG", region: "SJ Delta",  river: "Calaveras",      name: "New Hogan",    capacityAF:  317100 },
  { id: "pardee",   cdec: "PAR", region: "SJ Delta",  river: "Mokelumne",      name: "Pardee",       capacityAF:  197950 },
  { id: "sanluis",  cdec: "SNL", region: "SWP",       river: "CA Aqueduct",    name: "San Luis",     capacityAF: 2041000 },
  { id: "castaic",  cdec: "CAS", region: "SWP",       river: "CA Aqueduct",    name: "Castaic",      capacityAF:  325000 },
  { id: "perris",   cdec: "PRR", region: "SWP",       river: "CA Aqueduct",    name: "Perris",       capacityAF:  131400 },
];

const SENSOR_STORAGE = 15;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
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

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type CdecRec = { date: string; obsDate?: string; value: number };

async function cdecLatest(
  station: string,
): Promise<{ value: number | null; obsDate: string | null }> {
  // Pull a 14-day window so a few stale/null days don't leave us with nothing.
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 14);
  const url =
    `https://cdec.water.ca.gov/dynamicapp/req/JSONDataServlet?Stations=${station}` +
    `&SensorNums=${SENSOR_STORAGE}&dur_code=D&Start=${fmtDate(start)}&End=${fmtDate(today)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = (await r.json()) as CdecRec[];
  const valid = data.filter(
    (d) => d.value !== -9999 && d.value != null && d.value > 0,
  );
  const last = valid[valid.length - 1];
  if (!last) return { value: null, obsDate: null };
  return {
    value: last.value,
    obsDate: (last.obsDate ?? last.date)?.split(" ")[0] ?? null,
  };
}

type CachedPayload = {
  generatedAt: string;
  reservoirs: Array<
    (typeof RESERVOIRS)[number] & {
      currentAF: number | null;
      currentPct: number | null;
      asOf: string | null;
    }
  >;
};

let cache: { ts: number; data: CachedPayload } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }
  if (isRateLimited(clientIp(req))) {
    return res
      .status(429)
      .json({ error: { message: "Too many requests — try again in a minute." } });
  }

  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=21600");
    return res.status(200).json(cache.data);
  }

  try {
    const settled = await Promise.allSettled(
      RESERVOIRS.map(async (r) => {
        const latest = await cdecLatest(r.cdec);
        const pct =
          latest.value != null
            ? Math.round((latest.value / r.capacityAF) * 100)
            : null;
        return {
          ...r,
          currentAF: latest.value,
          currentPct: pct,
          asOf: latest.obsDate,
        };
      }),
    );
    const reservoirs = settled.map((s, i) =>
      s.status === "fulfilled"
        ? s.value
        : { ...RESERVOIRS[i], currentAF: null, currentPct: null, asOf: null },
    );
    const payload: CachedPayload = {
      generatedAt: new Date().toISOString(),
      reservoirs,
    };
    cache = { ts: Date.now(), data: payload };
    res.setHeader("X-Cache", "MISS");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=21600",
    );
    return res.status(200).json(payload);
  } catch (e: any) {
    return res
      .status(502)
      .json({ error: { message: `CDEC fetch failed: ${e?.message ?? "unknown"}` } });
  }
}
