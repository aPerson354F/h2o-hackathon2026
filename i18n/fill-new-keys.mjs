// Fills missing KEYS in each language's translation dict (vs. fill-missing.mjs
// which fills missing LANGUAGES). Idempotent: safe to re-run after adding keys.
// Run: node i18n/fill-new-keys.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const TRANS_PATH = join(ROOT, "i18n/translations.json");

// Source of truth: keep in sync with STRINGS in i18n/index.ts
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
  "home.app_name": "H2O to You",
  "home.subtitle_default": "California Water Guardian",
  "home.morning": "Good morning",
  "home.afternoon": "Good afternoon",
  "home.evening": "Good evening",
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
  "log.header_title": "Log Activity",
  "log.header_subtitle": "Tap to record your water use",
  "log.todays_usage": "Today's usage",
  "log.used_today": "used today",
  "log.target": "target",
  "log.search_placeholder": "Search activity…",
  "log.add_activity": "Add activity",
  "log.activity_name": "Activity",
  "log.activity_placeholder": "e.g. Cooking pasta",
  "log.amount_label": "Amount",
  "log.amount_placeholder": "e.g. 3",
  "log.no_entries": "No entries yet today",
  "map.title": "Water map",
  "map.subtitle": "California in real time",
  "map.header_title": "Conservation Map",
  "map.header_subtitle": "California's lifelines, in one view",
  "map.aqueducts": "Aqueducts",
  "map.reservoirs": "Reservoirs",
  "map.quality": "Quality",
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

const GOOGLE_CODE = {
  fil: "tl",
  zh: "zh-CN",
  he: "iw",
};

async function translateOne(text, target) {
  const tl = GOOGLE_CODE[target] ?? target;
  const placeholders = [];
  const masked = text.replace(/\{(\w+)\}/g, (_, name) => {
    placeholders.push(name);
    return `__PH${placeholders.length - 1}__`;
  });
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}` +
    `&dt=t&q=${encodeURIComponent(masked)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  let translated = data[0].map((s) => s[0]).join("");
  translated = translated.replace(/__PH(\d+)__/gi, (_, i) => `{${placeholders[parseInt(i)]}}`);
  return translated;
}

async function pool(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < items.length) {
        const idx = cursor++;
        results[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return results;
}

const existing = JSON.parse(readFileSync(TRANS_PATH, "utf8"));
existing.en = STRINGS;

const allKeys = Object.keys(STRINGS);
const langCodes = Object.keys(existing).filter((c) => c !== "en");

let totalAdded = 0;
for (const code of langCodes) {
  const dict = existing[code] ?? {};
  const missingKeys = allKeys.filter((k) => !dict[k]);
  if (missingKeys.length === 0) {
    process.stdout.write(`${code.padEnd(4)} skip (complete)\n`);
    continue;
  }
  process.stdout.write(`${code.padEnd(4)} +${missingKeys.length} keys ... `);
  const t0 = Date.now();
  const values = await pool(missingKeys, 6, async (k) => {
    try {
      return await translateOne(STRINGS[k], code);
    } catch {
      return STRINGS[k];
    }
  });
  for (let i = 0; i < missingKeys.length; i++) {
    dict[missingKeys[i]] = values[i];
  }
  existing[code] = dict;
  writeFileSync(TRANS_PATH, JSON.stringify(existing, null, 2));
  totalAdded += missingKeys.length;
  console.log(`done (${Date.now() - t0}ms)`);
}

console.log(`\nDone. Added ${totalAdded} translations across ${langCodes.length} languages.`);
