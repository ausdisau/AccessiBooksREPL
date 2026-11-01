# GitHub staging reconciliation — 1 November 2026

Branch: `staging/openlibrary-catalogue-20261101` — based on main `ecc93520ecf34472c838b5c730ba97ffb405410e`.
This is a **draft review change**, not a deployment.

## Keep from GitHub main
- React 18/Vite app, Passport/session-based auth, subscriptions, existing playback and book library.
- Current PostgreSQL/Drizzle schema, streaming and user preferences.
- No staging migration has been applied, no files or playback URLs have been published.

## Add
- Open Library-style accessible discovery at `/content-discovery` with LibriVox,
  Gutenberg, Internet Archive, Google Books and Open Library.
- Personal Goodreads CSV import in **browser memory only**, with exact ISBN matching.
- Optional isolated Amazon Australia bookshop at `/bookshop`. Creators API is
  disabled unless **both** explicit enablement and policy approval flags exist,
  along with reviewed credentials. No assumed Amazon approval.
- Metadata-only catalogue index, SQL migration, checkpointed LibriVox/Gutenberg sync,
  and isolated provider tests.

## Update / wire
- `client/src/App.tsx` mounts catalogue/retail routes independent of paid library entitlements;
  `AppLayout` and landing/header include navigation.
- `server/routes.ts` registers catalogue endpoints before legacy routes.
- `shared/schema.ts` adds independent catalogue tables using **jsonb**, rather than
  copying the old snapshot's unrelated schema.
- `server/amazonPaApi.ts` disables the deprecated PA-API 5 code path in the general
  catalogue. Dependency removal/lockfile update is deferred to a separate change.
- The source overlay had a dependency on `express-rate-limit` which is **not** in the
  current GitHub lockfile. Staging uses a bounded process-local limiter until an edge
  or distributed limiter is reviewed.

## Validation / production gate
- Run GitHub Actions job: `npm ci`, `npm run catalogue:test`,
  `npm run staging:a11y`, `npm run check`, `npm run build`, and `npm audit`.
- Static checks are **not** accessibility conformance. Complete manual screen reader
  (NVDA, VoiceOver/TalkBack), keyboard-only, switch/AAC, 200–400% zoom,
  reduced-motion and high-contrast tests on actual rendered routes.
- Check sample metadata provenance and AU copyright status before any distribution.
- Inspect results of migration `migrations/accessibooks-catalogue-v2.sql` on a synthetic
  database before executing against any production database.
- Do not activate Amazon API, production deployment, paid commerce or bulk audio ingest.
- Remain draft until all checks pass and a human explicitly approves release.
