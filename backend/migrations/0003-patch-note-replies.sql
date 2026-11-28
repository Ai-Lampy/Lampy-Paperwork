-- Additive only: existing notes remain viewer-authored top-level notes.
ALTER TABLE patch_notes ADD COLUMN parent_seq INTEGER REFERENCES patch_notes(seq);
ALTER TABLE patch_notes ADD COLUMN author_type TEXT NOT NULL DEFAULT 'viewer' CHECK(author_type IN ('viewer','owner'));
CREATE INDEX IF NOT EXISTS patch_notes_parent ON patch_notes(share_id,parent_seq,seq);
