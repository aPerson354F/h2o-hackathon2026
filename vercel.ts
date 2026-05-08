import { type VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: null,
  buildCommand: "node scripts/embed-docs.mjs && npx expo export --platform web",
  outputDirectory: "dist",
  installCommand: "npm install --legacy-peer-deps",
  regions: ["sfo1"],
  functions: {
    "api/groq.ts": {
      maxDuration: 30,
      memory: 512,
    },
    "api/cdec.ts": {
      maxDuration: 30,
      memory: 256,
    },
    "api/newsletter/*.ts": {
      maxDuration: 30,
      memory: 256,
    },
  },
  crons: [
    // 16:00 UTC = 09:00 PDT / 08:00 PST. Mondays.
    { path: "/api/newsletter/send?frequency=weekly", schedule: "0 16 * * 1" },
    // 1st of every month, 09:00 PT.
    { path: "/api/newsletter/send?frequency=monthly", schedule: "0 16 1 * *" },
  ],
  rewrites: [
    // Vercel rewrites run before filesystem lookup, so a plain "/(.*)" would
    // intercept /api/* and prevent function handlers from ever being reached.
    // Negative lookahead keeps API + static paths out of the SPA fallback.
    {
      source: "/((?!api/|_expo/|assets/|favicon\\.ico).*)",
      destination: "/index.html",
    },
  ],
  headers: [
    {
      // Per-function headers. /api/groq must never be cached (LLM responses
      // are personalized). /api/cdec sets its own Cache-Control in the handler
      // so daily-stable reservoir snapshots can hit the edge cache.
      source: "/api/groq",
      headers: [
        { key: "Cache-Control", value: "no-store" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    },
    {
      source: "/api/cdec",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    },
    {
      source: "/api/newsletter/(.*)",
      headers: [
        { key: "Cache-Control", value: "no-store" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    },
    {
      source: "/_expo/static/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/assets/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/index.html",
      headers: [{ key: "Cache-Control", value: "no-cache" }],
    },
  ],
};
