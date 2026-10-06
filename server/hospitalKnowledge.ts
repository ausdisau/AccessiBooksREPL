import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  hospitalKnowledgeItems,
  hospitalKnowledgeSources,
  type HospitalKnowledgeItem,
} from "@shared/schema";
import { getCrossrefWork, type CrossrefWork } from "./crossref";

function cleanDoi(value: string) {
  return value.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").toLowerCase();
}

function stripMarkup(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function authorNames(work: CrossrefWork) {
  return (work.author ?? [])
    .map((author) => {
      if (author.name) return author.name.trim();
      return [author.given, author.family].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean);
}

function dateFromParts(work: CrossrefWork): Date | null {
  const parts =
    work.published?.["date-parts"]?.[0] ??
    work.issued?.["date-parts"]?.[0];
  if (!parts?.length) return null;
  const [year, month = 1, day = 1] = parts;
  if (!year) return null;
  return new Date(Date.UTC(year, Math.max(month - 1, 0), day));
}

function kindFromCrossref(type?: string) {
  switch (type) {
    case "journal-article":
      return "scholarly_article";
    case "book-chapter":
    case "book-section":
      return "book_chapter";
    case "proceedings-article":
      return "conference_article";
    case "posted-content":
      return "preprint";
    default:
      return "scholarly_record";
  }
}

function isOpenAccess(work: CrossrefWork) {
  const licenses = work.license ?? [];
  return licenses.some((entry) =>
    /creativecommons|creativecommons\.org|open access/i.test(
      entry.URL ?? "",
    ),
  );
}

export async function importCrossrefDoi(
  doiInput: string,
): Promise<HospitalKnowledgeItem> {
  const doi = cleanDoi(doiInput);
  const work = await getCrossrefWork(doi);
  const title = work.title?.[0]?.trim() || doi;
  const subtitle = work.subtitle?.[0]?.trim() || null;
  const authors = authorNames(work);
  const containerTitle = work["container-title"]?.[0]?.trim() || null;
  const sourceUrl = work.URL || "https://doi.org/" + doi;
  const abstract = stripMarkup(work.abstract);
  const publicationDate = dateFromParts(work);
  const openAccess = isOpenAccess(work);

  const searchText = [
    title,
    subtitle ?? "",
    ...authors,
    containerTitle ?? "",
    work.publisher ?? "",
    doi,
    ...(work.ISSN ?? []),
    ...(work.ISBN ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const [existing] = await db
    .select()
    .from(hospitalKnowledgeItems)
    .where(eq(hospitalKnowledgeItems.doi, doi))
    .limit(1);

  let item: HospitalKnowledgeItem;
  if (existing) {
    const [updated] = await db
      .update(hospitalKnowledgeItems)
      .set({
        kind: kindFromCrossref(work.type),
        title,
        subtitle,
        abstract,
        authors,
        publisher: work.publisher ?? null,
        containerTitle,
        publicationDate,
        doi,
        issn: work.ISSN?.[0] ?? null,
        isbn: work.ISBN?.[0] ?? null,
        sourceUrl,
        canonicalUrl: "https://doi.org/" + doi,
        sourceProvider: "Crossref",
        sourceRecordId: doi,
        sourceMetadata: work as Record<string, unknown>,
        openAccess,
        fullTextStatus: "metadata_only",
        entitlementStatus: "not_verified",
        licenceStatus: openAccess ? "open_access_claimed_by_source" : "not_verified",
        citationCount: work["is-referenced-by-count"] ?? null,
        metricsSource: "Crossref",
        metricsVerifiedAt: new Date(),
        audience: "staff_research",
        patientFacing: false,
        clinicalUseStatus: "research_reference_only",
        clinicalReviewStatus: "not_reviewed",
        searchText,
        updatedAt: new Date(),
      })
      .where(eq(hospitalKnowledgeItems.id, existing.id))
      .returning();
    item = updated;
  } else {
    const [created] = await db
      .insert(hospitalKnowledgeItems)
      .values({
        kind: kindFromCrossref(work.type),
        title,
        subtitle,
        abstract,
        authors,
        publisher: work.publisher ?? null,
        containerTitle,
        publicationDate,
        doi,
        issn: work.ISSN?.[0] ?? null,
        isbn: work.ISBN?.[0] ?? null,
        sourceUrl,
        canonicalUrl: "https://doi.org/" + doi,
        sourceProvider: "Crossref",
        sourceRecordId: doi,
        sourceMetadata: work as Record<string, unknown>,
        openAccess,
        fullTextStatus: "metadata_only",
        entitlementStatus: "not_verified",
        licenceStatus: openAccess ? "open_access_claimed_by_source" : "not_verified",
        citationCount: work["is-referenced-by-count"] ?? null,
        metricsSource: "Crossref",
        metricsVerifiedAt: new Date(),
        audience: "staff_research",
        patientFacing: false,
        clinicalUseStatus: "research_reference_only",
        clinicalReviewStatus: "not_reviewed",
        searchText,
      })
      .returning();
    item = created;
  }

  await db
    .insert(hospitalKnowledgeSources)
    .values({
      knowledgeItemId: item.id,
      provider: "Crossref",
      providerRecordId: doi,
      url: sourceUrl,
      role: "metadata",
      accessStatus: "metadata_only",
      entitlementRequired: false,
      rawMetadata: work as Record<string, unknown>,
      lastVerifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [hospitalKnowledgeSources.provider, hospitalKnowledgeSources.url],
      set: {
        knowledgeItemId: item.id,
        providerRecordId: doi,
        rawMetadata: work as Record<string, unknown>,
        lastVerifiedAt: new Date(),
      },
    });

  return item;
}

export async function getHospitalKnowledgeItem(id: string) {
  const [item] = await db
    .select()
    .from(hospitalKnowledgeItems)
    .where(eq(hospitalKnowledgeItems.id, id))
    .limit(1);
  return item;
}
