# AccessiBooks @ Hospitals — Unified DOI Enrichment Orchestrator

## Purpose

The DOI enrichment orchestrator turns one DOI into one canonical AccessiBooks research record while preserving provider-specific provenance.

It is designed for **research discovery and evidence support**, not automatic clinical decision-making.

## Processing order

1. **Crossref** is mandatory and establishes canonical DOI identity.
2. Configured optional providers enrich the same record:
   - Springer Nature
   - ScienceDirect
   - Web of Science
   - EBSCO EDS
3. Each provider writes a separate provenance source.
4. An enrichment run records success, skipped providers and errors.
5. The canonical item remains `patientFacing = false` unless a later governance workflow changes it.

## Endpoint

`POST /api/hospitals/knowledge/enrich-doi`

Example:

```json
{
  "doi": "10.1000/example",
  "providers": [
    "crossref",
    "springerNature",
    "scienceDirect",
    "webOfScience",
    "ebsco"
  ],
  "includeFullText": false
}
```

The `providers` field is optional.

Crossref is always included even if the caller omits it because it is the identity/provenance anchor.

`includeFullText` defaults to false. When true, supported publisher connectors may attempt a credentialed full-text request. A returned body does not make the record patient-facing and does not independently establish redistribution rights.

## Provider behaviour

### Crossref

Mandatory identity step.

Creates or updates `hospital_knowledge_items` by DOI and records:
- title
- authors
- journal/container
- publisher
- publication date
- ISSN/ISBN
- licence claims
- cited-by/reference count
- Crossref provenance

If Crossref fails, the enrichment run fails because the system has no canonical identity anchor.

### Springer Nature

Queries Meta API v2 by DOI.

If configured, it stores the exact-match metadata response as a separate source.

When `includeFullText=true`, it may additionally attempt the JATS full-text API. A successful JATS response is recorded as a provider full-text response only; it does not change patient-facing status or imply local redistribution rights.

### ScienceDirect

Uses DOI article retrieval.

Default mode is `META_ABS`.

When `includeFullText=true`, the connector requests `FULL`. A returned article body is recorded as a provider access response. Ordinary identifiers or metadata are not treated as proof of full text.

### Web of Science

Queries Starter API with the supported DOI field:

```
DO=(<doi>)
```

When an exact DOI match is found:
- Web of Science UID is preserved
- record link is preserved
- WOS times-cited count may update the canonical citation count
- metrics source is changed to Web of Science for that verified count

Web of Science citation counts are contextual bibliometrics, not a clinical evidence score.

### EBSCO EDS

EDS search fields are profile-specific. There is no assumption that every EDS profile exposes one universal DOI field code.

The orchestrator therefore performs a conservative unfielded DOI search and:
- marks the result as an exact DOI match only if the DOI is found in returned metadata
- otherwise stores the EDS response as an unverified candidate result
- does not create a permanent full-text link

Full-text access still requires a current EDS retrieve operation because provider URLs can expire.

## Audit model

Every enrichment request creates a row in:

`hospital_knowledge_enrichment_runs`

It records:
- DOI
- canonical knowledge item
- trigger
- requesting user/admin identifier where available
- requested providers
- per-provider results
- provider errors
- start/finish times
- overall status

Possible overall statuses:
- `completed`
- `partial`
- `failed`

A provider being unconfigured is `skipped`, not an error.

## Provenance endpoint

`GET /api/hospitals/knowledge/:id/sources`

Returns each source independently rather than flattening provider claims into one opaque record.

## Run audit endpoint

`GET /api/hospitals/knowledge/enrichment-runs/:id`

Returns the recorded enrichment run.

## Clinical governance

The orchestrator must never automatically convert research discovery into clinical authority.

Canonical research records retain:

```
audience = staff_research
patientFacing = false
clinicalUseStatus = research_reference_only
clinicalReviewStatus = not_reviewed
```

A separate clinical-governance workflow would be required before a record could be labelled:
- patient education
- clinician guidance
- local policy
- approved training material
- decision-support evidence

## Failure behaviour

The orchestrator uses partial-success semantics.

For example:

```
Crossref       success
Springer       skipped
ScienceDirect  success
Web of Science error
EBSCO          success
```

produces an overall `partial` result rather than discarding usable evidence.

Crossref is the only hard dependency because it establishes canonical identity.
