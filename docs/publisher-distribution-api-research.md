# AccessiBooks @ Hospitals — Publisher and Book Distribution API/SDK Research

Research date: 6 October 2026

## Executive finding

AccessiBooks should not build one generic "book API" connector.

The commercial supply chain separates into five technically and legally different layers:

1. **Bibliographic identity and discovery** — ISBN, OCLC, work/edition metadata.
2. **Publisher metadata feeds** — authoritative product metadata, supply detail, accessibility claims and licence metadata.
3. **Institutional acquisition and entitlement** — whether Australian Disability Ltd, a health service, hospital or library has actually licensed a title.
4. **Reader/circulation delivery** — checkout, fulfilment, SSO, DRM or external launch.
5. **Retail/consumer fallback** — lawful external purchase or subscription routes that are not institutional entitlements.

The AccessiBooks catalogue should preserve these as separate source, acquisition and access-route records.

## Recommended integration order

### Tier 1 — build/partner first

#### 1. VitalSource

**Role:** commercial ebook delivery, fulfilment and accessible-title metadata.

**Technical surface**
- REST inventory/products API
- licences and fulfilments
- user provisioning
- SSO redirects to Bookshelf
- LTI / VitalSource Launch
- LearnKit JavaScript APIs
- publisher asset APIs

**Accessibility advantage**
Product detail can return `accessibility_claims` mapped to W3C Accessibility Display fields, including ways of reading, conformance, navigation, rich content, hazards and accessibility summaries.

**AccessiBooks use**
- identify licensed commercial digital titles
- ingest edition/ISBN/publisher data
- ingest publisher-supplied accessibility claims
- fulfil institutional licences
- launch users into Bookshelf through SSO
- preserve the VitalSource VBID as a supplier identifier

**Recommendation:** highest-priority commercial ebook partnership.

Sources:
- https://developer.vitalsource.com/hc/en-us/categories/360001974433-API-Index
- https://developer.vitalsource.com/hc/en-us/articles/360010967153-GET-v4-products-vbid-Title-TOC-Metadata
- https://developer.vitalsource.com/hc/en-us/sections/360004829213-Bookshelf-workflow-using-our-RESTful-APIs

#### 2. OverDrive / Libby

**Role:** institutional ebook and audiobook discovery/circulation.

**Technical surface**
- Library Account API
- Search API
- Metadata API
- Library Availability API
- Digital Inventory API
- Patron Information API
- Checkouts API
- Holds API
- Title Link API
- integration/test environment

**AccessiBooks use**
- expose licensed hospital/library collections
- map ISBN/digital ISBN to OverDrive reserveId/titleId
- show copies/holds/availability
- borrow and return where approved Circulation API access exists
- route a patient to an authorised Libby/OverDrive fulfilment flow

**Constraint:** credentials are tied to an approved library/school/vendor integration.

**Recommendation:** highest-priority circulation partnership.

Sources:
- https://developer.overdrive.com/
- https://developer.overdrive.com/getting-started/api-overview
- https://developer.overdrive.com/api-docs/discovery-apis/search
- https://developer.overdrive.com/api-docs/circulation-apis/checkouts

#### 3. Direct Publisher ONIX 3.x ingestion

**Role:** vendor-neutral authoritative metadata and rights/supply feed.

**Technical surface**
- ONIX for Books 3.0/3.1 XML
- EDItEUR codelists
- publisher/distributor SFTP, object storage or HTTP feed delivery

**AccessiBooks use**
- ingest commercial ISBN editions directly from publishers/distributors
- preserve product form and digital format
- price/supply status
- territorial sales rights
- EPUB licence information
- accessibility metadata where supplied
- map related editions without collapsing them into one record

**Implementation rule:** support ONIX 3.0 and 3.1 only. ONIX 2.1 is obsolete and EDItEUR withdrew its legacy support files in April 2026.

**Recommendation:** make ONIX the canonical direct-publisher intake format.

Sources:
- https://ns.editeur.org/onix/
- https://www.editeur.org/files/ONIX%20for%20books%20-%20code%20lists/ONIX_BookProduct_Codelists_Issue_66.html

#### 4. Wheelers ePlatform

**Role:** Australian/NZ institutional ebook and audiobook platform.

**Verified public capabilities**
- institutional purchasing
- DRM/hosting
- ebook and audiobook collections
- LMS integration / API where available
- SSO
- SIP2 and other patron-authentication integrations
- brief MARC records with title links
- Australian public-library pricing
- 4,000+ publisher relationships

**Constraint:** no general-purpose public developer API comparable with OverDrive/VitalSource was verified. Treat it as a commercial partnership/integration rather than an open API dependency.

**Recommendation:** high-priority Australian commercial discussion, particularly for hospital or health-service institutional licensing.

Sources:
- https://www.eplatform.co/au/
- https://www.eplatform.co/au/pricing/public-libraries/
- https://www.eplatform.co/au/blog/2025/lms-and-sso-integration-guide/
- https://www.eplatform.co/faq

### Tier 2 — institutional enrichment and entitlements

#### 5. EBSCO

**Role:** institution-specific discovery, knowledge-base holdings and full-text entitlement.

**Technical surface**
- EDS API
- HoldingsIQ
- LinkIQ
- PublicationIQ
- EBSCOhost Entitlement API

**AccessiBooks use**
- search a participating hospital/health-network collection
- resolve institution holdings
- link patrons to licensed full text
- combine consumer/leisure and professional/health-information layers without treating EBSCO content as globally licensed

**Constraint:** customer account/profile and API enablement are required.

Sources:
- https://developer.ebsco.com/home/docs/available-apis-and-requirements
- https://developer.ebsco.com/eds-api/docs/introduction
- https://developer.ebsco.com/home/page/search-discovery

#### 6. Bowker Books In Print / Book Metadata Service

**Role:** commercial bibliographic enrichment and ISBN lookup.

**Technical surface**
- Book Metadata Service REST endpoints
- ISBN lookup
- Books In Print / licensed Bowker Book Data

**AccessiBooks use**
- alternate ISBN authority/enrichment alongside WorldCat
- format/edition discovery
- publisher/product metadata quality control

**Constraint:** metadata licensing; not content fulfilment.

Sources:
- https://www.bowker.com/books-in-print
- https://www.bowker.com/bowker-book-data
- https://bms.bowker.com/help/

#### 7. Penguin Random House public API

**Role:** direct publisher metadata for PRH titles.

**Technical surface**
- Enhanced PRH API
- title lookup by ISBN
- works/authors/categories/imprints
- additional content
- retail links
- sales restrictions

**AccessiBooks use**
- enrich PRH ISBN records with publisher-authoritative metadata
- retrieve related work/edition relationships
- use retail/sales-restriction data as a discovery hint

**Constraint:** metadata API only. It does not establish ebook/audiobook distribution rights.

Sources:
- https://developer.penguinrandomhouse.com/
- https://developer.penguinrandomhouse.com/docs
- https://developer.penguinrandomhouse.com/docs/read/enhanced_prh_api/resources/Title

### Tier 3 — useful secondary discovery

#### 8. Google Books API

**Role:** ISBN/OCLC discovery, preview and geographic viewability.

**AccessiBooks use**
- search by `isbn:` or `oclc:`
- previews
- public/free ebook discovery
- supplementary covers/descriptions

**Important limitation:** Google explicitly states that Books API is not intended to replace commercial metadata services. Access/viewability is also location-sensitive.

Sources:
- https://developers.google.com/books
- https://developers.google.com/books/docs/v1/using
- https://developers.google.com/books/docs/overview

#### 9. Open Library

**Role:** mission-aligned public discovery and work/edition reconciliation.

**Technical surface**
- Search API
- Works API
- Editions API
- ISBN API
- official Python client
- monthly data dumps

**AccessiBooks use**
- low-volume human lookup
- open/public-domain enrichment
- work/edition reconciliation

**Constraint:** Open Library explicitly says its public APIs should not be used as the backend of a high-traffic commercial service. Use its data dumps for bulk workflows.

Sources:
- https://openlibrary.org/developers/api
- https://openlibrary.org/dev/docs/api/books

#### 10. Spotify Audiobooks

**Role:** external consumer audiobook discovery.

**Technical surface**
- Web API audiobook search
- audiobook metadata
- chapters
- user saved-audiobook state

**Australian relevance:** audiobooks are supported in the Australian market.

**Constraint:** Spotify content must not be downloaded or stream-ripped and metadata/artwork must retain Spotify attribution. This is not an institutional hospital licence.

Sources:
- https://developer.spotify.com/documentation/web-api/reference/get-an-audiobook
- https://developer.spotify.com/documentation/web-api/reference/search

#### 11. Amazon Creators API

**Role:** retail product discovery/affiliate fallback.

**Important 2026 change**
PA-API 5 is deprecated and Amazon says old requests now return HTTP 403. The replacement is Creators API.

**Technical surface**
- REST
- OAuth 2.0
- SearchItems
- GetItems
- GetVariations
- GetBrowseNodes
- official Node.js, Python, PHP and Java SDKs

**AccessiBooks use**
- optional retail fallback for a title not institutionally licensed
- current product information and external purchase links

**Constraint:** Amazon Associates/Creators eligibility applies; this is retail discovery, not hospital content entitlement.

Sources:
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation
- https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-sdk

## Publisher-side distribution

### Ingram CoreSource

CoreSource is primarily useful on the **publisher/distributor side**, not as an open patient-facing acquisition API.

Ingram describes CoreSource as a platform for managing ebook/audiobook assets, metadata and distribution to hundreds of retail, library and discovery channels.

Potential AccessiBooks role:
- become an approved destination/distribution partner;
- accept publisher deliveries routed via CoreSource;
- expose AccessiBooks as a hospital-accessibility channel;
- use Ingram/ONIX metadata for incoming titles.

No open self-service CoreSource developer API suitable for immediate unaffiliated integration was verified during this research; treat it as a partnership target.

Sources:
- https://www.ingramcontent.com/publishers/digital-sales-distribution
- https://www.ingramcontent.com/publishers/distribution
- https://lp.ingramcontent.com/publishers/coresource-direct-partners

## Major publishers without a verified public delivery API

A current public title metadata API was verified for Penguin Random House.

Comparable open, documented commercial delivery APIs were **not verified** for the other major trade publishers searched, including HarperCollins, Hachette, Simon & Schuster and Macmillan.

Do not infer that these publishers lack partner feeds. The book trade commonly exchanges publisher/distributor metadata through ONIX and private commercial feeds. For AccessiBooks, publisher outreach should ask for:

1. ONIX 3.1 metadata feed;
2. cover/media asset feed;
3. digital accessibility metadata;
4. territory/sales-rights data;
5. institutional/hospital licence model;
6. ebook/audiobook fulfilment method;
7. accessible-format accommodation process;
8. test ISBNs and sandbox credentials where an API exists.

## Recommended AccessiBooks connector model

```
                        ┌─────────────────┐
                        │ WorldCat/Bowker │
                        │ ISBN identity   │
                        └────────┬────────┘
                                 │
                ┌────────────────▼────────────────┐
                │ AccessiBooks canonical edition │
                │ ISBN + OCLC + work relation    │
                └───────────────┬─────────────────┘
                                │
         ┌──────────────────────┼────────────────────────┐
         │                      │                        │
 ┌───────▼────────┐    ┌────────▼─────────┐    ┌────────▼────────┐
 │ Publisher feed │    │ Licensed supply  │    │ Retail fallback │
 │ ONIX / PRH     │    │ OD / VS / Wheel. │    │ Amazon/Spotify  │
 └───────┬────────┘    └────────┬─────────┘    └─────────────────┘
         │                      │
         │              ┌───────▼───────────────┐
         │              │ Acquisition record   │
         │              │ scope + term + rights│
         │              └───────┬───────────────┘
         │                      │
         └──────────────────────▼──────────────────────┐
                                │                     │
                        ┌───────▼────────┐    ┌──────▼─────────┐
                        │ Access route   │    │ Access metadata│
                        │ SSO/checkout   │    │ W3C/ONIX       │
                        └───────┬────────┘    └──────┬─────────┘
                                └──────────┬──────────┘
                                           │
                                  ┌────────▼────────┐
                                  │ Patient-facing │
                                  │ AccessiBooks   │
                                  └─────────────────┘
```

## Engineering priority

1. Finish **OverDrive** candidate + collection-entitlement adapter.
2. Build **VitalSource** inventory, accessibility-claims, fulfilment and SSO adapter.
3. Add a robust **ONIX 3.0/3.1 importer** with ISBN-level edition preservation.
4. Open a commercial conversation with **Wheelers ePlatform** for hospital/public-library-style licensing and API/LMS integration.
5. Add **Bowker** as optional ISBN metadata enrichment.
6. Add **PRH API** as the first direct publisher metadata adapter.
7. Add **EBSCO** only when a participating hospital/health-network subscription is identified.
8. Replace the repository's deprecated Amazon PA-API implementation with **Amazon Creators API**.
9. Keep Google Books, Open Library and Spotify as secondary discovery/external-route sources, not entitlement authorities.

## Non-negotiable rule

No connector may change a catalogue title to `available` solely because a vendor API returns metadata or a retail listing.

A patient-facing route requires:
- an identified edition;
- a defined institutional/user scope;
- a lawful rights basis or entitlement;
- a verified route;
- a last-verified timestamp;
- accessibility metadata that is labelled as publisher/vendor supplied unless independently tested.
