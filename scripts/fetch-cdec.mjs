// Fetches reservoir storage, snowpack, and precipitation data from CDEC
// (https://cdec.water.ca.gov) and writes a snapshot to data/cdec.json that
// the app embeds at build time.
//
// Run: node scripts/fetch-cdec.mjs
// Output: data/cdec.json
//
// Re-run before each release to refresh the dataset. The script is idempotent.

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(ROOT, "data", "cdec.json");

// CDEC-tracked reservoirs (App.tsx also includes Lake Mead, which is on the
// Colorado River and not a CDEC station). Station IDs from
// https://cdec.water.ca.gov/dynamicapp/staSearch
// Capacities (TAF = thousand acre-feet) are well-known constants.
const RESERVOIRS = [
  { id: "shasta",   cdec: "SHA", name: "Shasta",        capacityAF: 4552000, lat: 40.7197, lng: -122.4197 },
  { id: "trinity",  cdec: "CLE", name: "Trinity",       capacityAF: 2447650, lat: 40.8000, lng: -122.7600 },
  { id: "oroville", cdec: "ORO", name: "Oroville",      capacityAF: 3537577, lat: 39.5392, lng: -121.4847 },
  { id: "newmel",   cdec: "NML", name: "New Melones",   capacityAF: 2400000, lat: 37.9486, lng: -120.5269 },
  { id: "donpedro", cdec: "DNP", name: "Don Pedro",     capacityAF: 2030000, lat: 37.7000, lng: -120.4200 },
  { id: "hetch",    cdec: "HTH", name: "Hetch Hetchy",  capacityAF:  360000, lat: 37.9472, lng: -119.7867 },
  { id: "camanche", cdec: "CMN", name: "Camanche",      capacityAF:  417120, lat: 38.2167, lng: -120.9833 },
  { id: "newhogan", cdec: "NHG", name: "New Hogan",     capacityAF:  317100, lat: 38.1572, lng: -120.8197 },
  { id: "pardee",   cdec: "PAR", name: "Pardee",        capacityAF:  197950, lat: 38.2500, lng: -120.8500 },
  { id: "bethany",  cdec: "BTH", name: "Bethany",       capacityAF:    5250, lat: 37.7864, lng: -121.6300 },
  { id: "sanluis",  cdec: "SNL", name: "San Luis",      capacityAF: 2041000, lat: 37.0633, lng: -121.0825 },
  { id: "castaic",  cdec: "CAS", name: "Castaic",       capacityAF:  325000, lat: 34.5275, lng: -118.6125 },
  { id: "perris",   cdec: "PRR", name: "Perris",        capacityAF:  131400, lat: 33.8650, lng: -117.1717 },
  // Lake Mead is on the Colorado River — not a CDEC station. Skipped.
];

// 4 snow pillows spanning Sierra range, used for monthly snowpack proxy.
// Sensor 3 = SNOW WATER CONTENT (inches). Daily measurements; we sample the
// 1st of each month.
const SNOW_PILLOWS = ["CDP", "PHL", "GIN", "STR"];

// 3 precip stations, sensor 2 (PRECIPITATION ACCUMULATED, monthly delta from
// CDEC's monthly aggregation = effective monthly precip in inches).
const PRECIP_STATIONS = ["SHA", "ORO", "FOL"];

const SENSOR_STORAGE = 15;
const SENSOR_SNOW_WC = 3;
const SENSOR_PRECIP = 2;

// Long-term monthly normals so we can express raw inches as "% of normal",
// matching the semantics the existing classifiers expect.
//
// Snowpack: typical SWE in inches at our 4 Sierra pillows for that month.
// Peaks ~April 1. Sources: DWR CCSS bulletin long-term avgs.
const SNOW_NORMAL_INCHES = {
  "01": 12, "02": 22, "03": 28, "04": 30, "05": 22, "06": 8,
  "07": 1,  "08": 0.5, "09": 0.5, "10": 1, "11": 3, "12": 7,
};
// Precip: typical monthly precip (inches) averaged across SHA/ORO/FOL.
// Mediterranean-climate skew — wet Nov–Mar, near-zero Jul–Sep.
const PRECIP_NORMAL_INCHES = {
  "01": 8.2, "02": 7.5, "03": 6.0, "04": 3.5, "05": 1.5, "06": 0.5,
  "07": 0.1, "08": 0.1, "09": 0.5, "10": 2.0, "11": 4.5, "12": 7.0,
};

// Sierra is reliably bare and snow-pillow sensors are unreliable Jul–Oct
// (drift, stuck-on-residue, offline). Treated as 0 % snowpack rather than
// aggregated from noisy data.
const SUMMER_MONTHS = new Set(["07", "08", "09", "10"]);

const today = new Date();
const startDate = new Date(today.getFullYear() - 2, today.getMonth(), 1);
const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const START = fmt(startDate);
const END = fmt(today);

async function cdec(station, sensor, dur, attempt = 1) {
  const url = `https://cdec.water.ca.gov/dynamicapp/req/JSONDataServlet?Stations=${station}&SensorNums=${sensor}&dur_code=${dur}&Start=${START}&End=${END}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return data.filter((d) => d.value !== -9999 && d.value !== null);
  } catch (e) {
    if (attempt >= 4) {
      throw new Error(`CDEC ${station}/${sensor}/${dur} after ${attempt} attempts: ${e.message ?? e}`);
    }
    await new Promise((r) => setTimeout(r, 1500 * attempt));
    return cdec(station, sensor, dur, attempt + 1);
  }
}

const monthKey = (dateStr) => {
  // CDEC dates look like "2024-5-1 00:00" — parse leniently.
  const [y, m] = dateStr.split(" ")[0].split("-");
  return `${y}-${String(m).padStart(2, "0")}`;
};

async function fetchReservoirs() {
  // Reservoirs run sequentially (one station at a time) but each station's
  // monthly + daily pair runs concurrently. We avoid wide parallelism because
  // CDEC has shown flakiness under load.
  const out = [];
  for (const r of RESERVOIRS) {
    process.stdout.write(`  ${r.cdec} `);
    const [monthly, daily] = await Promise.all([
      cdec(r.cdec, SENSOR_STORAGE, "M"),
      cdec(r.cdec, SENSOR_STORAGE, "D"),
    ]);
    const recent = daily[daily.length - 1];
    const history = monthly.map((rec) => ({
      month: monthKey(rec.date),
      af: rec.value,
      pct: Math.round((rec.value / r.capacityAF) * 100),
    }));
    out.push({
      ...r,
      currentAF: recent?.value ?? null,
      currentPct: recent ? Math.round((recent.value / r.capacityAF) * 100) : null,
      asOf: recent?.obsDate?.split(" ")[0] ?? null,
      history,
    });
    process.stdout.write("✓\n");
  }
  return out;
}

async function fetchSnowpack() {
  // Daily SWC per station, monthly mean per station, then averaged across
  // stations. Filter sensor noise: negatives (drift), stuck-summer readings,
  // and CDEC's -9999 sentinel (handled upstream). Summer months are skipped
  // entirely — see SUMMER_MONTHS comment.
  const byMonth = new Map();
  for (const sta of SNOW_PILLOWS) {
    process.stdout.write(`  ${sta} `);
    const daily = await cdec(sta, SENSOR_SNOW_WC, "D");
    const perMonth = new Map();
    for (const rec of daily) {
      if (rec.value < 0) continue;
      const mk = monthKey(rec.date);
      if (SUMMER_MONTHS.has(mk.slice(5))) continue;
      const arr = perMonth.get(mk) ?? [];
      arr.push(rec.value);
      perMonth.set(mk, arr);
    }
    for (const [mk, vals] of perMonth) {
      if (!vals.length) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const arr = byMonth.get(mk) ?? [];
      arr.push(avg);
      byMonth.set(mk, arr);
    }
    process.stdout.write("✓\n");
  }
  return Array.from(byMonth.entries())
    .map(([month, values]) => ({
      month,
      snowWaterInches:
        Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
      stations: values.length,
    }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

async function fetchPrecip() {
  const byMonth = new Map();
  for (const sta of PRECIP_STATIONS) {
    process.stdout.write(`  ${sta} `);
    const monthly = await cdec(sta, SENSOR_PRECIP, "M");
    for (const rec of monthly) {
      const mk = monthKey(rec.date);
      const arr = byMonth.get(mk) ?? [];
      arr.push(rec.value);
      byMonth.set(mk, arr);
    }
    process.stdout.write("✓\n");
  }
  return Array.from(byMonth.entries())
    .map(([month, values]) => ({
      month,
      precipInches:
        Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      stations: values.length,
    }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

function buildMonthly(reservoirs, snowpack, precip) {
  // For each month, compute statewide reservoir % as capacity-weighted avg
  // across the reservoirs that have data that month.
  const months = new Set();
  for (const r of reservoirs) for (const h of r.history) months.add(h.month);
  for (const s of snowpack) months.add(s.month);
  for (const p of precip) months.add(p.month);

  const sorted = Array.from(months).sort();
  return sorted.map((month) => {
    let totalAF = 0,
      totalCapacity = 0;
    for (const r of reservoirs) {
      const h = r.history.find((x) => x.month === month);
      if (!h) continue;
      totalAF += h.af;
      totalCapacity += r.capacityAF;
    }
    const reservoirPct = totalCapacity
      ? Math.round((totalAF / totalCapacity) * 100)
      : null;
    const snow = snowpack.find((s) => s.month === month);
    const prec = precip.find((p) => p.month === month);
    const mm = month.slice(5);
    let snowPctOfNormal;
    if (SUMMER_MONTHS.has(mm)) {
      snowPctOfNormal = 0;
    } else if (snow && SNOW_NORMAL_INCHES[mm]) {
      snowPctOfNormal = Math.min(
        200,
        Math.max(0, Math.round((snow.snowWaterInches / SNOW_NORMAL_INCHES[mm]) * 100)),
      );
    } else {
      snowPctOfNormal = null;
    }
    // Precip cap at 300% — atmospheric-river months can hit 200–250%; values
    // beyond that almost always come from the tiny summer normals (0.1") and
    // would skew the chart.
    const precipPctOfNormal =
      prec && PRECIP_NORMAL_INCHES[mm]
        ? Math.min(
            300,
            Math.max(0, Math.round((prec.precipInches / PRECIP_NORMAL_INCHES[mm]) * 100)),
          )
        : null;
    return {
      month,
      reservoirPct,
      snowWaterInches: snow?.snowWaterInches ?? null,
      snowPctOfNormal,
      precipInches: prec?.precipInches ?? null,
      precipPctOfNormal,
    };
  });
}

// Render the monthly array as a TS-ready WaterPoint[] literal that can be
// pasted directly into App.tsx (in MM/D/YY date format, most-recent-first
// order, matching the existing WATER_HISTORY shape).
function emitWaterHistorySnippet(monthly) {
  const inOrder = [...monthly].reverse();
  const lines = inOrder
    .filter(
      (m) =>
        m.reservoirPct != null &&
        m.snowPctOfNormal != null &&
        m.precipPctOfNormal != null,
    )
    .map((m) => {
      const [y, mo] = m.month.split("-");
      const yy = y.slice(2);
      return `  { date: "${parseInt(mo)}/1/${yy}", snowpack: ${m.snowPctOfNormal}, precip: ${m.precipPctOfNormal}, reservoir: ${m.reservoirPct} },`;
    });
  return lines.join("\n");
}

async function main() {
  console.log(`CDEC fetch — ${START} → ${END}`);
  // The three phases hit disjoint sets of stations and share no state, so
  // they run concurrently. Per-phase progress lines from the inner loops
  // will interleave — that's fine.
  console.log("Reservoirs / Snowpack / Precipitation in parallel…");
  const [reservoirs, snowpack, precip] = await Promise.all([
    fetchReservoirs(),
    fetchSnowpack(),
    fetchPrecip(),
  ]);
  const monthly = buildMonthly(reservoirs, snowpack, precip);

  const output = {
    generatedAt: new Date().toISOString(),
    range: { start: START, end: END },
    reservoirs,
    monthly,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${OUT}`);
  console.log(`  ${reservoirs.length} reservoirs`);
  console.log(`  ${monthly.length} monthly aggregates`);
  const latest = monthly[monthly.length - 1];
  if (latest) {
    console.log(
      `  latest month ${latest.month}: ${latest.reservoirPct}% reservoirs, ${latest.snowWaterInches}" SWE, ${latest.precipInches}" precip`,
    );
  }
  console.log("\n=== App.tsx WATER_HISTORY snippet (paste between [ ]) ===");
  console.log(emitWaterHistorySnippet(monthly));
  console.log("\n=== App.tsx RESERVOIRS pct snippet (id → pct) ===");
  for (const r of reservoirs) {
    if (r.currentPct != null) console.log(`  ${r.id}: ${r.currentPct}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
