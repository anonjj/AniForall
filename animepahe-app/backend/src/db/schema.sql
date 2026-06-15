CREATE TABLE IF NOT EXISTS watchlist (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session      TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  poster       TEXT,
  status       TEXT DEFAULT 'plan_to_watch',
  -- status options: watching | completed | on_hold | dropped | plan_to_watch
  added_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS progress (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  series_session TEXT NOT NULL,
  episode_num    REAL NOT NULL,
  ep_session     TEXT NOT NULL,
  anime_session  TEXT NOT NULL,
  title          TEXT,               -- Added for Continue Watching shelf
  poster         TEXT,               -- Added for Continue Watching shelf
  watched_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  position_sec   INTEGER DEFAULT 0,
  completed      INTEGER DEFAULT 0,   -- 0 = in progress, 1 = watched
  UNIQUE(series_session, episode_num)
);
