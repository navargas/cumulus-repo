PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  name TEXT UNIQUE PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS keys (
  key TEXT UNIQUE,
  owner TEXT,
  expire INTEGER,
  FOREIGN KEY (owner) REFERENCES users(name) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS groups (
  name TEXT UNIQUE PRIMARY KEY,
  owner TEXT REFERENCES users(name)
);

CREATE TABLE IF NOT EXISTS assets (
  name TEXT PRIMARY KEY,
  owner TEXT REFERENCES users(name),
  description TEXT,
  -- zero = not allowed, non-zero = allowed
  allWrite BOOLEAN default 0,
  allRead BOOLEAN default 1
);

CREATE TABLE IF NOT EXISTS files (
  asset TEXT REFERENCES assets(name) NOT NULL,
  version TEXT NOT NULL,
  -- display name becomes name of downloaded file
  displayName TEXT,
  PRIMARY KEY (asset, version),
  FOREIGN KEY (asset) REFERENCES assets(name) ON DELETE CASCADE
 );

-- One assets can have n number of groups
-- One group can have n number of assets
CREATE TABLE IF NOT EXISTS groupAssets (
  groupName TEXT REFERENCES groups(name),
  assetName TEXT REFERENCES assets(name),
  -- zero = not allowed, non-zero = allowed
  groupWrite BOOLEAN default 1,
  groupRead BOOLEAN default 1,
  PRIMARY KEY (groupName, assetName),
  FOREIGN KEY (groupName) REFERENCES groups(name) ON DELETE CASCADE,
  FOREIGN KEY (assetName) REFERENCES assets(name) ON DELETE CASCADE
);

-- One user can have n number of groups
-- One group can have n number of users
CREATE TABLE IF NOT EXISTS groupUsers (
  groupName TEXT REFERENCES groups(name),
  userName TEXT REFERENCES users(name),
  -- zero = false, non-zero = true
  isAdmin BOOLEAN default 0,
  FOREIGN KEY (groupName) REFERENCES groups(name) ON DELETE CASCADE,
  FOREIGN KEY (userName) REFERENCES users(name) ON DELETE CASCADE
);
