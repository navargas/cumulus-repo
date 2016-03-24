CREATE TABLE IF NOT EXISTS users (
  name TEXT UNIQUE PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS keys (
  key TEXT UNIQUE,
  owner TEXT REFERENCES users,
  expire INTEGER
);

CREATE TABLE IF NOT EXISTS groups (
  name TEXT UNIQUE PRIMARY KEY,
  owner TEXT REFERENCES users
);

CREATE TABLE IF NOT EXISTS assets (
  name TEXT PRIMARY KEY,
  owner TEXT REFERENCES users,
  description TEXT,
  -- zero = not allowed, non-zero = allowed
  allWrite BOOLEAN default 0,
  allRead BOOLEAN default 1
);

CREATE TABLE IF NOT EXISTS files (
  asset TEXT REFERENCES assets NOT NULL,
  version TEXT NOT NULL,
  -- display name becomes name of downloaded file
  displayName TEXT,
  PRIMARY KEY (asset, version)
 );

-- One assets can have n number of groups
-- One group can have n number of assets
CREATE TABLE IF NOT EXISTS groupAssets (
  groupName TEXT REFERENCES groups,
  assetName TEXT REFERENCES assets,
  -- zero = not allowed, non-zero = allowed
  groupWrite BOOLEAN default 0,
  groupRead BOOLEAN default 1,
  PRIMARY KEY (groupName, assetName)
);

-- One user can have n number of groups
-- One group can have n number of users
CREATE TABLE IF NOT EXISTS groupUsers (
  groupName TEXT REFERENCES groups,
  userName TEXT REFERENCES users,
  -- zero = false, non-zero = true
  isAdmin BOOLEAN default 0
);
