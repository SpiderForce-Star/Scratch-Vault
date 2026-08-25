-- One unowned remaining-prize snapshot per wired state.
-- catalog is the parsed desk JSON — never raw lottery HTML.

CREATE TABLE IF NOT EXISTS desk_snapshots (
  state_id text PRIMARY KEY,
  ok boolean NOT NULL,
  stale boolean NOT NULL DEFAULT false,
  fetched_at timestamptz NOT NULL,
  week_label text NOT NULL,
  source_url text,
  reason text,
  game_count integer NOT NULL DEFAULT 0,
  catalog jsonb
);
