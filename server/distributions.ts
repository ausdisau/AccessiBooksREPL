import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "./db";
import {
  accessibooksDistributions,
  accessibooksDistributionMemberships,
  hospitalCatalogueItems,
} from "@shared/schema";

const distributionSeeds = [
  {
    code: "hospitals",
    name: "AccessiBooks @ Hospitals",
    publicPath: "/hospitals",
    audience: ["adult", "children", "young-adult", "family"],
    collections: ["bedside-reading", "long-stay", "paediatrics", "rehabilitation", "shorter-reads"],
    formats: ["ebook", "audio", "html", "text", "daisy", "large-print", "braille", "transcript"],
    policyProfile: {
      clinicalInformationSeparated: true,
      patientFacingClinicalReviewRequired: true,
      metadataDoesNotImplyLicence: true,
    },
    branding: { label: "Hospitals" },
  },
  {
    code: "educate",
    name: "AccessiBooks Educate",
    publicPath: "/educate",
    audience: ["primary", "secondary", "tafe", "university", "educators"],
    collections: ["curriculum-reading", "class-texts", "study-support", "professional-learning"],
    formats: ["ebook", "audio", "transcript", "daisy", "large-print", "easy-read"],
    policyProfile: {
      institutionEntitlementRequired: true,
      learnerPreferenceFirst: true,
      metadataDoesNotImplyClassroomRights: true,
    },
    branding: { label: "Educate" },
  },
  {
    code: "libraries",
    name: "AccessiBooks Libraries",
    publicPath: "/libraries",
    audience: ["public-library", "hospital-library", "university-library", "community-library"],
    collections: ["local-holdings", "accessible-editions", "audiobooks", "ebooks", "open-access"],
    formats: ["ebook", "audio", "epub", "daisy", "large-print", "braille"],
    policyProfile: {
      holdingsSeparatedFromMetadata: true,
      verifiedBorrowRouteRequired: true,
    },
    branding: { label: "Libraries" },
  },
  {
    code: "community",
    name: "AccessiBooks Community",
    publicPath: "/community",
    audience: ["adults", "young-adults", "community-groups", "supporter-assisted"],
    collections: ["disability-voices", "easy-read", "community-stories", "independent-living", "social-reading"],
    formats: ["audio", "transcript", "easy-read", "large-text", "plain-text", "ebook"],
    policyProfile: {
      disabilityLed: true,
      nonMedicalised: true,
      supporterAssistanceDoesNotOverrideReader: true,
    },
    branding: { label: "Community" },
  },
  {
    code: "kids",
    name: "AccessiBooks Kids",
    publicPath: "/kids",
    audience: ["early-readers", "primary", "older-children", "family-reading"],
    collections: ["read-aloud", "picture-books", "short-reads", "family-reading"],
    formats: ["read-aloud", "audio", "ebook", "large-text", "transcript"],
    policyProfile: {
      ageSuitabilityRequiresVerifiedMetadata: true,
      autoplayDisabledByDefault: true,
      supporterAssistanceDoesNotOverrideReader: true,
    },
    branding: { label: "Kids" },
  },
] as const;

export async function ensureDistributionsSeeded() {
  for (const distribution of distributionSeeds) {
    await db
      .insert(accessibooksDistributions)
      .values({
        ...distribution,
        status: "prototype",
      })
      .onConflictDoUpdate({
        target: accessibooksDistributions.code,
        set: {
          name: distribution.name,
          publicPath: distribution.publicPath,
          audience: [...distribution.audience],
          collections: [...distribution.collections],
          formats: [...distribution.formats],
          policyProfile: distribution.policyProfile,
          branding: distribution.branding,
          updatedAt: new Date(),
        },
      });
  }
}

export async function listAccessiBooksDistributions() {
  await ensureDistributionsSeeded();
  return db
    .select()
    .from(accessibooksDistributions)
    .orderBy(asc(accessibooksDistributions.name));
}

export async function getAccessiBooksDistribution(code: string) {
  await ensureDistributionsSeeded();
  const [distribution] = await db
    .select()
    .from(accessibooksDistributions)
    .where(eq(accessibooksDistributions.code, code))
    .limit(1);
  return distribution;
}

export async function addCatalogueItemToDistribution(input: {
  distributionCode: string;
  catalogueItemId: string;
  collection?: string;
  audience?: string;
  featured?: boolean;
  sortRank?: number;
  presentation?: Record<string, unknown>;
  policyOverrides?: Record<string, unknown>;
}) {
  await ensureDistributionsSeeded();

  const [distribution] = await db
    .select()
    .from(accessibooksDistributions)
    .where(eq(accessibooksDistributions.code, input.distributionCode))
    .limit(1);
  if (!distribution) throw new Error("Unknown AccessiBooks distribution");

  const [item] = await db
    .select({ id: hospitalCatalogueItems.id })
    .from(hospitalCatalogueItems)
    .where(eq(hospitalCatalogueItems.id, input.catalogueItemId))
    .limit(1);
  if (!item) throw new Error("Catalogue item not found");

  const [membership] = await db
    .insert(accessibooksDistributionMemberships)
    .values({
      distributionId: distribution.id,
      catalogueItemId: input.catalogueItemId,
      collection: input.collection ?? "general",
      audience: input.audience ?? "general",
      featured: input.featured ?? false,
      sortRank: input.sortRank ?? 0,
      presentation: input.presentation ?? {},
      policyOverrides: input.policyOverrides ?? {},
    })
    .onConflictDoUpdate({
      target: [
        accessibooksDistributionMemberships.distributionId,
        accessibooksDistributionMemberships.catalogueItemId,
      ],
      set: {
        collection: input.collection ?? "general",
        audience: input.audience ?? "general",
        featured: input.featured ?? false,
        sortRank: input.sortRank ?? 0,
        presentation: input.presentation ?? {},
        policyOverrides: input.policyOverrides ?? {},
        updatedAt: new Date(),
      },
    })
    .returning();

  return membership;
}

export async function searchDistributionCatalogue(input: {
  distributionCode: string;
  q?: string;
  collection?: string;
  audience?: string;
  limit?: number;
}) {
  await ensureDistributionsSeeded();

  const [distribution] = await db
    .select()
    .from(accessibooksDistributions)
    .where(eq(accessibooksDistributions.code, input.distributionCode))
    .limit(1);
  if (!distribution) throw new Error("Unknown AccessiBooks distribution");

  const conditions = [
    eq(accessibooksDistributionMemberships.distributionId, distribution.id),
    eq(accessibooksDistributionMemberships.discoverabilityStatus, "visible"),
  ];

  if (input.collection) {
    conditions.push(eq(accessibooksDistributionMemberships.collection, input.collection));
  }

  if (input.audience) {
    conditions.push(eq(accessibooksDistributionMemberships.audience, input.audience));
  }

  const q = input.q?.trim();
  const textCondition = q
    ? or(
        ilike(hospitalCatalogueItems.title, "%" + q + "%"),
        ilike(hospitalCatalogueItems.author, "%" + q + "%"),
        ilike(hospitalCatalogueItems.searchText, "%" + q + "%"),
      )
    : undefined;

  const where = textCondition
    ? and(...conditions, textCondition)
    : and(...conditions);

  return db
    .select({
      membership: accessibooksDistributionMemberships,
      item: hospitalCatalogueItems,
    })
    .from(accessibooksDistributionMemberships)
    .innerJoin(
      hospitalCatalogueItems,
      eq(accessibooksDistributionMemberships.catalogueItemId, hospitalCatalogueItems.id),
    )
    .where(where)
    .orderBy(
      asc(accessibooksDistributionMemberships.sortRank),
      asc(hospitalCatalogueItems.title),
    )
    .limit(Math.min(Math.max(input.limit ?? 50, 1), 100));
}
