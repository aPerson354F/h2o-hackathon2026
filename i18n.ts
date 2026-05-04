import translations from "./i18n/translations.json";

export const LANGUAGES: { code: string; name: string; native: string }[] = [
  { code: "en", name: "English", native: "English" },
  { code: "zh", name: "Chinese (Simplified)", native: "中文" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "fil", name: "Filipino", native: "Filipino" },
  { code: "my", name: "Burmese", native: "မြန်မာ" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "ha", name: "Hausa", native: "Hausa" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "ig", name: "Igbo", native: "Igbo" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "lo", name: "Lao", native: "ລາວ" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "hy", name: "Armenian", native: "Հայերեն" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "da", name: "Danish", native: "Dansk" },
];

export type Lang = (typeof LANGUAGES)[number]["code"];

export const STRINGS = {
  // tab bar
  "tab.home": "Home",
  "tab.log": "Log",
  "tab.map": "Map",
  "tab.camera": "Camera",
  "tab.stats": "Stats",
  "tab.learn": "Learn",
  "tab.chat": "Chat",

  // common buttons / actions
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

  // common state
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

  // onboarding
  "onb.welcome_title": "Welcome to H2O Watch",
  "onb.welcome_sub": "Track your water, save the planet",
  "onb.name_label": "What's your name?",
  "onb.name_placeholder": "Enter your first name",
  "onb.household_label": "How many people live with you?",
  "onb.units_label": "Preferred units",
  "onb.goal_label": "Daily water goal",
  "onb.start": "Get started",
  "onb.tour_title": "Quick tour",

  // home screen
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

  // log screen
  "log.title": "Water log",
  "log.subtitle": "Today's activities",
  "log.search_placeholder": "Search activity…",
  "log.add_activity": "Add activity",
  "log.activity_name": "Activity",
  "log.activity_placeholder": "e.g. Cooking pasta",
  "log.amount_label": "Amount",
  "log.amount_placeholder": "e.g. 3",
  "log.no_entries": "No entries yet today",

  // map screen
  "map.title": "Water map",
  "map.subtitle": "California in real time",
  "map.aqueducts": "Aqueducts",
  "map.reservoirs": "Reservoirs",
  "map.quality": "Water quality",

  // camera screen
  "cam.title": "Camera tools",
  "cam.subtitle": "AI-powered water analysis",
  "cam.test_strip": "Test strip",
  "cam.pollution": "Pollution scan",
  "cam.footprint": "Water footprint",
  "cam.take_photo": "Take photo",
  "cam.pick_image": "Pick from library",
  "cam.analyzing": "Analyzing…",

  // stats screen
  "stats.title": "Statistics",
  "stats.subtitle": "Your week at a glance",
  "stats.day": "Day",
  "stats.week": "Week",
  "stats.month": "Month",
  "stats.total_saved": "Total saved",
  "stats.daily_average": "Daily average",
  "stats.export": "Export data",

  // learn screen
  "learn.title": "Learn",
  "learn.subtitle": "History, status, and how to help",
  "learn.history": "Water history",
  "learn.status": "Current status",
  "learn.how_to_help": "How to help",

  // chat screen
  "chat.title": "AI Assistant",
  "chat.subtitle": "Ask anything about water",
  "chat.input_placeholder": "Ask about water conservation…",
  "chat.connection_error": "Connection error. Please try again.",
  "chat.suggest_shower": "How do I save water in the shower?",
  "chat.suggest_drought": "What's causing CA droughts?",
  "chat.suggest_plants": "Best drought-tolerant plants?",
  "chat.suggest_lawn": "How much water does a lawn use?",
  "chat.suggest_bottled": "Is bottled water bad for the planet?",

  // settings / profile
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

  // alerts
  "alert.invalid_amount": "Enter a number greater than 0.",
  "alert.copied_title": "Copied!",
  "alert.copied_body": "Text copied to your clipboard.",
} as const;

export type StringKey = keyof typeof STRINGS;

const DICT: Record<string, Record<string, string>> = translations as any;

export function translate(
  lang: Lang,
  key: StringKey,
  params?: Record<string, string | number>,
): string {
  const langDict = DICT[lang] ?? {};
  const fallback = STRINGS[key];
  let s = langDict[key] ?? fallback ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}

export function useT(lang: Lang) {
  return (key: StringKey, params?: Record<string, string | number>) =>
    translate(lang, key, params);
}
