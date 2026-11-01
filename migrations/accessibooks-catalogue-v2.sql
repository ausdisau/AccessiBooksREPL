-- Review in staging and back up the database before applying.
-- Independent catalogue metadata index. Does not modify existing books or entitlements.
CREATE TABLE IF NOT EXISTS catalogue_entries (
  key text PRIMARY KEY,
  provider text NOT NULL,
  provider_id text NOT NULL,
  title text NOT NULL,
  author text NOT NULL DEFAULT '',
  language text,
  format text NOT NULL,
  record json NOT NULL,
  rights_au_status text NOT NULL DEFAULT 'review-required',
  rights_review_notes text,
  last_seen_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT catalogue_rights_status_check CHECK (rights_au_status IN ('review-required', 'cleared', 'restricted'))
);
CREATE UNIQUE INDEX IF NOT EXISTS catalogue_entries_provider_id_unique ON catalogue_entries(provider, provider_id);
CREATE INDEX IF NOT EXISTS catalogue_entries_title_idx ON catalogue_entries(title);
CREATE INDEX IF NOT EXISTS catalogue_entries_provider_idx ON catalogue_entries(provider);

CREATE TABLE IF NOT EXISTS catalogue_sync_state (
  provider text PRIMARY KEY,
  next_cursor text,
  processed integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamp NOT NULL DEFAULT now()
);
