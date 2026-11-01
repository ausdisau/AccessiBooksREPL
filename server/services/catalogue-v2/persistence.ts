/** Persistence is intentionally separate from the published/entitled `books` table. */
import { and, eq, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { catalogueEntries, catalogueSyncState } from '../../../shared/schema';
import type { CatalogueBook, ProviderId } from './types';

export async function storeBatchWithCheckpoint(
  provider: ProviderId, items: CatalogueBook[], nextCursor: string | null, completed: boolean,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const item of items) {
      if (item.provider !== provider) throw new Error('Provider mismatch during import');
    }
    // A single bulk upsert per API page avoids thousands of round trips.
    // Crucially, do NOT update rightsAuStatus or rightsReviewNotes on conflict.
    if (items.length) {
      await tx.insert(catalogueEntries).values(items.map(item => ({
        key: item.key, provider, providerId: item.providerId,
        title: item.title, author: item.authors.join('; '),
        language: item.language, format: item.format,
        record: item as unknown as Record<string, unknown>,
        rightsAuStatus: 'review-required',
      }))).onConflictDoUpdate({
        target: catalogueEntries.key,
        set: {
          title: sql`excluded.title`, author: sql`excluded.author`,
          language: sql`excluded.language`, format: sql`excluded.format`,
          record: sql`excluded.record`, lastSeenAt: new Date(),
        },
      });
    }
    const [existing] = await tx.select().from(catalogueSyncState).where(eq(catalogueSyncState.provider, provider));
    await tx.insert(catalogueSyncState).values({
      provider, nextCursor, processed: (existing?.processed || 0) + items.length, completed,
      updatedAt: new Date(),
    }).onConflictDoUpdate({ target: catalogueSyncState.provider, set: {
      nextCursor, processed: (existing?.processed || 0) + items.length, completed, updatedAt: new Date(),
    } });
  });
}

export async function readCheckpoint(provider: ProviderId) {
  const [checkpoint] = await db.select().from(catalogueSyncState)
    .where(eq(catalogueSyncState.provider, provider));
  return checkpoint || null;
}

export async function queryIndexedCatalogue(input: {
  query: string; provider?: ProviderId; format?: 'audiobook' | 'ebook';
  language?: string; limit: number; offset: number;
}): Promise<{ items: CatalogueBook[]; limit: number; offset: number }> {
  const term = `%${input.query.replace(/[\\%_]/g, '\\$&')}%`;
  const conditions = [or(ilike(catalogueEntries.title, term), ilike(catalogueEntries.author, term))!];
  if (input.provider) conditions.push(eq(catalogueEntries.provider, input.provider));
  if (input.format) conditions.push(eq(catalogueEntries.format, input.format));
  if (input.language) conditions.push(ilike(catalogueEntries.language, `${input.language}%`));
  const rows = await db.select().from(catalogueEntries).where(and(...conditions))
    .orderBy(desc(catalogueEntries.lastSeenAt), asc(catalogueEntries.key)).limit(input.limit).offset(input.offset);
  const items = rows.map(row => {
    const book = row.record as unknown as CatalogueBook;
    return { ...book, rights: { ...book.rights,
      auStatus: row.rightsAuStatus as CatalogueBook['rights']['auStatus'] } };
  });
  return { items, limit: input.limit, offset: input.offset };
}
