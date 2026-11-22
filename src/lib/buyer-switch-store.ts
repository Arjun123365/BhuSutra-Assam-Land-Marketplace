import "server-only";

import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { databasePath } from "./seller-store";
import type { DemoBuyerSwitchProfile } from "./buyer-switch-policy";

// Discover existing fictional profiles without initializing, migrating or seeding storage.
export function listDemoBuyerProfiles(): DemoBuyerSwitchProfile[] {
  if (!existsSync(databasePath)) return [];
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout = 5000; BEGIN");
    const tables = new Set(db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all().map(row => row.name));
    if (!tables.has("buyers")) { db.exec("COMMIT"); return []; }
    const enquiryCounts = tables.has("buyer_enquiries")
      ? new Map(db.prepare("SELECT buyerId, count(*) AS total FROM buyer_enquiries GROUP BY buyerId").all().map(row => [String(row.buyerId), Number(row.total)])) : new Map<string, number>();
    const assistanceCounts = tables.has("assistance_requests")
      ? new Map(db.prepare("SELECT buyerId, count(*) AS total FROM assistance_requests GROUP BY buyerId").all().map(row => [String(row.buyerId), Number(row.total)])) : new Map<string, number>();
    const profiles = db.prepare(`
      SELECT id, displayName FROM buyers
      WHERE mobile GLOB '00000[0-9][0-9][0-9][0-9][0-9]' AND (email = '' OR lower(email) LIKE '%.test')
      ORDER BY displayName COLLATE NOCASE, id
    `).all().map(row => ({
      id: String(row.id), displayName: String(row.displayName),
      enquiryCount: enquiryCounts.get(String(row.id)) ?? 0,
      assistanceCount: assistanceCounts.get(String(row.id)) ?? 0,
    }));
    db.exec("COMMIT");
    return profiles;
  } finally { db.close(); }
}
