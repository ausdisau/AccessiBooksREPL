# AccessiBooks Multi-Distribution Architecture

## Goal

AccessiBooks is one platform with multiple distribution experiences, not a collection of forks.

Canonical content identity, rights provenance, source records, accessibility metadata and acquisition state are shared. Each distribution controls presentation, audience, collection membership and policy without duplicating the underlying book/edition.

## Initial distributions

### AccessiBooks Core
General consumer reader and player.

### AccessiBooks @ Hospitals
Path: `/hospitals`

Focus:
- bedside leisure reading
- long-stay and rehabilitation reading
- paediatrics/family reading
- hospital library discovery
- strict separation of leisure reading from clinical information
- clinical-review gate for any patient-facing health content

### AccessiBooks Educate
Path: `/educate`

Focus:
- curriculum and class texts
- study support
- institution-managed access
- learner-selected formats
- classroom/institution entitlement kept separate from metadata discovery

### AccessiBooks Libraries
Path: `/libraries`

Focus:
- bibliographic discovery
- local/external holdings
- borrowing and SSO routes
- open-access alternatives
- verified holdings/borrow route required before availability claims

### AccessiBooks Community
Path: `/community`

Focus:
- disability-led collections
- Easy Read
- AAC-friendly and large-text presentation
- independent living and community stories
- non-medicalised disability framing
- supporter assistance without overriding reader control

### AccessiBooks Kids
Path: `/kids`

Focus:
- read-aloud
- large controls
- reduced-motion friendly interactions
- family/supporter-assisted use
- age suitability and content warnings based on verified metadata

## Shared data model

`hospital_catalogue_items` currently remains the canonical commercial/accessibility edition table for this branch.

The new distribution layer adds:

`accessibooks_distributions`

Stores:
- code
- display name
- public path
- supported audiences
- collections
- formats
- policy profile
- branding manifest
- lifecycle status

`accessibooks_distribution_memberships`

Links a canonical edition to one distribution with:
- collection
- audience
- discoverability state
- featured state
- sort rank
- presentation overrides
- policy overrides

One edition can therefore appear in several distributions without copying rights or bibliographic data.

## Example

A single ISBN may be:

- Hospitals → `bedside-reading`, adult
- Educate → `class-texts`, secondary
- Libraries → `local-holdings`, public library
- Community → `disability-voices`, adults
- Kids → absent

The ISBN, author, publisher, WorldCat/VitalSource provenance and rights state remain one canonical record.

## API

### List distributions

`GET /api/distributions`

### Distribution metadata

`GET /api/distributions/:code`

### Distribution catalogue

`GET /api/distributions/:code/catalogue`

Query parameters:
- `q`
- `collection`
- `audience`
- `limit`

### Add existing catalogue item to a distribution

Admin-only:

`POST /api/distributions/:code/catalogue/:itemId`

Example body:

```json
{
  "collection": "class-texts",
  "audience": "secondary",
  "featured": true,
  "sortRank": 10,
  "presentation": {
    "badge": "Class text"
  },
  "policyOverrides": {
    "institutionEntitlementRequired": true
  }
}
```

## UI architecture

The authenticated application navigation supports:
- Library
- Hospitals
- Educate
- Libraries
- Community
- Kids
- Player

Public prototype routes are implemented for:
- `/educate`
- `/libraries`
- `/community`
- `/kids`

Hospitals remains a specialised catalogue view because it already uses the live hospital catalogue API.

A reusable `DistributionPage` component renders the non-hospital distributions from a shared manifest.

## Design rule

A distribution is a **policy and presentation layer**, not a new content database.

Do not fork the catalogue just to create a new market/setting.

New future distributions should normally require:
1. a new distribution manifest;
2. policy profile;
3. collections/audiences;
4. membership data;
5. optional specialised UI components only where genuinely necessary.

## Potential future flavors

- AccessiBooks Aged Care
- AccessiBooks Rehab
- AccessiBooks Justice
- AccessiBooks Workplace
- AccessiBooks University
- AccessiBooks First Nations
- AccessiBooks Easy Read
- AccessiBooks Professional / Clinical Learning

These are architecture-ready concepts, not deployed features.

## Status semantics

Every distribution must use the same explicit availability labels:
- available
- licensed external access
- licensed hosted
- metadata only
- external source
- demo
- not verified

A distribution must never override a canonical rights restriction merely for presentation convenience.
