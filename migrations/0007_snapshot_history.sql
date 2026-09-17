-- Keep one remaining_snapshot row per (state, fetched_at) so the daily
-- job can archive the current catalog as well as the prior without dupes.
-- Pace still reads the immediate prior (LIMIT 1). This tape is for history.

DELETE FROM remaining_snapshot a
  USING remaining_snapshot b
 WHERE a.state_id = b.state_id
   AND a.fetched_at = b.fetched_at
   AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS remaining_snapshot_state_fetched_uidx
  ON remaining_snapshot (state_id, fetched_at);
