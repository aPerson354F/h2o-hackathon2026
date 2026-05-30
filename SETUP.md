# Setup — getting h2otoyou running

Everything the app needs to run is committed to this repo **except your secret
keys**. Follow these steps after cloning.

## 1. Install dependencies
```bash
npm install
```
> `node_modules/` is intentionally not in the repo (~1 GB). `npm install`
> regenerates it from `package-lock.json`.

## 2. Create your env file
```bash
cp .env.example .env.local
```
Then open `.env.local` and fill in your own values. See `.env.example` for the
full list and where to get each key (Groq, Resend, Google OAuth, etc.).

> `.env.local` is gitignored — never commit it. It is the **only** file you must
> create yourself; everything else you need is already in the repo.

## 3. Run
```bash
npx expo start          # mobile app (Expo)
vercel dev              # serverless /api functions locally (optional)
```

## About `.gitignore` — you do NOT need to change it

All runtime-required files are already tracked and came with your clone:

| File | Purpose | In repo? |
|------|---------|----------|
| `data/cdec.json` | Reservoir data used by the app | ✅ yes |
| `google-services.json` | Firebase / Android config | ✅ yes |
| `.env.local` | Your secret keys | ❌ create from `.env.example` |

The files `.gitignore` excludes are things you genuinely don't need to run the
app: `node_modules/` (reinstalled), `.env*.local` (your own secrets),
`plan.md`, large source PDFs (`rescond_*.pdf`), debug screenshots, and
`challenge_data.json` (its data is already baked into `App.tsx`).

**Bottom line:** clone → `npm install` → copy `.env.example` to `.env.local` →
fill in keys → run. Nothing else needs to be sent to you separately.
