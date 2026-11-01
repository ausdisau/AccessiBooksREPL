# AccessiBooks: library discovery + separate Amazon bookshop + Goodreads personal CSV

**Target source**: the uploaded `AccessiBooks(1).zip` snapshot (`0e195dc`) **plus** AccessiBooks Multi-Source Adapter v1. This is **not** the GitHub `ausdisau/AccessiBooksREPL` main branch. Do not force-push or overwrite newer branches.

## Scope and visual design

- `/content-discovery`: original AccessiBooks design using Open Library-inspired *patterns*: library-first navigation, bookshelf cards, cover art, browse subjects, flexible grid/list result layouts, and clear provider attribution. It is not a pixel clone and does not use Open Library logos, trademarks or source code.
- Sources available on this route: Open Library, LibriVox, Project Gutenberg, Internet Archive, Google Books. The existing audio player, user books, accessibility preferences, and `/library` routes remain intact.
- `/bookshop`: dedicated Amazon Australia retail-discovery route. No mixing Amazon API product advertising data into a general aggregator or adding Goodreads links adjacent to Amazon API content.
- Goodreads: **no working public Goodreads API for new developers**. Import an **individual user's own** Goodreads CSV export into *browser memory only*. No upload, backend storage, account linking, or copying of community reviews. Ratings are shown on non-Amazon catalogue records only when an exact ISBN matches the imported file. Each library record can link to Goodreads search as an external website.
- Normal Amazon book-finding hyperlinks shown on general catalogue cards are manually constructed, non-affiliate outbound searches, **not** Amazon Product Advertising Content or authoritative availability/price information. Review any mobile distribution of Amazon links separately before launch.

## Amazon Creators API: operational and legal prerequisites

**Off by default. Do not enable solely because credentials exist.**

Amazon's PA-API 5 has been deprecated in favour of the **Creators API**. Approval, an approved Associates account/tag, and marketplace/placement permissions are required. An app whose principal purpose is not Amazon marketing may be ineligible under the Associates program; seek explicit review of the AccessiBooks context. The published program conditions also limit mobile-app use and prohibit repurposing/aggregating Amazon Product Advertising Content. This code does not certify compliance.

The separate shop page is a technical precaution, not a substitute for Amazon's permission. In particular, **do not enable the shop in a Capacitor/mobile build** without separate approval and a fresh review; by default, leave it off everywhere.

Set these **server-only** environment variables after a human has verified eligibility and licence requirements:

```
AMAZON_CREATORS_ENABLED=true
AMAZON_CREATORS_POLICY_APPROVED=true
AMAZON_CREATORS_CREDENTIAL_ID=<secret from approved Associates Central account>
AMAZON_CREATORS_CREDENTIAL_SECRET=<secret from approved Associates Central account>
AMAZON_CREATORS_VERSION=3.3
AMAZON_ASSOCIATES_AU_TAG=<your approved .com.au tag>
```

- Use `AMAZON_CREATORS_VERSION` exactly as shown on Amazon credentials. Supported versions: 2.1 / 2.2 / 2.3 and 3.1 / 3.2 / 3.3. The correct regional token host and authentication method are selected from a fixed allowlist. For Australian regional credentials, v2.3 (Cognito form) and v3.3 (Login with Amazon JSON) are documented. No endpoint host is taken from incoming user data.
- The server caches bearer tokens in memory until shortly before expiry. No secrets or token values go to the browser or Git.
- SearchItems requests only `Books`, max 10 items/page (and 10 pages total). GetItems is restricted to a valid 10-character ASIN. Product image sources and detail URLs are host-validated, and **no prices, availability claims or customer reviews are stored or invented**.
- No permanent storage, data-mirroring, bulk importing or caching of Amazon Product Advertising Content. Amazon must be displayed only in an appropriate approved store context, subject to ongoing licence review and any allowed TTLs.
- The main `/api/catalogue/search?source=all` endpoint explicitly **excludes** Amazon. Amazon products can only be searched via `?source=amazon-creators` when the approval gate is met. The frontend uses this route only from `/bookshop`. A Capacitor-native detection disables the shop UI even when the web integration is configured; do not assume a public API route alone enforces all client licensing conditions.
- Amazon app approval is not verified by the software; flags represent a human operator's explicit assertion that the review has occurred. A public source endpoint is not a licensing workaround; evaluate all clients and distribution channels.

**Important**: If Amazon disallows the AccessiBooks use case, keep the Creators API disabled and use only appropriate external browsing links after reviewing the linking rules. Do not scrape or proxy Amazon listings or Goodreads pages.

## Source and UI files

```
client/src/pages/content-discovery.tsx        # Library-style catalogue search, CSV upload
client/src/pages/content-discovery.css        # Accessible original library design
client/src/pages/amazon-bookshop.tsx           # Retail-only interface; optional and gated
client/src/lib/goodreads-export.ts            # Browser-only CSV parser, exact-ISBN ratings
client/src/App.tsx                             # Adds /bookshop while preserving routes
server/services/catalogue-v2/amazon-creators.ts  # Creators API OAuth + SearchItems + GetItems
server/services/catalogue-v2/types.ts          # Adds amazon-creators source ID
server/services/catalogue-v2/registry.ts       # Optional provider, status reporting
server/routes/catalogue-v2.ts                  # Amazon-only query; all excludes Amazon
```

Existing multi-source files and Postgres migration remain the same as Adapter v1. No new database schema or migrations are introduced by this patch.

## Setup and verification

1. Work from the uploaded source snapshot with the previous Adapter v1 patch already applied. The new ZIP overlay contains the added/modified files. Do not apply it to GitHub `main` without a three-way review.
2. `npm ci` (Node.js 20+), `npm run catalogue:test` and `npm run check`.
3. `npm run dev`; test library discovery at `/content-discovery`. Test keyboard-only navigation, screen readers, AAC/switch input, 200-400% browser zoom, high contrast and reduced motion.
4. Test Goodreads with an actual user-exported CSV from an account the user controls; it is read locally, never uploaded. No OAuth or account credentials are requested.
5. Keep Amazon disabled by default and validate `/api/catalogue/sources` indicates it is not connected; `/bookshop` shows a clear inactive state. A separate compliance-approved staging review is required before testing live Amazon credentials.
6. If approved, load synthetic/fake response tests first. Only then use credentials in a local secure environment and check signed-in Associates marketplace conditions, correct product-link attribution and error handling. Do **not** deploy the same Amazon API display to Capacitor mobile clients automatically.
7. Run a complete application build and verify on actual browsers/devices before merging. Frontend source has been syntax-checked but a full app build was unavailable in this code environment because project dependencies were not installed.

## Test coverage

- Existing 10 multi-source adapter cases.
- Amazon v3.3 OAuth, token reuse, AU marketplace, Books-only search, non-playability and partner-link preservation.
- Amazon v2.3 form OAuth, credential version header, product-host validation and spoofing protection.
- Goodreads quoted CSV parsing, personal ratings, exact ISBN matching and rejects of unrecognised or excessively large files.
- Amazon disabled-by-default policy gate is tested with synthetic credentials; all-search exclusion remains an integration check before staging deployment.

## Authoritative references (checked 1 November 2026)

- Open Library API and usage: https://openlibrary.org/developers/api
- Amazon Creators API: https://affiliate-program.amazon.com.au/creatorsapi/docs/en-us/introduction
- Creators API token flow: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl
- Amazon Associates policies: https://affiliate-program.amazon.com.au/help/operating/policies
- Goodreads official developer statement: https://www.goodreads.com/group/show/8095-goodreads-developers
- Goodreads user library data alternative: https://blog.openlibrary.org/2020/12/13/importing-your-goodreads-accessing-them-with-open-librarys-apis/
