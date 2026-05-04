import { type VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: null,
  buildCommand: "npx expo export --platform web",
  outputDirectory: "dist",
  installCommand: "npm install --legacy-peer-deps",
  regions: ["sfo1"],
  functions: {
    "api/groq.ts": {
      maxDuration: 30,
      memory: 512,
    },
  },
  rewrites: [
    { source: "/api/(.*)", destination: "/api/$1" },
    { source: "/(.*)", destination: "/index.html" },
  ],
  headers: [
    {
      source: "/api/(.*)",
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
