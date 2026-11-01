# AccessiBooks multi-source catalogue adapter (metadata-first)

**Target:** source snapshot in `AccessiBooks(1).zip`, HEAD `0e195dc`.
**Not the same code as** `ausdisau/AccessiBooksREPL` GitHub `main` (`ecc93520` when inspected).
Apply via a reviewed branch/PR; do not overwrite newer production code or database.

## Built functionality

- Five real source adapters: LibriVox, Gutendex / Project Gutenberg, Internet Archive, Google Books, Open Library.
- Shared catalogue schema with source-preserving IDs, edition/narration separation, attributed links, audio tracks vs ZIPs vs ebooks vs external previews, rights evidence and conservative Australian rights flags.
- Per-source throttling, 25-second request timeout, bounded exponential retries, HTTPS URL checks, bounded query/offset parsing, per-provider partial-failure reporting.
- New read-only API routes under `/api/catalogue`, registered in `server/routes.ts`.
- Updated existing `/content-discovery` screen: full keyboard-compatible form, screen-reader search status, filters, partial failure status, external-source links, and optional locally indexed search.
- Dedicated Postgres tables with idempotent upserts, per-source checkpoint, and rights-review state preserved on re-sync. The existing `books` / `user_library` tables remain untouched.
- CLI for a resumable **metadata-only** catalogue scan of LibriVox and Project Gutenberg (the latter pages via Gutendex). Live search supports all five sources. Google/Open Library/Internet Archive do not offer unrestricted full-catalogue mirroring here.
- Retired unguarded legacy POST import endpoints with HTTP 410; they previously wrote uncertain metadata into the public book library and could represent whole-book ZIPs as `audio/mpeg`. Review existing clients that rely on these endpoints.

## Install and launch in a staging branch

1. Use a local copy of the exact uploaded AccessiBooks snapshot. Back up your source and database. Overlay the files in the ZIP's `overlay/` directory, retaining their relative paths.
2. Install dependencies: `npm ci`. Use Node.js 20+.
3. Run adapter tests: `npm run catalogue:test`. Run the existing project checks: `npm run check` and `npm run build`. Resolve any pre-existing failures separately.
4. In staging, review and apply **only** `migrations/accessibooks-catalogue-v2.sql`, or generate and inspect an equivalent Drizzle migration. Do **not** blindly run `db:push` on a live database where other schema changes may be pending.
5. Set `DATABASE_URL` in the server/CLI process environment (do not place secrets into Git). `GOOGLE_BOOKS_API_KEY` is optional, subject to provider quotas.
6. Start the web application with `npm run dev`. Visit `/content-discovery`.
7. Live search works without the new indexed tables. Indexed search becomes available after schema migration and metadata import.

## API endpoints

| Method | Route | Behaviour |
|---|---|---|
| GET | `/api/catalogue/sources` | Implemented sources; not live availability guarantees |
| GET | `/api/catalogue/search?q=alice&source=all&limit=20` | Live federated search; each source has an independent cursor |
| GET | `/api/catalogue/search?q=alice&source=librivox&cursor=20` | Source-specific next-page fetch |
| GET | `/api/catalogue/books/librivox/52` | Live record details and section tracks if supplied by provider |
| GET | `/api/catalogue/index?q=alice&limit=20&offset=0` | Search locally imported records; requires migration |

Optional search params: `language=en`, `format=audiobook|ebook`; indexed search supports `source=<provider>` and `offset=<n>`. All routes are read-only; no public endpoint can publish or mirror recordings.

Example response (synthetic, not a live title):

```json
{
  "items": [
    {
      "key": "librivox:52",
      "provider": "librivox",
      "providerId": "52",
      "title": "Example",
      "authors": ["A. Reader"],
      "format": "audiobook",
      "assets": [
        { "kind": "audio-archive", "url": "https://example.org/book.zip", "label": "Complete audiobook ZIP", "playable": false }
      ],
      "rights": { "auStatus": "review-required", "sourceStatement": "us-public-domain" },
      "accessibility": { "transcript": "unknown", "navigation": "unknown" }
    }
  ],
  "nextCursors": { "librivox": null },
  "errors": []
}
```

## Bulk metadata sync

```bash
# Explicit staging DB configuration required.
npm run catalogue:sync -- --source librivox --max-pages 2
npm run catalogue:sync -- --source librivox --all
npm run catalogue:sync -- --source gutenberg --all
# To revisit completed catalogues without destroying reviewed rights decisions:
npm run catalogue:sync -- --source librivox --all --restart
```

- For LibriVox, default batch size is 250, never >500, and requests are spaced at least 4 seconds apart per process, consistent with LibriVox API guidance. Gutendex controls its own page size.
- The CLI deliberately processes only one API page unless `--max-pages` or `--all` is provided.
- Checkpoint advances only after the same Postgres transaction commits the metadata page. Re-running a partial job resumes at its last committed cursor.
- `catalogue_entries` keeps the exact provider ID and separates narrations and editions. Matching titles alone are not duplicates.
- Rights-review flags in DB are not overwritten when source metadata is re-synced. `--restart` resets the page cursor, not legal review status.
- No audiobook ZIPs, MP3s, ebooks, text content or DRM-protected assets are copied by the sync command.

## Access and licensing boundaries

The catalogue is for **discovery**, not a declaration of redistribution rights. LibriVox and Gutendex may describe works as public domain in the **United States**, which does not automatically clear underlying texts or recordings in Australia. Internet Archive files can have additional access and lending restrictions. Google Books and Open Library are treated as metadata/preview sources, not full-book redistribution licences.

A `playable: true` asset only means a provider supplied a candidate audio-track URL; it does **not** mean AccessiBooks may legally host, rebroadcast or download it. The Discovery UI links to original providers rather than embedding audio. Keep all public-side redistribution, transcription, caching and protected-library import behind a separate human-reviewed rights/entitlement gate.

Do not invent transcript availability, narrator voice metadata, reading levels, accessibility scores, or regional availability. Future expansions may attach verified accessibility metadata per specific record.

## Known limitations and pre-release checks

- **Not deployed:** No write to GitHub, Replit or production databases was made.
- **Not live-tested:** API calls were simulated in ten adapter unit tests; network access and provider quota/uptime still need staging verification.
- **Full app build not verified:** The provided source copy has no `node_modules` and package-registry access was unavailable. Complete `npm run check`/`npm run build` and browser/device QA remain required.
- **Legacy security:** The repository's other write endpoints (including `POST /api/books`) and authentication/sessions need a separate security audit. Retiring the two external-content imports does not certify the app secure.
- **Source changes:** Replit and GitHub diverge from this older uploaded snapshot. Compare branches before merging; do not force-push.
- **Accessibility:** The new form uses semantic HTML, status announcements and keyboard-friendly controls but has not been verified with VoiceOver, NVDA, Android TalkBack, switch/AAC input or 200–400% zoom on a running build.
- **Pagination:** Federated all-source search shows one provider page per source at a time; paging is available when a single source is selected. Gutendex controls its own page length. Internet Archive deep result pagination is not supported by this adapter.
- **Databases:** The migration was authored and inspected, not executed against a live or staging Postgres service. Test transaction/Neon compatibility before release.

## Authoritative source documentation

- LibriVox official API: https://librivox.org/api/info
- LibriVox API rate limits: https://librivox.org/2026/09/16/librivox-api-update/
- Gutendex: https://github.com/garethbjohnson/gutendex
- Google Books API: https://developers.google.com/books/docs/v1/reference/volumes/list
- Internet Archive search API: https://archive.org/developers/search.html
- Open Library developers: https://openlibrary.org/developers/api

## Optional Open Library-style UI, Amazon Creators and Goodreads personal export

Additional patch implements a new book-first interface at `/content-discovery`, a gated
Amazon-only `/bookshop` route, and a client-side Goodreads CSV import. See
`docs/OPEN_LIBRARY_AMAZON_GOODREADS.md`. The existing five open/metadata
source adapters remain active. The sixth, Amazon Creators API, is disabled unless
server credentials **and** an explicit human Amazon-policy approval flag are
present. It is excluded from federated `source=all` and all bulk syncing.

No Goodreads public API integration is claimed: its public keys were discontinued.
