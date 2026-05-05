// One-shot script: translates STRINGS into all non-English languages via Groq.
// Sequential with retry-on-429 + incremental save. Resumable: re-running only
// fills in missing languages.
// Run: node i18n/generate.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const keyFile = existsSync(join(ROOT, ".env.local")) ? ".env.local" : ".env";
const GROQ_KEY =
  process.env.GROQ_API_KEY ??
  readFileSync(join(ROOT, keyFile), "utf8")
    .match(/^\s*GROQ_API_KEY\s*=\s*(.+)\s*$/m)[1]
    .trim()
    .replace(/^["']|["']$/g, "");

const STRINGS = {
  "tab.home": "Home",
  "tab.log": "Log",
  "tab.map": "Map",
  "tab.camera": "Camera",
  "tab.stats": "Stats",
  "tab.learn": "Learn",
  "tab.chat": "Chat",
  "btn.save": "Save",
  "btn.cancel": "Cancel",
  "btn.done": "Done",
  "btn.ok": "OK",
  "btn.continue": "Continue",
  "btn.add": "Add",
  "btn.delete": "Delete",
  "btn.edit": "Edit",
  "btn.reset": "Reset",
  "btn.close": "Close",
  "btn.send": "Send",
  "btn.next": "Next",
  "btn.back": "Back",
  "btn.skip": "Skip",
  "btn.try_again": "Try again",
  "btn.copy": "Copy",
  "btn.share": "Share",
  "state.loading": "Loading…",
  "state.error": "Something went wrong",
  "state.empty": "Nothing here yet",
  "state.today": "Today",
  "state.yesterday": "Yesterday",
  "state.this_week": "This week",
  "state.this_month": "This month",
  "state.gallons": "gallons",
  "state.liters": "liters",
  "state.minutes": "min",
  "onb.welcome_title": "Welcome to H2O Watch",
  "onb.welcome_sub": "Track your water, save the planet",
  "onb.name_label": "What's your name?",
  "onb.name_placeholder": "Enter your first name",
  "onb.household_label": "How many people live with you?",
  "onb.units_label": "Preferred units",
  "onb.goal_label": "Daily water goal",
  "onb.start": "Get started",
  "onb.tour_title": "Quick tour",
  "home.greeting": "Hi {name}",
  "home.quick_actions": "Quick actions",
  "home.drought_banner": "California drought update",
  "home.daily_challenges": "Daily challenges",
  "home.hydration": "Hydration tracker",
  "home.reservoirs": "California reservoirs",
  "home.tip_of_day": "AI tip of the day",
  "home.leaderboard": "Leaderboard",
  "home.achievements": "Achievements",
  "home.daily_fact": "Daily water fact",
  "home.saved_today": "Saved today",
  "home.streak": "Day streak",
  "log.title": "Water log",
  "log.subtitle": "Today's activities",
  "log.search_placeholder": "Search activity…",
  "log.add_activity": "Add activity",
  "log.activity_name": "Activity",
  "log.activity_placeholder": "e.g. Cooking pasta",
  "log.amount_label": "Amount",
  "log.amount_placeholder": "e.g. 3",
  "log.no_entries": "No entries yet today",
  "map.title": "Water map",
  "map.subtitle": "California in real time",
  "map.aqueducts": "Aqueducts",
  "map.reservoirs": "Reservoirs",
  "map.quality": "Water quality",
  "cam.title": "Camera tools",
  "cam.subtitle": "AI-powered water analysis",
  "cam.test_strip": "Test strip",
  "cam.pollution": "Pollution scan",
  "cam.footprint": "Water footprint",
  "cam.take_photo": "Take photo",
  "cam.pick_image": "Pick from library",
  "cam.analyzing": "Analyzing…",
  "stats.title": "Statistics",
  "stats.subtitle": "Your week at a glance",
  "stats.day": "Day",
  "stats.week": "Week",
  "stats.month": "Month",
  "stats.total_saved": "Total saved",
  "stats.daily_average": "Daily average",
  "stats.export": "Export data",
  "learn.title": "Learn",
  "learn.subtitle": "History, status, and how to help",
  "learn.history": "Water history",
  "learn.status": "Current status",
  "learn.how_to_help": "How to help",
  "chat.title": "AI Assistant",
  "chat.subtitle": "Ask anything about water",
  "chat.input_placeholder": "Ask about water conservation…",
  "chat.connection_error": "Connection error. Please try again.",
  "chat.suggest_shower": "How do I save water in the shower?",
  "chat.suggest_drought": "What's causing CA droughts?",
  "chat.suggest_plants": "Best drought-tolerant plants?",
  "chat.suggest_lawn": "How much water does a lawn use?",
  "chat.suggest_bottled": "Is bottled water bad for the planet?",
  "set.title": "Settings",
  "set.profile": "Profile",
  "set.name": "Name",
  "set.household": "Household size",
  "set.units": "Units",
  "set.daily_goal": "Daily goal",
  "set.notifications": "Notifications",
  "set.language": "Language",
  "set.about": "About",
  "set.sign_out": "Sign out",
  "set.reset_data": "Reset data",
  "set.reset_confirm": "Are you sure? This erases all your data.",
  "set.reset_done": "Your data has been erased.",
  "alert.invalid_amount": "Enter a number greater than 0.",
  "alert.copied_title": "Copied!",
  "alert.copied_body": "Text copied to your clipboard.",
};

const LANGS = [
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "ar", name: "Arabic" },
  { code: "bn", name: "Bengali" },
  { code: "ru", name: "Russian" },
  { code: "pt", name: "Portuguese" },
  { code: "ur", name: "Urdu" },
  { code: "id", name: "Indonesian" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "sw", name: "Swahili" },
  { code: "mr", name: "Marathi" },
  { code: "te", name: "Telugu" },
  { code: "tr", name: "Turkish" },
  { code: "ta", name: "Tamil" },
  { code: "vi", name: "Vietnamese" },
  { code: "ko", name: "Korean" },
  { code: "fa", name: "Persian (Farsi)" },
  { code: "it", name: "Italian" },
  { code: "th", name: "Thai" },
  { code: "gu", name: "Gujarati" },
  { code: "pl", name: "Polish" },
  { code: "uk", name: "Ukrainian" },
  { code: "ro", name: "Romanian" },
  { code: "nl", name: "Dutch" },
  { code: "ms", name: "Malay" },
  { code: "fil", name: "Filipino" },
  { code: "my", name: "Burmese" },
  { code: "am", name: "Amharic" },
  { code: "ha", name: "Hausa" },
  { code: "yo", name: "Yoruba" },
  { code: "ig", name: "Igbo" },
  { code: "ne", name: "Nepali" },
  { code: "si", name: "Sinhala" },
  { code: "km", name: "Khmer" },
  { code: "lo", name: "Lao" },
  { code: "mn", name: "Mongolian" },
  { code: "ka", name: "Georgian" },
  { code: "hy", name: "Armenian" },
  { code: "el", name: "Greek" },
  { code: "cs", name: "Czech" },
  { code: "hu", name: "Hungarian" },
  { code: "sv", name: "Swedish" },
  { code: "fi", name: "Finnish" },
  { code: "no", name: "Norwegian" },
  { code: "he", name: "Hebrew" },
  { code: "da", name: "Danish" },
];

const TRANS_PATH = join(ROOT, "i18n/translations.json");

function loadExisting() {
  if (!existsSync(TRANS_PATH)) return { en: STRINGS };
  try {
    const data = JSON.parse(readFileSync(TRANS_PATH, "utf8"));
    data.en = STRINGS;
    return data;
  } catch {
    return { en: STRINGS };
  }
}

function save(out) {
  writeFileSync(TRANS_PATH, JSON.stringify(out, null, 2));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseRetryAfter(errMessage) {
  const m1 = errMessage.match(/try again in (\d+\.?\d*)s/i);
  if (m1) return Math.ceil(parseFloat(m1[1]) * 1000);
  const m2 = errMessage.match(/try again in (\d+)m([\d.]+)s/i);
  if (m2) return Math.ceil((parseInt(m2[1]) * 60 + parseFloat(m2[2])) * 1000);
  return 30_000;
}

async function callGroq(lang) {
  const sys =
    `You translate UI strings from English into ${lang.name}. ` +
    `Respond with ONLY a single JSON object whose keys are EXACTLY the input keys ` +
    `(unchanged) and values are the translated strings. ` +
    `Preserve placeholder tokens like {name} unchanged. ` +
    `Keep translations natural, concise, and appropriate for a mobile UI. ` +
    `Output the JSON object only.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8000,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(STRINGS) },
      ],
    }),
  });
  return res.json();
}

async function translateLang(lang) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const data = await callGroq(lang);
    const errMsg = data?.error?.message;
    if (errMsg && /rate.?limit|tpm/i.test(errMsg)) {
      const wait = parseRetryAfter(errMsg) + 2000;
      process.stdout.write(`(rate-limited, waiting ${(wait / 1000).toFixed(0)}s) `);
      await sleep(wait);
      continue;
    }
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error(errMsg ?? JSON.stringify(data).slice(0, 200));
    return JSON.parse(content);
  }
  throw new Error("exhausted retries");
}

const out = loadExisting();
const expected = Object.keys(STRINGS).length;
const todo = LANGS.filter(
  (l) => !out[l.code] || Object.keys(out[l.code]).length < expected,
);
console.log(`Need to translate ${todo.length}/${LANGS.length} languages.`);

let ok = 0;
let fail = 0;
for (const lang of todo) {
  process.stdout.write(`${lang.code.padEnd(4)} `);
  try {
    const t0 = Date.now();
    const dict = await translateLang(lang);
    out[lang.code] = dict;
    save(out);
    console.log(
      `✓ ${Object.keys(dict).length}/${expected} keys (${Date.now() - t0}ms)`,
    );
    ok++;
  } catch (e) {
    console.log(`✗ ${e.message}`);
    fail++;
  }
}

console.log(
  `\nDone. ${ok} new, ${fail} failed, ${Object.keys(out).length}/${LANGS.length + 1} total in translations.json.`,
);
