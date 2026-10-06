import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  hospitalCatalogueItems,
  hospitalCatalogueSources,
  type HospitalCatalogueItem,
  type InsertHospitalCatalogueItem,
} from "@shared/schema";
import {
  lookupWorldCatByIsbn,
  type WorldCatBriefRecord,
  validateIsbn,
} from "./worldcat";

function cleanTitle(value: string): string {
  return value.replace(/\s*\/\s*$/, "").replace(/\s+/g, " ").trim();
}

function slugPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function publicationYear(date?: string | null): number | null {
  if (!date) return null;
  const match = date.match(/(18|19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function isbnPair(isbns: string[] | null | undefined, requested: string) {
  const values = [...new Set([requested, ...(isbns ?? [])].map(validateLooseIsbn).filter(Boolean))] as string[];
  return {
    isbn13: values.find((value) => /^\d{13}$/.test(value)) ?? null,
    isbn10: values.find((value) => /^\d{9}[\dX]$/.test(value)) ?? null,
  };
}

function validateLooseIsbn(value: string): string | null {
  const normalised = value.replace(/[^0-9Xx]/g, "").toUpperCase();
  return /^\d{13}$/.test(normalised) || /^\d{9}[\dX]$/.test(normalised) ? normalised : null;
}

function commercialKind(record: WorldCatBriefRecord): string {
  const general = String(record.generalFormat ?? "").toLowerCase();
  const specific = String(record.specificFormat ?? "").toLowerCase();
  if (general.includes("audio") || specific.includes("audio")) return "audiobook";
  if (specific.includes("digital")) return "ebook";
  return "book";
}

function worldCatPublicUrl(record: WorldCatBriefRecord): string {
  const title = slugPart(cleanTitle(record.title)) || "title";
  return `https://search.worldcat.org/title/${title}/oclc/${record.oclcNumber}`;
}

function toCatalogueItem(record: WorldCatBriefRecord, requestedIsbn: string): InsertHospitalCatalogueItem {
  const title = cleanTitle(record.title);
  const author = record.creator?.trim() || "Unknown author";
  const ids = isbnPair(record.isbns, requestedIsbn);
  const editionKey = ids.isbn13 || ids.isbn10 || record.oclcNumber;
  const contentKind = commercialKind(record);
  const sourceUrl = worldCatPublicUrl(record);
  const formatDescription = [record.generalFormat, record.specificFormat].filter(Boolean).join(" / ");

  const rightsNote =
    "WorldCat supplies bibliographic discovery metadata only. This record does not grant AccessiBooks a copyright licence, ebook/audiobook entitlement, reproduction right, accessible-format exception, or redistribution permission. Commercial supply must be licensed or otherwise lawfully authorised separately.";

  const item: InsertHospitalCatalogueItem = {
    slug: `${slugPart(title)}-${slugPart(author)}-${slugPart(editionKey)}`.slice(0, 180),
    title,
    author,
    publicationYear: publicationYear(record.date),
    publisher: record.publisher ?? null,
    editionStatement: record.edition ?? null,
    oclcNumber: record.oclcNumber,
    isbn10: ids.isbn10,
    isbn13: ids.isbn13,
    language: record.language || "und",
    audience: "general",
    contentKind,
    primaryCollection: "commercial-catalogue",
    genres: [],
    subjects: [],
    hospitalTags: [
      "commercial-title",
      "worldcat",
      ...(contentKind === "audiobook" ? ["audio-edition"] : []),
      ...(contentKind === "ebook" ? ["digital-edition"] : []),
    ],
    sourceProvider: "WorldCat",
    sourceId: record.oclcNumber,
    sourceUrl,
    rightsStatus: "commercial_metadata_only",
    rightsJurisdiction: "AU",
    rightsNote,
    rightsVerifiedAt: new Date(),
    availabilityStatus: "metadata_only",
    availabilityNote:
      "Catalogued commercial edition. AccessiBooks has not recorded a licence or supply entitlement for this edition.",
    hasAudio: false,
    hasEbook: false,
    hasHtml: false,
    hasPlainText: false,
    hasPdf: false,
    hasDaisy: false,
    hasLargePrint: false,
    hasBraille: false,
    transcriptAvailable: false,
    ttsFriendly: false,
    commercialTitle: true,
    acquisitionStatus: "not_acquired",
    searchText: [
      title,
      author,
      record.publisher ?? "",
      record.edition ?? "",
      record.oclcNumber,
      ids.isbn10 ?? "",
      ids.isbn13 ?? "",
      formatDescription,
      "commercial title worldcat",
    ].join(" ").toLowerCase(),
    clinicalInformation: false,
    clinicalReviewStatus: "not_applicable",
  };

  return item;
}

export interface WorldCatImportResult {
  requestedIsbn: string;
  imported: HospitalCatalogueItem[];
  matchedRecords: number;
}

export async function importWorldCatIsbn(rawIsbn: string): Promise<WorldCatImportResult> {
  const requestedIsbn = validateIsbn(rawIsbn);
  const lookup = await lookupWorldCatByIsbn(requestedIsbn, { limit: 20 });
  const imported: HospitalCatalogueItem[] = [];

  for (const record of lookup.records) {
    const item = toCatalogueItem(record, requestedIsbn);
    const [existing] = await db
      .select()
      .from(hospitalCatalogueItems)
      .where(eq(hospitalCatalogueItems.slug, item.slug))
      .limit(1);

    let saved: HospitalCatalogueItem;
    if (existing) {
      const [updated] = await db
        .update(hospitalCatalogueItems)
        .set({
          ...item,
          updatedAt: new Date(),
        })
        .where(eq(hospitalCatalogueItems.id, existing.id))
        .returning();
      saved = updated;
    } else {
      const [created] = await db
        .insert(hospitalCatalogueItems)
        .values(item)
        .returning();
      saved = created;
    }

    await db
      .insert(hospitalCatalogueSources)
      .values({
        catalogueItemId: saved.id,
        sourceProvider: "WorldCat",
        sourceId: record.oclcNumber,
        sourceUrl: worldCatPublicUrl(record),
        sourceCatalogueUrl: "https://search.worldcat.org/",
        rightsStatus: "commercial_metadata_only",
        rightsJurisdiction: "AU",
        rightsNote: item.rightsNote,
        rightsVerifiedAt: new Date(),
        availabilityStatus: "metadata_only",
        formatUrls: {
          worldcat: worldCatPublicUrl(record),
        },
        hasAudio: false,
        hasEbook: false,
        hasHtml: false,
        hasPlainText: false,
        hasPdf: false,
        hasDaisy: false,
        rawMetadata: record as Record<string, unknown>,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [hospitalCatalogueSources.sourceProvider, hospitalCatalogueSources.sourceUrl],
        set: {
          catalogueItemId: saved.id,
          sourceId: record.oclcNumber,
          rawMetadata: record as Record<string, unknown>,
          lastSeenAt: new Date(),
        },
      });

    imported.push(saved);
  }

  return {
    requestedIsbn,
    imported,
    matchedRecords: lookup.records.length,
  };
}
