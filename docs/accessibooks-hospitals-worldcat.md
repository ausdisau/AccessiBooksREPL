# AccessiBooks @ Hospitals — WorldCat commercial-title integration

## Purpose

WorldCat is used as a **bibliographic discovery source** for commercial editions.

An ISBN or WorldCat record is evidence that an edition exists. It is **not** evidence that AccessiBooks may reproduce, stream, download, transform or distribute the commercial work.

The local catalogue therefore separates:

- bibliographic metadata;
- OCLC/ISBN identifiers;
- format description;
- AccessiBooks acquisition status;
- copyright/licence status;
- actual accessible-format availability.

## Current implementation

Server-side adapter:

- `server/worldcat.ts`

Catalogue importer:

- `server/worldcatCatalogue.ts`

Database fields include:

- `isbn13`
- `isbn10`
- `oclcNumber`
- `publisher`
- `editionStatement`
- `commercialTitle`
- `acquisitionStatus`

WorldCat imports are created with:

- `rightsStatus = commercial_metadata_only`
- `availabilityStatus = metadata_only`
- `acquisitionStatus = not_acquired`

The importer deliberately leaves AccessiBooks availability flags such as `hasEbook` and `hasAudio` false until a separate lawful supply/licence source is recorded.

## API routes

All WorldCat routes are admin-gated.

### Integration status

`GET /api/hospitals/worldcat/status`

Reports whether server-side credentials have been configured.

### ISBN lookup

`GET /api/hospitals/worldcat/isbn/:isbn`

Uses WorldCat Search API 2.0 brief bibliographic search with the ISBN index.

### Australian holdings lookup

`GET /api/hospitals/worldcat/isbn/:isbn/holdings`

Queries WorldCat holdings for the ISBN and filters to Australia.

Holdings are discovery information only. They do not establish lending eligibility, electronic access or AccessiBooks supply rights.

### Import commercial edition

`POST /api/hospitals/catalogue/worldcat/import-isbn`

Body:

```json
{
  "isbn": "9780000000000"
}
```

The endpoint imports matching WorldCat editions into the local hospital catalogue, preserving the WorldCat/OCLC source record in `hospital_catalogue_sources`.

## OCLC configuration

Configure on the server only:

```
OCLC_WORLDCAT_CLIENT_ID=
OCLC_WORLDCAT_CLIENT_SECRET=
OCLC_WORLDCAT_REGISTRY_ID=
OCLC_WORLDCAT_API_BASE=https://americas.discovery.api.oclc.org
OCLC_TOKEN_URL=https://oauth.oclc.org/token
```

The implementation uses OAuth 2.0 client credentials and requests the WorldCat brief bibliographic scope.

Do not commit WSKey secrets or access tokens to Git.

## Commercial acquisition workflow

A future licensed edition should move through explicit states, for example:

```
not_acquired
    ↓
licence_review
    ↓
licensed_external_access
    or
licensed_hosted
    or
accessible_copy_authorised
```

A metadata import must never automatically cross this boundary.

## Recommended next integrations

WorldCat should remain the bibliographic authority/deduplication layer for commercial editions.

Actual supply should come from independently verified channels, such as:

- publisher licences;
- institutional ebook/audiobook suppliers;
- public-library or hospital-library entitlement where contractual terms permit integration;
- authorised accessible-format entities;
- lawful accessible-format exceptions with the required governance.

Those providers should be attached as additional `hospital_catalogue_sources` records rather than overwriting the WorldCat record.
