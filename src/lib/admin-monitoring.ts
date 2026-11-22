import "server-only";

import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { requireAdmin } from "./admin-session";
import { databasePath } from "./seller-store";
import type { Enquiry, EnquiryEvent } from "./buyer-demo";

export type AdministratorProfile = { id: string; displayName: string; district: string; profileType: string };

// Check authorization before opening storage. Never initialize or seed a store,
// and select no contact fields.
async function readAdministratorSnapshot<T>(empty: T, read: (db: DatabaseSync, tables: Set<string>) => T): Promise<T> {
  await requireAdmin();
  if (!existsSync(databasePath)) return empty;
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout = 5000; BEGIN");
    const tables = new Set(db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all().map(row => String(row.name)));
    const value = read(db, tables);
    db.exec("COMMIT");
    return value;
  } finally { db.close(); }
}

export function getAdministratorProfiles() {
  return readAdministratorSnapshot<{ sellers: AdministratorProfile[]; buyers: AdministratorProfile[] }>({ sellers: [], buyers: [] }, (db, tables) => ({
    sellers: tables.has("sellers") ? db.prepare("SELECT id, displayName, district, sellerType AS profileType FROM sellers ORDER BY displayName COLLATE NOCASE, id").all() as AdministratorProfile[] : [],
    buyers: tables.has("buyers") ? db.prepare("SELECT id, displayName, district, buyerType AS profileType FROM buyers ORDER BY displayName COLLATE NOCASE, id").all() as AdministratorProfile[] : [],
  }));
}

export function getAdministratorEnquiries(buyerId = ""): Promise<Enquiry[]> {
  return readAdministratorSnapshot<Enquiry[]>([], (db, tables) => {
    if (!tables.has("buyer_enquiries")) return [];
    const buyer = buyerId.slice(0, 80);
    const rows = db.prepare(`
      SELECT e.id, e.listingId, l.parcelId, b.displayName AS buyerName, e.status, e.message, e.createdAt, e.updatedAt
      FROM buyer_enquiries e JOIN listings l ON l.id = e.listingId JOIN buyers b ON b.id = e.buyerId
      WHERE (? = '' OR e.buyerId = ?) ORDER BY e.updatedAt DESC, e.id
    `).all(buyer, buyer) as Omit<Enquiry, "events">[];
    const events = tables.has("enquiry_audit") ? db.prepare(`
      SELECT a.enquiryId, a.id, a.previousStatus, a.newStatus, a.actorKind, a.message, a.recordedAt
      FROM enquiry_audit a JOIN buyer_enquiries e ON e.id = a.enquiryId
      WHERE (? = '' OR e.buyerId = ?) ORDER BY a.id
    `).all(buyer, buyer) as (EnquiryEvent & { enquiryId: string })[] : [];
    const history = new Map<string, EnquiryEvent[]>();
    for (const { enquiryId, ...event } of events) {
      const bucket = history.get(enquiryId) ?? [];
      bucket.push(event);
      history.set(enquiryId, bucket);
    }
    return rows.map(row => ({ ...row, events: history.get(row.id) ?? [] }));
  });
}
