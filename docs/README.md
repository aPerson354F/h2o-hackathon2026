# docs

User-facing legal copy.

- `PRIVACY.md` — Privacy Policy. Edit freely.
- `TERMS.md` — Terms of Service. Edit freely.
- `embedded.ts` — auto-generated. Do not edit by hand.

After changing either `.md`, regenerate the bundle:

```
node scripts/embed-docs.mjs
```

The Vercel build runs this step automatically before exporting, so production deploys always reflect the latest committed `.md` content.
