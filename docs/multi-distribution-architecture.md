# AccessiBooks Multi-Distribution Architecture

## Goal

AccessiBooks is one platform with multiple distribution experiences, not a collection of forks.

Canonical content identity, rights provenance, source records, accessibility metadata and acquisition state are shared. Each distribution controls presentation, audience, collection membership and policy without duplicating the underlying book/edition.

## Implemented distributions

### AccessiBooks Core
General consumer reader and player.

### AccessiBooks @ Hospitals
Path: `/hospitals`

Focus:
- bedside leisure reading
- long-stay, paediatrics and rehabilitation reading
- hospital library discovery
- strict separation of leisure reading from clinical information

### AccessiBooks Educate
Path: `/educate`

Focus:
- schools, TAFE and learning settings
- curriculum and class texts
- study support
- institution-managed access

### AccessiBooks Libraries
Path: `/libraries`

Focus:
- bibliographic discovery
- local/external holdings
- borrowing and SSO routes
- open-access alternatives

### AccessiBooks Community
Path: `/community`

Focus:
- disability-led collections
- Easy Read and AAC-friendly presentation
- independent living and community stories
- non-medicalised disability framing

### AccessiBooks Kids
Path: `/kids`

Focus:
- read-aloud
- large controls
- reduced-motion friendly interactions
- family/supporter-assisted use

### AccessiBooks Aged Care
Path: `/aged-care`

Focus:
- residential aged care and home care
- large-text and audio options
- familiar interests and later-life reading
- no inference of capacity from age or diagnosis

### AccessiBooks Rehab
Path: `/rehab`

Focus:
- inpatient, outpatient and community rehabilitation
- leisure reading alongside reviewed rehabilitation education
- communication access and AAC
- no scoring of recovery or inferred goals

### AccessiBooks Workplace
Path: `/workplace`

Focus:
- accessible induction and professional learning
- workplace rights and career development
- confidential, reader-controlled access preferences
- entitlement separate from discovery

### AccessiBooks Justice
Path: `/justice`

Focus:
- court and legal-service information
- education and leisure reading in justice settings
- jurisdiction/currency provenance
- strict separation of legal information from legal advice

### AccessiBooks University
Path: `/university`

Focus:
- course readings and textbooks
- DOI research discovery
- institutional entitlements
- publisher accessibility claims separated from independent testing

### AccessiBooks Easy Read
Path: `/easy-read`

Focus:
- Easy Read as a reader-selected format
- plain-language public information
- rights/community/health collections
- no inference of cognitive capacity from format preference

### AccessiBooks Professional / Clinical Learning
Path: `/professional`

Focus:
- clinicians, allied health, disability workers and educators
- research, standards, simulation and professional learning
- provenance and entitlement
- clinical review before material is labelled as guidance

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

## Extension model

Additional distributions can be added without forking the application. A new distribution normally needs only:
1. a distribution manifest;
2. a server seed/policy profile;
3. optional distribution-specific membership data;
4. specialised UI only where the shared page is insufficient.

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
