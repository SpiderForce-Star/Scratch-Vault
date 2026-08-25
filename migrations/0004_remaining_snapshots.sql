-- Dated official remaining-prize snapshots from the daily fetch job.
-- Only parsed catalogs are stored — never raw lottery HTML.

CREATE TABLE IF NOT EXISTS remaining_snapshot (
  id bigserial PRIMARY KEY,
  state_id text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_url text,
  week_label text NOT NULL,
  game_count integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  error text,
  games jsonb
);

CREATE INDEX IF NOT EXISTS remaining_snapshot_state_fetched_idx
  ON remaining_snapshot (state_id, fetched_at DESC);

CREATE INDEX IF NOT EXISTS remaining_snapshot_state_ok_idx
  ON remaining_snapshot (state_id, fetched_at DESC)
  WHERE status = 'ok';
