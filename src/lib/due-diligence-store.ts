import "server-only";

import { withBuyerDatabase } from "./buyer-store";
import { findDemoParcel } from "./demo-marketplace";
import { buyerCheckStatuses, type BuyerCheckEvent } from "./due-diligence";
import { governmentCheckIds } from "./parcel-records";
import { transaction } from "./seller-store";

export class DueDiligenceError extends Error {}

export function getBuyerCheckHistory(buyerId: string, parcelId: string) {
  return withBuyerDatabase(db => {
    if (!db.prepare("SELECT 1 FROM sqlite_schema WHERE name = 'buyer_check_history' AND type = 'table'").get()) return [];
    return db.prepare(`
      SELECT id, checkId, previousStatus, status, recordedAt FROM buyer_check_history
      WHERE buyerId = ? AND parcelId = ? ORDER BY id DESC
    `).all(buyerId, parcelId) as BuyerCheckEvent[];
  });
}

export function saveBuyerCheck(buyerId: string, parcelId: string, check: string, nextStatus: string) {
  const checkId = governmentCheckIds.find(id => id === check);
  const status = buyerCheckStatuses.find(value => value === nextStatus);
  if (!findDemoParcel(parcelId) || !checkId || !status) throw new DueDiligenceError("Select a valid demo parcel, check and buyer status.");

  return withBuyerDatabase(db => transaction(db, () => {
    if (!db.prepare("SELECT 1 FROM buyers WHERE id = ?").get(buyerId)) throw new DueDiligenceError("An active demo buyer profile is required.");
    db.exec(`
      CREATE TABLE IF NOT EXISTS buyer_check_history (
        id INTEGER PRIMARY KEY, buyerId TEXT NOT NULL REFERENCES buyers(id), parcelId TEXT NOT NULL,
        checkId TEXT NOT NULL, previousStatus TEXT NOT NULL CHECK (previousStatus IN ('Not Started','In Progress','Completed')),
        status TEXT NOT NULL CHECK (status IN ('Not Started','In Progress','Completed')), recordedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS buyer_check_history_by_parcel ON buyer_check_history(buyerId, parcelId, id);
    `);
    const previous = db.prepare(`
      SELECT status FROM buyer_check_history WHERE buyerId = ? AND parcelId = ? AND checkId = ? ORDER BY id DESC LIMIT 1
    `).get(buyerId, parcelId, checkId)?.status ?? "Not Started";
    if (status === previous) return;
    db.prepare(`
      INSERT INTO buyer_check_history (buyerId, parcelId, checkId, previousStatus, status, recordedAt) VALUES (?, ?, ?, ?, ?, ?)
    `).run(buyerId, parcelId, checkId, previous, status, new Date().toISOString());
  }));
}
