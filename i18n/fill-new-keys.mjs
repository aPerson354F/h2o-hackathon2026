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
  "home.water_score": "WATER SCORE",
  "home.level_guardian": "LEVEL {level} GUARDIAN",
  "home.xp_count": "{xp}/100 XP",
  "home.your_hydration": "YOUR HYDRATION",
  "home.personal_water_intake": "Personal water intake",
  "home.cups_of_goal": "{cups} of {goal} cups",
  "home.daily_challenges_header": "DAILY CHALLENGES",
  "home.resets_midnight": "resets at midnight",
  "home.reservoirs_live": "CA RESERVOIRS · LIVE",
  "home.via_cdec": "via CDEC snapshot",
  "home.leaderboard_lifetime": "LEADERBOARD · LIFETIME SAVED",
  "home.leaderboard_rank": "#{rank} of {total}",
  "home.ai_tip_title": "AI TIP OF THE DAY",
  "home.achievements_count": "ACHIEVEMENTS · {count}/{total}",
  "home.view_all": "View all →",
  "chal.ready_to_claim": "READY TO CLAIM",
  "chal.claimed": "CLAIMED",
  "chal.claim": "CLAIM",
  "chal.xp": "+{xp} XP",
  "quick.goal": "Goal",
  "quick.journey": "Journey",
  "quick.journey_value": "Sierra → tap",
  "quick.tour": "Tour",
  "quick.tour_value": "Learn app",
  "quick.share": "Share",
  "quick.share_value": "Spread word",
  "quick.alerts": "Alerts",
  "quick.alerts_new": "{count} new",
  "quick.trophies": "Trophies",
  "quick.shower": "Shower",
  "quick.shower_value": "Live coach",
  "quick.rebates": "Rebates",
  "quick.rebates_value": "Find $",
  "quick.forecast": "Forecast",
  "quick.forecast_value": "10-yr outlook",
  "stat.saved_vs_ca": "Saved vs CA Avg",
  "stat.day_streak": "Day Streak",
  "stat.days": "days",
  "stat.level": "Level",
  "stat.guardian": "guardian",
  "alert.active_drought": "Active Drought Alert",
  "alert.watch_conditions": "Watch Conditions",
  "alert.conditions_normal": "Conditions Normal",
  "alert.drought_status": "Reservoirs {res}% ({rl}) · Snowpack {sn}% ({snl}) · Precip {p}% ({pl})",
  "label.excellent": "Excellent",
  "label.average": "Average",
  "label.below_avg": "Below Avg.",
  "label.concerning": "Concerning",
  "label.wet": "Wet",
  "label.normal": "Normal",
  "label.dry": "Dry",
  "label.drought_signal": "Drought Signal",
  "label.strong": "Strong",
  "label.healthy": "Healthy",
  "label.watch": "Watch",
  "label.concern": "Concern",

  "modal.settings": "Settings",
  "set.profile_header": "PROFILE",
  "form.your_name": "Your name",
  "placeholder.name_example": "e.g. Sam",
  "form.household_size": "Household size",
  "set.preferences_header": "PREFERENCES",
  "form.units": "Units",
  "form.gallons_us": "Gallons (US)",
  "form.liters": "Liters",
  "form.daily_goal_units": "Daily goal ({units})",
  "placeholder.goal": "80",
  "help.epa_ca_mandate": "EPA recommends 80–100 gallons/day. CA's 2025 mandate is 55 gal/person/day indoor.",
  "set.notifications_header": "NOTIFICATIONS",
  "notif.daily_reminders": "Daily reminders",
  "notif.daily_reminders_desc": "Wake-up and streak nudges",
  "notif.conservation_tips": "Conservation tips",
  "notif.conservation_tips_desc": "Rotating tips throughout the day",
  "notif.drought_alerts": "Drought & goal alerts",
  "notif.drought_alerts_desc": "When you exceed your goal or new alerts hit",
  "set.about_header": "ABOUT",
  "btn.about_contact": "About us & contact",
  "set.data_header": "DATA",
  "btn.retake_quiz": "Retake water-footprint quiz",
  "btn.reset_all_data": "Reset all data",
  "footer.made_for_california": "H2O to You v1.0 · Made for California",
  "btn.save_changes": "Save Changes",
  "alert.reset_all_title": "Reset all data?",
  "alert.reset_all_msg": "This will erase your logs, XP, badges, streak, and preferences. This cannot be undone.",
  "alert.reset_complete": "Reset complete",
  "alert.quiz_reset": "Quiz reset",
  "alert.quiz_reset_msg": "The water-footprint quiz will start the next time you open the app.",

  "modal.set_daily_goal": "Set Daily Goal",
  "help.epa_ca_mandate_short": "EPA recommends 80–100 gallons/day. CA mandate: 55 gal/person/day.",
  "placeholder.goal_with_eg": "e.g. 80",
  "btn.save_goal": "Save Goal",

  "modal.notifications": "Notifications",
  "notif.clear_all": "Clear all",
  "notif.empty_title": "All quiet here",
  "notif.empty_body": "You'll see reminders, tips, and alerts as they arrive.",
  "notif.just_now": "just now",
  "notif.m_ago": "{m}m ago",
  "notif.h_ago": "{h}h ago",
  "notif.d_ago": "{d}d ago",

  "modal.about_us": "About Us",
  "about.tagline": "BUILT FOR CALIFORNIA · 2026",
  "about.follow_us": "FOLLOW US",
  "about.follow_us_desc": "Read the Aquanauts' Smore newsletter for water tips, alerts, and California water news.",
  "about.get_in_touch": "GET IN TOUCH",
  "about.get_in_touch_desc": "Reach the H2O to You team — we read every message.",
  "about.our_work": "ABOUT OUR WORK",
  "about.founders": "FOUNDERS",
  "about.founder_role": "Founder",
  "about.email_label": "Email Us",
  "about.email_detail": "Questions, feedback, partnerships",
  "about.website_label": "Visit Website",
  "about.website_detail": "Project updates and resources",
  "about.social_label": "Follow Us",
  "about.social_detail": "Tips, alerts, and CA water news",
  "about.report_label": "Report a Bug",
  "about.report_detail": "Help us make H2O to You better",
  "about.smore_label": "Smore Newsletter",
  "about.our_work_p1": "We know that the scarcity of freshwater in California is a big deal, and though action is being taken against it, we feel like the citizens should join this fight as well.",
  "about.our_work_p2": "Saving water without goals is hard, and easy to forget in a world this large — so we set out to make conserving water feel achievable, structured, and worth the effort, both for today and for a more sustainable tomorrow.",
  "about.our_work_p3": "H2O to You is completely free to use, because charging would put water-saving out of reach for the people who need it most. Every feature in this app has been built with as much care and precision as we could manage, so the experience enlightens you, motivates you, and stays out of your way.",
  "about.made_with_care": "Made with care · H2O Hackathon 2026",

  "alert.cant_open_link": "Can't open link",
  "alert.couldnt_open_link": "Couldn't open link",
  "alert.try_again_later": "Try again later.",
  "alert.permission_needed": "Permission needed",
  "alert.camera_permission_msg": "Camera access is required to take photos.",
  "alert.library_permission_msg": "Photo library access is required to pick images.",
  "alert.export_copied_msg": "Full export copied to your clipboard.",
  "alert.invalid_amount_title": "Invalid amount",

  "modal.custom_entry": "Custom Entry",
  "modal.log_other_water": "Log any other water use",
  "form.activity_name": "Activity name",
  "form.gallons_used": "Gallons used",
  "btn.add_entry": "Add Entry",
  "log.saved_today": "Saved today",
  "log.total_earned": "Total earned",
  "log.activities": "Activities",
  "log.log_activity": "LOG AN ACTIVITY",
  "log.todays_log": "TODAY'S LOG",
  "log.clear_all": "Clear All",

  "modal.shower_coach": "Shower Coach",
  "shower.header_subtitle": "{gpm} gpm showerhead · live tracking",
  "shower.live": "LIVE",
  "shower.ready": "READY",
  "shower.cost": "cost",
  "shower.vs_ca_avg": "vs CA avg",
  "btn.stop_log": "■ STOP & LOG",
  "btn.start_shower": "▶ START SHOWER",
  "shower.recent_showers": "RECENT SHOWERS",

  "modal.find_rebates": "Find Rebates",
  "rebate.header_subtitle": "Real CA utility programs · {count} listed",
  "form.zip": "ZIP",
  "rebate.potential_value": "POTENTIAL VALUE",
  "rebate.available_programs": "in available rebates ({count} programs)",
  "rebate.gal_yr_saved": "gal/yr saved",
  "rebate.annual_bill_cut": "annual bill cut",
  "rebate.lifetime_15yr": "15-yr lifetime",
  "rebate.no_matches": "No rebates match this ZIP / category combo.",
  "rebate.try_zips": "Try ZIP 95202 (Stockton), 90001 (LA), or 92101 (San Diego).",
  "rebate.apply": "Apply for this rebate →",
  "rebate.cat_all": "All",
  "rebate.cat_toilets": "Toilets",
  "rebate.cat_landscape": "Landscape",
  "rebate.cat_irrigation": "Irrigation",
  "rebate.cat_appliances": "Appliances",
  "rebate.cat_fixtures": "Fixtures",
  "placeholder.zip_example": "95202",

  "btn.take_photo": "Take Photo",
  "btn.from_library": "From Library",

  "modal.achievements": "Achievements",
  "toast.achievement_unlocked_title": "Achievement Unlocked!",
  "toast.achievement_unlocked_label": "ACHIEVEMENT UNLOCKED",
  "ach.unlocked_status": "{got} of {total} unlocked · {pct}%",
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
  "chat.greeting":
    "Hi! I'm your H2O assistant 💧 Ask me anything about water conservation, the California drought, or tips to reduce your usage!",
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
