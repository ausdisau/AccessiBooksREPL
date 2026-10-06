# AccessiBooks @ Hospitals — Research & Current Awareness Stack

Research date: 6 October 2026

## Purpose

This subsystem adds scholarly literature, journal metrics, licensed publisher content and news/current-awareness feeds to AccessiBooks @ Hospitals without treating those records as ordinary books or as patient-facing clinical advice.

The architecture keeps four concepts separate:

1. **Metadata / identity** — DOI, title, authors, journal, publisher.
2. **Metrics / evidence signals** — citation counts and journal metrics.
3. **Full-text entitlement** — whether an institution/user is actually authorised to retrieve content.
4. **Clinical use** — whether material has been reviewed or curated for patient-facing or clinical decision use.

By default every imported scholarly/news record is:
- `audience = staff_research`
- `patientFacing = false`
- `clinicalUseStatus = research_reference_only`
- `clinicalReviewStatus = not_reviewed`

## Providers

### Crossref REST API

**Role:** canonical DOI metadata and relationship layer.

**Status:** connector implemented; public access works without registration.

Use it for:
- DOI lookup and search
- article/book-chapter identity
- authors, publisher, dates, ISSN/ISBN
- abstracts where deposited
- licence links
- Crossref cited-by/reference counts
- ORCID/ROR/funding relationships where deposited

Do not treat Crossref metadata as full-text entitlement.

The integration supports the public, polite and Metadata Plus access modes.

### Springer Nature

**Role:** publisher metadata, abstracts and permitted full text.

**Status:** credential-ready connector implemented.

Endpoints used:
- `/meta/v2/json`
- `/xmldata/jats`

The full-text host is `api.springernature.com`; the previous `spdi.public.springernature.app` host was retired on 7 August 2026.

Full-text use remains subject to Springer Nature API/TDM terms and the caller's plan.

### Web of Science

**Role:** bibliographic/citation enrichment and journal metrics.

**Status:** credential-ready connector implemented.

Two separate products are modelled:

**Starter API**
- base: `https://api.clarivate.com/apis/wos-starter/v1`
- document search
- document lookup
- article-level metadata
- times-cited where the plan permits
- journal lookup by ISSN

**Journals API**
- base: `https://api.clarivate.com/apis/wos-journals/v1`
- Journal Citation Reports metadata
- journal-level metrics including Journal Impact Factor
- paid JCR/InCites licence required

The Journals API must not be used as if it supplies article-level citation records.

### Elsevier ScienceDirect

**Role:** Elsevier scholarly search and entitled article retrieval.

**Status:** credential-ready connector implemented.

Endpoints:
- `/content/search/sciencedirect`
- `/content/article/doi/{doi}`

Authentication:
- `X-ELS-APIKey`
- optional institutional token
- optional end-user OAuth token for user-specific entitlements

Full text is returned only where entitlement/Open Access rules permit. Otherwise the integration must remain at metadata/abstract level.

### News API

**Role:** current-awareness and source/headline discovery.

**Status:** credential-ready connector implemented.

Endpoints:
- `/v2/everything`
- `/v2/top-headlines/sources`

Important:
- News API does not provide licensed full article text.
- The free Developer plan is for development/testing, not production.
- Patient-facing use must link to the original publisher and respect publisher rights.

### LexisNexis / Nexis Data as a Service

**Role:** licensed news archives, news monitoring and enterprise search/retrieve.

**Status:** partnership required; provider registered but no fabricated endpoint is implemented.

Verified capabilities include:
- REST search/retrieve
- archives and current news
- monitoring/alerts
- OAuth 2.0
- OData 4.0 in relevant Web Services API products
- XML/JSON or other delivery options depending on the licensed product

The exact endpoint contract, licensed datasets and redistribution rights are provisioned through the LexisNexis developer/customer portal. Implement only after those details are supplied.

## EBSCO

EBSCO EDS is also part of this research layer.

The implemented connector supports:
- EDS authentication
- per-operation session tokens
- profile capability inspection
- general search
- ISBN search (`IB:`)
- retrieve
- EPUB/PDF/HTML/full-text availability inspection

EBSCO full-text URLs may expire and are therefore retrieved dynamically rather than persisted as permanent AccessiBooks links.

## Research data model

`hospital_knowledge_items` stores canonical scholarly/news records.

Important fields:
- kind
- title / abstract / authors
- DOI / ISSN / ISBN / PMID
- publisher / container title
- open-access indicator
- full-text status
- entitlement status
- licence status
- citation count
- journal impact factor
- clinical-use status
- patient-facing gate
- provenance

`hospital_knowledge_sources` preserves every upstream provider independently.

A DOI may therefore have:

```
Crossref           -> identity / DOI metadata
Springer Nature    -> publisher metadata / permitted JATS
Web of Science     -> citation metrics
ScienceDirect      -> entitled Elsevier full text
EBSCO              -> institutional discovery/full-text route
```

without one source overwriting another.

## API surface

Provider registry/status:

- `GET /api/hospitals/knowledge/providers`
- `GET /api/hospitals/research/status`

Crossref:

- `GET /api/hospitals/research/crossref/doi/:doi`
- `GET /api/hospitals/research/crossref/search`
- `POST /api/hospitals/knowledge/crossref/import-doi`

Springer Nature:

- `GET /api/hospitals/research/springer/search`
- `GET /api/hospitals/research/springer/doi/:doi`
- `GET /api/hospitals/research/springer/doi/:doi/fulltext-jats`

Web of Science:

- `GET /api/hospitals/research/wos/search`
- `GET /api/hospitals/research/wos/documents/:uid`
- `GET /api/hospitals/research/wos/journals?issn=...`
- `GET /api/hospitals/research/wos/journals/:id/reports/:year`

ScienceDirect:

- `GET /api/hospitals/research/sciencedirect/search`
- `GET /api/hospitals/research/sciencedirect/doi/:doi`

News API:

- `GET /api/hospitals/news/search`
- `GET /api/hospitals/news/sources`

EBSCO:

- `GET /api/hospitals/ebsco/status`
- `GET /api/hospitals/ebsco/info`
- `GET /api/hospitals/ebsco/search`
- `GET /api/hospitals/ebsco/isbn/:isbn`
- `POST /api/hospitals/ebsco/retrieve`

## Safety and clinical governance

Research APIs are evidence-discovery infrastructure, not a clinical recommendation engine.

Before material can be labelled as patient education or clinical guidance, a separate governance step should establish:
- intended audience and purpose
- currency
- evidence quality
- clinical review
- local-policy alignment
- accessibility
- licence/redistribution rights
- plain-language suitability where patient-facing

Citation counts and Journal Impact Factor are contextual metrics, not evidence-quality scores and must not be used alone to rank clinical truth.
