-- Additive migration. Existing account data remains untouched.
CREATE TABLE IF NOT EXISTS patch_shares (
 id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL UNIQUE, viewer_hash TEXT NOT NULL,
 snapshot TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 revoked INTEGER NOT NULL DEFAULT 0, read_seq INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS patch_notes (
 seq INTEGER PRIMARY KEY AUTOINCREMENT, share_id TEXT NOT NULL,
 request_id TEXT NOT NULL, fixture_id TEXT NOT NULL, fixture_label TEXT NOT NULL,
 name TEXT NOT NULL, job_role TEXT NOT NULL, body TEXT NOT NULL,
 version INTEGER NOT NULL, created_at INTEGER NOT NULL,
 UNIQUE(share_id,request_id), FOREIGN KEY(share_id) REFERENCES patch_shares(id)
);
CREATE INDEX IF NOT EXISTS patch_notes_share ON patch_notes(share_id,seq);
CREATE TABLE IF NOT EXISTS patch_rate_limits (key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL);
