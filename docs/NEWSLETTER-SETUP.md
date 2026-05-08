# Newsletter setup

The weekly / monthly water-state newsletter is delivered through [Resend](https://resend.com). Until the env vars below are set in Vercel, the subscribe / unsubscribe / send endpoints respond with `503 "Newsletter not configured"` so the app degrades gracefully — the checkbox stays in the UI but nothing is sent.

## One-time provisioning

1. **Sign up at https://resend.com** (free tier covers 3,000 emails / month).
2. **Verify a sending domain.** Resend → Domains → Add → follow the DNS instructions. For testing you can also use `onboarding@resend.dev` without verifying, but Resend won't deliver to anyone other than the domain owner.
3. **Create two audiences** under Resend → Audiences:
   - `H2O Weekly` — for users who selected "Weekly"
   - `H2O Monthly` — for users who selected "Monthly"

   Copy each audience's ID from the URL (e.g., `78261eea-8f02-4626-9ec7-8a6e72fa55a3`).
4. **Generate an API key** under Resend → API Keys with **Full access** scope. Copy it.

## Vercel env vars

Set these on the project (`hakimancodes-projects/h2otoyou`) under Project Settings → Environment Variables for the **Production** environment (and Preview if you want previews to send too):

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | `re_*` API key from step 4 |
| `RESEND_AUDIENCE_WEEKLY_ID` | weekly audience ID |
| `RESEND_AUDIENCE_MONTHLY_ID` | monthly audience ID |
| `RESEND_FROM_EMAIL` | `H2O to You <updates@your-verified-domain.com>` |
| `CRON_SECRET` | random 32+ char string — protects the cron `/send` endpoint |

After setting them, redeploy the project (or `vercel --prod`).

## Cron schedule

Defined in `vercel.ts`:

```ts
crons: [
  { path: "/api/newsletter/send?frequency=weekly",  schedule: "0 16 * * 1" },
  { path: "/api/newsletter/send?frequency=monthly", schedule: "0 16 1 * *" },
],
```

- Weekly: every Monday at 16:00 UTC = 09:00 PT.
- Monthly: 1st of every month at 16:00 UTC = 09:00 PT.

Vercel attaches `Authorization: Bearer ${CRON_SECRET}` automatically when `CRON_SECRET` is set, so the handler can verify the request originated from Vercel Cron.

## Testing the pipeline

Once env vars are in place, send a test newsletter from your laptop:

```bash
curl -X POST "https://h2otoyou.vercel.app/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","frequency":"weekly","firstName":"You"}'
```

Then trigger the cron handler manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://h2otoyou.vercel.app/api/newsletter/send?frequency=weekly"
```

You should get the email at `you@example.com` within a minute. To unsubscribe:

```bash
curl -X POST "https://h2otoyou.vercel.app/api/newsletter/unsubscribe" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
```

The same endpoint accepts `GET ?email=...` and renders a friendly HTML confirmation, which is what the app's Settings → Save flow and the in-email "Unsubscribe" link both ultimately hit.

## Compliance notes

- Resend Broadcasts attach `List-Unsubscribe` and `List-Unsubscribe-Post` headers automatically, satisfying RFC 8058 one-click unsubscribe.
- Resend appends a postal address footer using the address you provide on your account profile; configure that under Resend → Settings → Account.
- Privacy and Terms (in `docs/PRIVACY.md` and `docs/TERMS.md`) already describe newsletter handling, retention, and unsubscribe. If you change the cadence or content beyond reservoir/snowpack/precipitation summaries, update those docs and rerun `node scripts/embed-docs.mjs`.
