import "server-only";

import type { DatabaseSync } from "node:sqlite";

export const activeStatusesSql = "'Draft','Submitted','Under Review','Clarification Required','Approved'";

export function migrateListingReview(db: DatabaseSync) {
  if (db.prepare("PRAGMA user_version").get()?.user_version === 1) return;
  db.exec("PRAGMA foreign_keys = OFF");
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      const version = db.prepare("PRAGMA user_version").get()?.user_version;
      if (version === 0) {
        db.exec(`
          CREATE TABLE listings_review_migration (
            id TEXT PRIMARY KEY, sellerId TEXT NOT NULL REFERENCES sellers(id), parcelId TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN (${activeStatusesSql},'Rejected','Withdrawn')),
            createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, submittedAt TEXT, seeded INTEGER NOT NULL,
            details TEXT NOT NULL, title TEXT NOT NULL
          );
          INSERT INTO listings_review_migration SELECT * FROM listings;
          DROP TABLE listings;
          ALTER TABLE listings_review_migration RENAME TO listings;
          CREATE UNIQUE INDEX one_active_listing_per_parcel ON listings(parcelId)
            WHERE status IN (${activeStatusesSql});
          ALTER TABLE listing_audit ADD COLUMN previousStatus TEXT;
          ALTER TABLE listing_audit ADD COLUMN newStatus TEXT;
          ALTER TABLE listing_audit ADD COLUMN actorKind TEXT;
          ALTER TABLE listing_audit ADD COLUMN actorId TEXT;
          ALTER TABLE listing_audit ADD COLUMN remarks TEXT;
          ALTER TABLE listing_audit ADD COLUMN restrictionRemarks TEXT;
          ALTER TABLE listing_audit ADD COLUMN sellerResponse TEXT;
          CREATE INDEX listing_audit_by_listing ON listing_audit(listingId, id);
          PRAGMA user_version = 1;
        `);
        if (db.prepare("PRAGMA foreign_key_check").get()) throw new Error("Listing migration failed its foreign-key check.");
      } else if (version !== 1) {
        throw new Error("Unsupported listing schema version.");
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}
