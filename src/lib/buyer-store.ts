import "server-only";

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { readApprovedListings, transaction, withDatabase } from "./seller-store";
import type { BuyerProfile, Enquiry, EnquiryActor, EnquiryEvent, EnquiryStatus } from "./buyer-demo";

export class BuyerDemoError extends Error {}
let initialized = false;

export function withBuyerDatabase<T>(work: (db: DatabaseSync) => T) {
  return withDatabase(db => {
    if (!initialized) {
      transaction(db, () => db.exec(`
        CREATE TABLE IF NOT EXISTS buyers (
          id TEXT PRIMARY KEY, displayName TEXT NOT NULL, mobile TEXT NOT NULL, email TEXT NOT NULL,
          district TEXT NOT NULL, buyerType TEXT NOT NULL CHECK (buyerType IN ('Individual','Business')),
          consentedAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS buyer_enquiries (
          id TEXT PRIMARY KEY, buyerId TEXT NOT NULL REFERENCES buyers(id), listingId TEXT NOT NULL REFERENCES listings(id),
          status TEXT NOT NULL CHECK (status IN ('Submitted','Viewed','Responded','Closed')),
          message TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS one_active_enquiry_per_buyer_listing
          ON buyer_enquiries(buyerId, listingId) WHERE status <> 'Closed';
        CREATE INDEX IF NOT EXISTS buyer_enquiries_by_listing ON buyer_enquiries(listingId);
        CREATE TABLE IF NOT EXISTS enquiry_audit (
          id INTEGER PRIMARY KEY, enquiryId TEXT NOT NULL REFERENCES buyer_enquiries(id),
          previousStatus TEXT, newStatus TEXT NOT NULL, actorKind TEXT NOT NULL CHECK (actorKind IN ('Buyer','Seller')),
          actorId TEXT NOT NULL, message TEXT, recordedAt TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS enquiry_audit_by_enquiry ON enquiry_audit(enquiryId, id);
      `));
      initialized = true;
    }
    return work(db);
  });
}

export function registerBuyer(profile: Omit<BuyerProfile, "id">) {
  return withBuyerDatabase(db => {
    const id = randomUUID();
    db.prepare("INSERT INTO buyers VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, profile.displayName, profile.mobile, profile.email, profile.district, profile.buyerType, new Date().toISOString());
    return id;
  });
}

export function getBuyer(id: string) {
  return withBuyerDatabase(db => db.prepare("SELECT * FROM buyers WHERE id = ?").get(id) as BuyerProfile | undefined);
}

export function getEnquiryCount() {
  return withDatabase(db => {
    if (!db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'buyer_enquiries'").get()) return 0;
    return Number(db.prepare("SELECT count(*) AS total FROM buyer_enquiries").get()?.total);
  });
}

function recordEvent(db: DatabaseSync, enquiryId: string, previous: EnquiryStatus | null, next: EnquiryStatus, actor: EnquiryActor, timestamp: string, message: string | null = null) {
  db.prepare(`
    INSERT INTO enquiry_audit (enquiryId, previousStatus, newStatus, actorKind, actorId, message, recordedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(enquiryId, previous, next, actor.kind, actor.id, message, timestamp);
}

export function submitEnquiry(buyerId: string, listingId: string, input: string) {
  const message = input.trim();
  if (!message || message.length > 1000) throw new BuyerDemoError("Enter a demonstration message of 1–1,000 characters.");
  return withBuyerDatabase(db => transaction(db, () => {
    if (!readApprovedListings(db, listingId).length) throw new BuyerDemoError("This listing is not currently published for enquiries.");
    if (db.prepare("SELECT id FROM buyer_enquiries WHERE buyerId = ? AND listingId = ? AND status <> 'Closed'").get(buyerId, listingId)) {
      throw new BuyerDemoError("You already have an active enquiry for this listing.");
    }
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    db.prepare("INSERT INTO buyer_enquiries VALUES (?, ?, ?, 'Submitted', ?, ?, ?)").run(id, buyerId, listingId, message, timestamp, timestamp);
    recordEvent(db, id, null, "Submitted", { kind: "Buyer", id: buyerId }, timestamp, message);
    return id;
  }));
}

function ownerCondition(actor: EnquiryActor) {
  if (actor.kind !== "Buyer" && actor.kind !== "Seller") throw new BuyerDemoError("A buyer or seller demo profile is required.");
  return actor.kind === "Buyer" ? "e.buyerId = ?" : "l.sellerId = ?";
}

export function getEnquiries(actor: EnquiryActor): Enquiry[] {
  return withBuyerDatabase(db => {
    // One read snapshot for the request list and associated event history.
    db.exec("BEGIN");
    try {
      const rows = db.prepare(`
        SELECT e.id, e.listingId, l.parcelId, b.displayName AS buyerName, e.status, e.message, e.createdAt, e.updatedAt
        FROM buyer_enquiries e JOIN listings l ON l.id = e.listingId JOIN buyers b ON b.id = e.buyerId
        WHERE ${ownerCondition(actor)} ORDER BY e.updatedAt DESC, e.id
      `).all(actor.id) as Omit<Enquiry,"events">[];
      const events = db.prepare(`
        SELECT a.enquiryId, a.id, a.previousStatus, a.newStatus, a.actorKind, a.message, a.recordedAt
        FROM enquiry_audit a JOIN buyer_enquiries e ON e.id = a.enquiryId JOIN listings l ON l.id = e.listingId
        WHERE ${ownerCondition(actor)} ORDER BY a.id
      `).all(actor.id) as (EnquiryEvent & { enquiryId: string })[];
      const history = new Map<string, EnquiryEvent[]>();
      for (const { enquiryId, ...event } of events) {
        const bucket = history.get(enquiryId) ?? [];
        bucket.push(event);
        history.set(enquiryId, bucket);
      }
      db.exec("COMMIT");
      return rows.map(row => ({ ...row, events: history.get(row.id) ?? [] }));
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
}

export function changeEnquiry(actor: EnquiryActor, id: string, next: EnquiryStatus, input = "") {
  return withBuyerDatabase(db => transaction(db, () => {
    const row = db.prepare(`
      SELECT e.status FROM buyer_enquiries e JOIN listings l ON l.id = e.listingId
      WHERE e.id = ? AND ${ownerCondition(actor)}
    `).get(id, actor.id) as { status: EnquiryStatus } | undefined;
    if (!row) throw new BuyerDemoError("This enquiry is unavailable to the active demo profile.");
    const allowed = next === "Closed" && row.status !== "Closed"
      || actor.kind === "Seller" && (next === "Viewed" && row.status === "Submitted" || next === "Responded" && row.status === "Viewed");
    if (!allowed) throw new BuyerDemoError("This action is unavailable for the current enquiry status.");
    const response = input.trim();
    if (next === "Responded" && (!response || response.length > 1000)) {
      throw new BuyerDemoError("Enter a demonstration response of 1–1,000 characters.");
    }
    const timestamp = new Date().toISOString();
    db.prepare("UPDATE buyer_enquiries SET status = ?, updatedAt = ? WHERE id = ?").run(next, timestamp, id);
    recordEvent(db, id, row.status, next, actor, timestamp, next === "Responded" ? response : null);
  }));
}
