import { and, eq } from "drizzle-orm";
import { db } from "./db";
import {
  hospitalCatalogueItems,
  hospitalCatalogueSources,
  hospitalCatalogueSuppliers,
  hospitalCatalogueAcquisitions,
} from "@shared/schema";
import {
  getVitalSourceProduct,
  vitalSourceAccessibilityClaims,
  vitalSourceAustralianDistribution,
  type VitalSourceProduct,
} from "./vitalsource";
import {
  createHospitalCatalogueAcquisition,
  ensureHospitalCatalogueSuppliersSeeded,
} from "./hospitalCatalogueAcquisitions";

function normaliseIsbn(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^0-9Xx]/g, "").toUpperCase();
  return /^\d{13}$/.test(cleaned) || /^\d{9}[\dX]$/.test(cleaned) ? cleaned : null;
}

function productIdentifiers(product: VitalSourceProduct) {
  const identifiers = product.identifiers ?? {};
  const candidates = [
    identifiers.isbn_13,
    identifiers.e_isbn_13,
    identifiers.print_isbn_13,
    identifiers.eisbn_canonical,
    identifiers.isbn_canonical,
    identifiers.isbn_10,
    identifiers.e_isbn_10,
    identifiers.print_isbn_10,
    identifiers.print_isbn_canonical,
  ]
    .map(normaliseIsbn)
    .filter(Boolean) as string[];

  return {
    isbn13: candidates.find((value) => value.length === 13) ?? null,
    isbn10: candidates.find((value) => value.length === 10) ?? null,
  };
}

function productFormats(product: VitalSourceProduct): string[] {
  const value = String(product.format ?? "").toLowerCase();
  const formats = new Set<string>();
  if (value.includes("epub")) {
    formats.add("ebook");
    formats.add("epub");
  } else if (value.includes("pdf") || value.includes("page")) {
    formats.add("ebook");
    formats.add("pdf");
  } else if (value) {
    formats.add(value.replace(/\s+/g, "-"));
  }
  return [...formats];
}

function productAuthor(product: VitalSourceProduct): string | null {
  const contributors = product.contributors ?? [];
  const explicitAuthor = contributors.find((contributor) =>
    String(contributor.type ?? "").toLowerCase().includes("author"),
  );
  return explicitAuthor?.name?.trim() || contributors[0]?.name?.trim() || null;
}

function publicationYear(product: VitalSourceProduct): number | null {
  const value = product.metadata?.publication_date ?? product.metadata?.copyright_date;
  if (typeof value !== "string") return null;
  const match = value.match(/(18|19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function sourceUrl(product: VitalSourceProduct): string {
  return (
    product.resource_links?.store_url ||
    `https://www.vitalsource.com/textbooks?term=${encodeURIComponent(product.vbid)}`
  );
}

export interface VitalSourceCandidateResult {
  catalogueItemId: string;
  product: VitalSourceProduct;
  acquisitionId: string | null;
  acquisitionStatus: string;
  australianDistribution: ReturnType<typeof vitalSourceAustralianDistribution>;
  accessibilityClaimStatus: string;
  accessibilityCategories: string[];
}

export async function discoverVitalSourceCandidate(
  catalogueItemId: string,
): Promise<VitalSourceCandidateResult> {
  const [item] = await db
    .select()
    .from(hospitalCatalogueItems)
    .where(eq(hospitalCatalogueItems.id, catalogueItemId))
    .limit(1);
  if (!item) throw new Error("Catalogue item not found");

  const lookupIdentifier = item.isbn13 || item.isbn10;
  if (!lookupIdentifier) {
    throw new Error("Catalogue item needs an ISBN-13 or ISBN-10 before VitalSource discovery");
  }

  const product = await getVitalSourceProduct(lookupIdentifier);
  const ids = productIdentifiers(product);
  const claims = vitalSourceAccessibilityClaims(product);
  const australian = vitalSourceAustralianDistribution(product);
  const formats = productFormats(product);
  const author = productAuthor(product);
  const storeUrl = sourceUrl(product);

  await db
    .insert(hospitalCatalogueSources)
    .values({
      catalogueItemId,
      sourceProvider: "VitalSource",
      sourceId: product.vbid,
      sourceUrl: storeUrl,
      sourceCatalogueUrl: "https://www.vitalsource.com/",
      rightsStatus: "commercial_metadata_only",
      rightsJurisdiction: "AU",
      rightsNote:
        "VitalSource catalogue presence and publisher accessibility claims do not by themselves grant AccessiBooks a licence. A verified acquisition and access route are required before patient-facing availability.",
      rightsVerifiedAt: new Date(),
      availabilityStatus: "metadata_only",
      formatUrls: {
        store: storeUrl,
        ...(product.resource_links?.cover_image
          ? { cover: product.resource_links.cover_image }
          : {}),
      },
      hasAudio: false,
      hasEbook: false,
      hasHtml: false,
      hasPlainText: false,
      hasPdf: false,
      hasDaisy: false,
      rawMetadata: product as Record<string, unknown>,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [hospitalCatalogueSources.sourceProvider, hospitalCatalogueSources.sourceUrl],
      set: {
        catalogueItemId,
        sourceId: product.vbid,
        rawMetadata: product as Record<string, unknown>,
        lastSeenAt: new Date(),
      },
    });

  await db
    .update(hospitalCatalogueItems)
    .set({
      ...(item.publisher ? {} : { publisher: product.publisher ?? null }),
      ...(item.editionStatement
        ? {}
        : { editionStatement: product.edition != null ? String(product.edition) : null }),
      ...(item.description
        ? {}
        : {
            description:
              typeof product.metadata?.description === "string"
                ? product.metadata.description
                : null,
          }),
      ...(item.publicationYear ? {} : { publicationYear: publicationYear(product) }),
      ...(item.coverImage
        ? {}
        : { coverImage: product.resource_links?.cover_image ?? null }),
      ...(item.isbn13 ? {} : { isbn13: ids.isbn13 }),
      ...(item.isbn10 ? {} : { isbn10: ids.isbn10 }),
      contributors:
        product.contributors?.map((contributor) => contributor.name).filter(Boolean) as string[] | undefined,
      commercialTitle: true,
      accessibilityClaims:
        claims.raw && typeof claims.raw === "object"
          ? (claims.raw as Record<string, unknown>)
          : { values: claims.raw },
      accessibilityClaimsSource: "VitalSource publisher-supplied",
      accessibilityClaimsStatus: claims.status,
      accessibilityClaimsUpdatedAt: new Date(),
      accessibilityTestStatus: "not_tested",
      searchText: [
        item.searchText,
        product.title,
        author ?? "",
        product.publisher ?? "",
        product.vbid,
        ids.isbn13 ?? "",
        ids.isbn10 ?? "",
        ...claims.categories,
      ]
        .join(" ")
        .toLowerCase(),
      updatedAt: new Date(),
    })
    .where(eq(hospitalCatalogueItems.id, catalogueItemId));

  await ensureHospitalCatalogueSuppliersSeeded();
  const [supplier] = await db
    .select({ id: hospitalCatalogueSuppliers.id })
    .from(hospitalCatalogueSuppliers)
    .where(eq(hospitalCatalogueSuppliers.code, "vitalsource"))
    .limit(1);
  if (!supplier) throw new Error("VitalSource supplier record is unavailable");

  const [existing] = await db
    .select({ id: hospitalCatalogueAcquisitions.id })
    .from(hospitalCatalogueAcquisitions)
    .where(
      and(
        eq(hospitalCatalogueAcquisitions.catalogueItemId, catalogueItemId),
        eq(hospitalCatalogueAcquisitions.supplierId, supplier.id),
        eq(hospitalCatalogueAcquisitions.supplierTitleId, product.vbid),
      ),
    )
    .limit(1);

  const candidateStatus =
    australian.status === "excluded"
      ? "unavailable_au"
      : australian.distributableVariantCount < 1
        ? "not_distributable"
        : "candidate";

  let acquisitionId = existing?.id ?? null;
  if (!existing) {
    const acquisition = await createHospitalCatalogueAcquisition({
      catalogueItemId,
      supplierCode: "vitalsource",
      supplierTitleId: product.vbid,
      supplierUrl: storeUrl,
      acquisitionStatus: candidateStatus,
      licenceModel: "pending_agreement",
      accessMode: "bookshelf_sso",
      territory: "AU",
      formats,
      accessibilityFeatures: claims.categories.map(
        (category) => `publisher_claim:${category}`,
      ),
      rightsBasis: "pending_vitalsource_entitlement",
      rightsNote:
        australian.status === "excluded"
          ? "VitalSource metadata indicates Australia is excluded from sales rights for this product."
          : "VitalSource product is a catalogue candidate only. Confirm the AccessiBooks/VitalSource commercial agreement and entitlement before marking active.",
    });
    acquisitionId = acquisition.id;
  }

  return {
    catalogueItemId,
    product,
    acquisitionId,
    acquisitionStatus: candidateStatus,
    australianDistribution: australian,
    accessibilityClaimStatus: claims.status,
    accessibilityCategories: claims.categories,
  };
}
