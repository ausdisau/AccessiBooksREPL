/** Command-line catalogue metadata synchronizer. NO audio downloads or public publishing. */
import { catalogueRegistry } from '../services/catalogue-v2/registry';
import { readCheckpoint, storeBatchWithCheckpoint } from '../services/catalogue-v2/persistence';
import type { ProviderId } from '../services/catalogue-v2/types';

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.includes(name);
  const option = (name: string) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  if (flag('--help')) {
    console.log('Usage: npm run catalogue:sync -- --source librivox|gutenberg [--max-pages N | --all] [--restart]');
    return;
  }
  const providerName = option('--source') || 'librivox';
  if (providerName !== 'librivox' && providerName !== 'gutenberg') {
    throw new Error('Bulk metadata enumeration supports only librivox or gutenberg');
  }
  const provider = providerName as ProviderId;
  const maxPagesArg = option('--max-pages');
  const maxPages = flag('--all') ? Number.POSITIVE_INFINITY : (maxPagesArg === undefined ? 1 : Number(maxPagesArg));
  if (maxPages !== Infinity && (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 10000)) {
    throw new Error('--max-pages must be 1 to 10000');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required for catalogue sync');
  const adapter = catalogueRegistry.providers.get(provider);
  if (!adapter?.supportsBulkSync || !adapter.listPage) throw new Error('Provider does not support bulk metadata enumeration');
  const checkpoint = await readCheckpoint(provider);
  if (checkpoint?.completed && !flag('--restart')) {
    console.log('Catalogue already completed. Use --restart to refresh all records safely.');
    return;
  }
  let cursor = flag('--restart') ? undefined : checkpoint?.nextCursor || undefined;
  const batchSize = provider === 'librivox' ? 250 : 32;
  let pages = 0;
  let importedThisRun = 0;
  while (pages < maxPages) {
    const page = await adapter.listPage(cursor, batchSize);
    const completed = page.nextCursor === null;
    // Durable checkpoint and upserts share a DB transaction; interruption resumes safely.
    await storeBatchWithCheckpoint(provider, page.items, page.nextCursor, completed);
    importedThisRun += page.items.length;
    pages++;
    console.log(`[${provider}] page=${pages} records=${page.items.length} total_this_run=${importedThisRun} next=${page.nextCursor ?? 'complete'}`);
    if (completed) break;
    if (page.nextCursor === cursor) throw new Error('Provider returned a non-advancing cursor');
    cursor = page.nextCursor || undefined;
  }
  console.log(`Finished this run: ${importedThisRun} metadata records, ${pages} page(s). No audio was downloaded.`);
}
main().catch(error => {
  console.error('Catalogue sync stopped:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
