import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "./db";
import {
  hospitalCatalogueItems,
  type HospitalCatalogueItem,
  type InsertHospitalCatalogueItem,
} from "@shared/schema";

export interface HospitalCatalogueQuery {
  q?: string;
  audience?: string;
  collection?: string;
  language?: string;
  rightsStatus?: string;
  availabilityStatus?: string;
  format?: "audio" | "ebook" | "html" | "text" | "pdf" | "daisy" | "large-print" | "braille" | "transcript";
  clinicalInformation?: boolean;
  sort?: "title" | "author" | "recent";
  limit?: number;
  offset?: number;
}

const starterItems: InsertHospitalCatalogueItem[] = [
  {
    slug: "pride-and-prejudice-jane-austen",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    description: "A classic novel of family, social expectations, first impressions and relationships.",
    publicationYear: 1813,
    language: "en",
    audience: "adult",
    contentKind: "book",
    primaryCollection: "leisure-reading",
    genres: ["classic literature", "romance"],
    subjects: ["families", "relationships", "social class"],
    hospitalTags: ["long-stay", "bedside-reading", "classic"],
    sourceProvider: "Project Gutenberg",
    sourceId: "1342",
    sourceUrl: "https://www.gutenberg.org/ebooks/1342",
    rightsStatus: "source_public_domain_us",
    rightsJurisdiction: "AU",
    rightsNote: "Project Gutenberg marks this edition public domain in the USA. Australian distribution or local hosting must be separately rights-checked before AccessiBooks republishes files.",
    availabilityStatus: "external_read",
    availabilityNote: "External Project Gutenberg page provides browser reading and downloadable text/ebook formats.",
    hasAudio: false,
    hasEbook: true,
    hasHtml: true,
    hasPlainText: true,
    hasPdf: false,
    hasDaisy: false,
    hasLargePrint: false,
    hasBraille: false,
    transcriptAvailable: false,
    ttsFriendly: true,
    searchText: "pride and prejudice jane austen classic literature romance families relationships social class bedside reading",
    clinicalInformation: false,
    clinicalReviewStatus: "not_applicable",
  },
  {
    slug: "jane-eyre-charlotte-bronte",
    title: "Jane Eyre: An Autobiography",
    author: "Charlotte Brontë",
    description: "A coming-of-age novel following Jane Eyre through childhood, work, independence and relationships.",
    publicationYear: 1847,
    language: "en",
    audience: "adult",
    contentKind: "book",
    primaryCollection: "leisure-reading",
    genres: ["classic literature", "fiction"],
    subjects: ["independence", "relationships", "young women"],
    hospitalTags: ["long-stay", "bedside-reading", "classic"],
    sourceProvider: "Project Gutenberg",
    sourceId: "1260",
    sourceUrl: "https://www.gutenberg.org/ebooks/1260",
    rightsStatus: "source_public_domain_us",
    rightsJurisdiction: "AU",
    rightsNote: "Project Gutenberg marks this edition public domain in the USA. Australian distribution or local hosting must be separately rights-checked before AccessiBooks republishes files.",
    availabilityStatus: "external_read",
    availabilityNote: "External Project Gutenberg page provides browser reading and downloadable text/ebook formats.",
    hasAudio: false,
    hasEbook: true,
    hasHtml: true,
    hasPlainText: true,
    hasPdf: false,
    hasDaisy: false,
    hasLargePrint: false,
    hasBraille: false,
    transcriptAvailable: false,
    ttsFriendly: true,
    searchText: "jane eyre charlotte bronte classic literature fiction independence relationships young women bedside reading",
    clinicalInformation: false,
    clinicalReviewStatus: "not_applicable",
  },
  {
    slug: "the-time-machine-hg-wells",
    title: "The Time Machine",
    author: "H. G. Wells",
    description: "A foundational science-fiction novella about a traveller who journeys into humanity's distant future.",
    publicationYear: 1895,
    language: "en",
    audience: "young-adult",
    contentKind: "book",
    primaryCollection: "shorter-reads",
    genres: ["science fiction", "classic literature"],
    subjects: ["time travel", "future societies"],
    hospitalTags: ["shorter-read", "bedside-reading", "classic"],
    sourceProvider: "Project Gutenberg",
    sourceId: "35",
    sourceUrl: "https://www.gutenberg.org/ebooks/35",
    rightsStatus: "source_public_domain_us",
    rightsJurisdiction: "AU",
    rightsNote: "Project Gutenberg marks this edition public domain in the USA. Australian distribution or local hosting must be separately rights-checked before AccessiBooks republishes files.",
    availabilityStatus: "external_read",
    availabilityNote: "External Project Gutenberg page provides browser reading and downloadable text/ebook formats.",
    hasAudio: false,
    hasEbook: true,
    hasHtml: true,
    hasPlainText: true,
    hasPdf: false,
    hasDaisy: false,
    hasLargePrint: false,
    hasBraille: false,
    transcriptAvailable: false,
    ttsFriendly: true,
    searchText: "the time machine h g wells science fiction classic literature time travel future societies shorter read",
    clinicalInformation: false,
    clinicalReviewStatus: "not_applicable",
  },
  {
    slug: "the-secret-garden-frances-hodgson-burnett",
    title: "The Secret Garden",
    author: "Frances Hodgson Burnett",
    description: "A children's classic about friendship, change, a hidden garden and a group of young people rebuilding their worlds.",
    publicationYear: 1911,
    language: "en",
    audience: "children",
    contentKind: "book",
    primaryCollection: "children-and-families",
    genres: ["children's fiction", "classic literature"],
    subjects: ["friendship", "gardens", "disability"],
    hospitalTags: ["paediatrics", "family-reading", "bedside-reading"],
    sourceProvider: "Project Gutenberg",
    sourceId: "17396",
    sourceUrl: "https://www.gutenberg.org/ebooks/17396",
    rightsStatus: "source_public_domain_us",
    rightsJurisdiction: "AU",
    rightsNote: "Project Gutenberg marks this edition public domain in the USA. Australian distribution or local hosting must be separately rights-checked before AccessiBooks republishes files.",
    availabilityStatus: "external_read",
    availabilityNote: "External Project Gutenberg page provides browser reading and downloadable text/ebook formats.",
    hasAudio: false,
    hasEbook: true,
    hasHtml: true,
    hasPlainText: true,
    hasPdf: false,
    hasDaisy: false,
    hasLargePrint: false,
    hasBraille: false,
    transcriptAvailable: false,
    ttsFriendly: true,
    searchText: "the secret garden frances hodgson burnett childrens fiction classic friendship gardens disability paediatrics family reading",
    clinicalInformation: false,
    clinicalReviewStatus: "not_applicable",
  },
  {
    slug: "anne-of-green-gables-lm-montgomery",
    title: "Anne of Green Gables",
    author: "L. M. Montgomery",
    description: "A warm coming-of-age story following Anne Shirley as she finds belonging, friendship and education on Prince Edward Island.",
    publicationYear: 1908,
    language: "en",
    audience: "children",
    contentKind: "book",
    primaryCollection: "children-and-families",
    genres: ["children's fiction", "classic literature"],
    subjects: ["friendship", "belonging", "education"],
    hospitalTags: ["paediatrics", "family-reading", "bedside-reading"],
    sourceProvider: "Project Gutenberg",
    sourceId: "45",
    sourceUrl: "https://www.gutenberg.org/ebooks/45",
    rightsStatus: "source_public_domain_us",
    rightsJurisdiction: "AU",
    rightsNote: "Project Gutenberg marks this edition public domain in the USA. Australian distribution or local hosting must be separately rights-checked before AccessiBooks republishes files.",
    availabilityStatus: "external_read",
    availabilityNote: "External Project Gutenberg page provides browser reading and downloadable text/ebook formats.",
    hasAudio: false,
    hasEbook: true,
    hasHtml: true,
    hasPlainText: true,
    hasPdf: false,
    hasDaisy: false,
    hasLargePrint: false,
    hasBraille: false,
    transcriptAvailable: false,
    ttsFriendly: true,
    searchText: "anne of green gables l m montgomery childrens fiction classic friendship belonging education paediatrics family reading",
    clinicalInformation: false,
    clinicalReviewStatus: "not_applicable",
  },
  {
    slug: "a-tale-of-two-cities-charles-dickens",
    title: "A Tale of Two Cities",
    author: "Charles Dickens",
    description: "A historical novel set in London and Paris before and during the French Revolution.",
    publicationYear: 1859,
    language: "en",
    audience: "adult",
    contentKind: "book",
    primaryCollection: "leisure-reading",
    genres: ["historical fiction", "classic literature"],
    subjects: ["French Revolution", "London", "Paris"],
    hospitalTags: ["long-stay", "bedside-reading", "classic"],
    sourceProvider: "Project Gutenberg",
    sourceId: "98",
    sourceUrl: "https://www.gutenberg.org/ebooks/98",
    rightsStatus: "source_public_domain_us",
    rightsJurisdiction: "AU",
    rightsNote: "Project Gutenberg notes that users outside the USA should check local copyright law. Australian distribution or local hosting must be separately rights-checked before AccessiBooks republishes files.",
    availabilityStatus: "external_read",
    availabilityNote: "External Project Gutenberg page provides browser reading and downloadable formats.",
    hasAudio: false,
    hasEbook: true,
    hasHtml: true,
    hasPlainText: true,
    hasPdf: false,
    hasDaisy: false,
    hasLargePrint: false,
    hasBraille: false,
    transcriptAvailable: false,
    ttsFriendly: true,
    searchText: "a tale of two cities charles dickens historical fiction classic french revolution london paris long stay bedside reading",
    clinicalInformation: false,
    clinicalReviewStatus: "not_applicable",
  },
];

export async function ensureHospitalCatalogueSeeded(): Promise<void> {
  const existing = await db.select({ id: hospitalCatalogueItems.id }).from(hospitalCatalogueItems).limit(1);
  if (existing.length > 0) return;
  await db.insert(hospitalCatalogueItems).values(starterItems);
}

export async function searchHospitalCatalogue(query: HospitalCatalogueQuery) {
  await ensureHospitalCatalogueSeeded();

  const conditions: SQL[] = [];
  if (query.q?.trim()) {
    const term = `%${query.q.trim()}%`;
    const search = or(
      ilike(hospitalCatalogueItems.title, term),
      ilike(hospitalCatalogueItems.author, term),
      ilike(hospitalCatalogueItems.searchText, term),
    );
    if (search) conditions.push(search);
  }
  if (query.audience) conditions.push(eq(hospitalCatalogueItems.audience, query.audience));
  if (query.collection) conditions.push(eq(hospitalCatalogueItems.primaryCollection, query.collection));
  if (query.language) conditions.push(eq(hospitalCatalogueItems.language, query.language));
  if (query.rightsStatus) conditions.push(eq(hospitalCatalogueItems.rightsStatus, query.rightsStatus));
  if (query.availabilityStatus) conditions.push(eq(hospitalCatalogueItems.availabilityStatus, query.availabilityStatus));
  if (typeof query.clinicalInformation === "boolean") {
    conditions.push(eq(hospitalCatalogueItems.clinicalInformation, query.clinicalInformation));
  }

  const formatColumn = query.format
    ? {
        audio: hospitalCatalogueItems.hasAudio,
        ebook: hospitalCatalogueItems.hasEbook,
        html: hospitalCatalogueItems.hasHtml,
        text: hospitalCatalogueItems.hasPlainText,
        pdf: hospitalCatalogueItems.hasPdf,
        daisy: hospitalCatalogueItems.hasDaisy,
        "large-print": hospitalCatalogueItems.hasLargePrint,
        braille: hospitalCatalogueItems.hasBraille,
        transcript: hospitalCatalogueItems.transcriptAvailable,
      }[query.format]
    : undefined;
  if (formatColumn) conditions.push(eq(formatColumn, true));

  const where = conditions.length ? and(...conditions) : undefined;
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const offset = Math.max(query.offset ?? 0, 0);
  const order =
    query.sort === "author"
      ? asc(hospitalCatalogueItems.author)
      : query.sort === "recent"
        ? desc(hospitalCatalogueItems.publicationYear)
        : asc(hospitalCatalogueItems.title);

  return db.select().from(hospitalCatalogueItems).where(where).orderBy(order).limit(limit).offset(offset);
}

export async function getHospitalCatalogueItem(id: string): Promise<HospitalCatalogueItem | undefined> {
  await ensureHospitalCatalogueSeeded();
  const [item] = await db.select().from(hospitalCatalogueItems).where(eq(hospitalCatalogueItems.id, id)).limit(1);
  return item;
}

export async function getHospitalCatalogueFacets() {
  await ensureHospitalCatalogueSeeded();
  const items = await db.select({
    audience: hospitalCatalogueItems.audience,
    collection: hospitalCatalogueItems.primaryCollection,
    language: hospitalCatalogueItems.language,
    rightsStatus: hospitalCatalogueItems.rightsStatus,
    availabilityStatus: hospitalCatalogueItems.availabilityStatus,
  }).from(hospitalCatalogueItems);

  const unique = (values: string[]) => [...new Set(values)].sort();
  return {
    audiences: unique(items.map((item) => item.audience)),
    collections: unique(items.map((item) => item.collection)),
    languages: unique(items.map((item) => item.language)),
    rightsStatuses: unique(items.map((item) => item.rightsStatus)),
    availabilityStatuses: unique(items.map((item) => item.availabilityStatus)),
    formats: ["ebook", "html", "text", "audio", "pdf", "daisy", "large-print", "braille", "transcript"],
  };
}
