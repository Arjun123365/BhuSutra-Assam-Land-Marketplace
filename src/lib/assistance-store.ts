import "server-only";

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  assistanceActions, assistanceChecklist, assistanceStages, editableCheckGroup, preparedChecks,
  type AssistanceActor, type AssistanceCheckId, type AssistanceEvent, type AssistanceRequest, type AssistanceStage,
} from "./assistance";
import { withBuyerDatabase } from "./buyer-store";
import { readApprovedListings, transaction } from "./seller-store";

export class AssistanceError extends Error {}

const statuses = Object.keys(assistanceStages).map(stage => "'" + stage + "'").join(", ");
const checkIds = assistanceChecklist.map(check => "'" + check.id + "'").join(", ");

function hasAssistanceTables(db: DatabaseSync) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'assistance_requests'").get());
}

function migrateAssistance(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS assistance_requests (
      reference TEXT PRIMARY KEY, listingId TEXT NOT NULL REFERENCES listings(id),
      buyerId TEXT NOT NULL REFERENCES buyers(id), enquiryId TEXT REFERENCES buyer_enquiries(id),
      askingPrice REAL NOT NULL CHECK (askingPrice > 0),
      stage TEXT NOT NULL CHECK (stage IN (${statuses})), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_assistance_per_buyer_listing
      ON assistance_requests(buyerId, listingId) WHERE stage NOT IN ('closed', 'cancelled');
    CREATE INDEX IF NOT EXISTS assistance_requests_by_listing ON assistance_requests(listingId);
    CREATE TABLE IF NOT EXISTS assistance_events (
      id INTEGER PRIMARY KEY, reference TEXT NOT NULL REFERENCES assistance_requests(reference),
      actorKind TEXT NOT NULL CHECK (actorKind IN ('Buyer','Seller')), actorId TEXT NOT NULL,
      activity TEXT NOT NULL, fromStage TEXT CHECK (fromStage IN (${statuses})),
      toStage TEXT CHECK (toStage IN (${statuses})), checkId TEXT CHECK (checkId IN (${checkIds})),
      completed INTEGER CHECK (completed IN (0, 1)), recordedAt TEXT NOT NULL,
      CHECK ((checkId IS NULL AND completed IS NULL AND toStage IS NOT NULL)
        OR (checkId IS NOT NULL AND completed IS NOT NULL AND fromStage IS NULL AND toStage IS NULL))
    );
    CREATE INDEX IF NOT EXISTS assistance_events_by_reference ON assistance_events(reference, id);
  `);
}

function getEnquiryForListing(db: DatabaseSync, buyerId: string, listingId: string) {
  return db.prepare(`
    SELECT id FROM buyer_enquiries WHERE buyerId = ? AND listingId = ? ORDER BY createdAt DESC, id DESC LIMIT 1
  `).get(buyerId, listingId)?.id as string | undefined;
}

function getActiveReference(db: DatabaseSync, buyerId: string, listingId: string) {
  return db.prepare(`
    SELECT reference FROM assistance_requests WHERE buyerId = ? AND listingId = ? AND stage NOT IN ('closed', 'cancelled')
  `).get(buyerId, listingId)?.reference as string | undefined;
}

export function getAssistanceStart(listingId: string, buyerId?: string) {
  return withBuyerDatabase(db => {
    const [listing] = readApprovedListings(db, listingId);
    if (!listing) return undefined;
    return {
      ...listing,
      hasEnquiry: Boolean(buyerId && getEnquiryForListing(db, buyerId, listingId)),
      activeReference: buyerId && hasAssistanceTables(db) ? getActiveReference(db, buyerId, listingId) : undefined,
    };
  });
}

function recordEvent(db: DatabaseSync, reference: string, actor: AssistanceActor, event: Omit<AssistanceEvent, "id" | "actorKind">) {
  db.prepare(`
    INSERT INTO assistance_events (reference, actorKind, actorId, activity, fromStage, toStage, checkId, completed, recordedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reference, actor.kind, actor.id, event.activity, event.fromStage, event.toStage, event.checkId, event.completed, event.recordedAt);
}

export function startAssistance(buyerId: string, listingId: string) {
  return withBuyerDatabase(db => transaction(db, () => {
    if (!db.prepare("SELECT 1 FROM buyers WHERE id = ?").get(buyerId)) throw new AssistanceError("An active demo buyer profile is required.");
    const [listing] = readApprovedListings(db, listingId);
    if (!listing) throw new AssistanceError("Only approved, currently published demo listings can start a request.");
    const enquiry = getEnquiryForListing(db, buyerId, listingId);
    if (!hasAssistanceTables(db)) migrateAssistance(db);
    const existing = getActiveReference(db, buyerId, listingId);
    if (existing) return existing;

    const reference = "TX-" + randomUUID();
    const recordedAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO assistance_requests (reference, listingId, buyerId, enquiryId, askingPrice, stage, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'interest', ?, ?)
    `).run(reference, listingId, buyerId, enquiry ?? null, listing.price, recordedAt, recordedAt);
    recordEvent(db, reference, { kind: "Buyer", id: buyerId }, {
      activity: "Assistance request created", fromStage: null, toStage: "interest", checkId: null, completed: null, recordedAt,
    });
    return reference;
  }));
}

export const requestRows = `
  SELECT r.reference, r.listingId, l.parcelId, b.displayName AS buyerName, b.buyerType,
    s.displayName AS sellerName, s.sellerType, r.askingPrice, r.stage, r.createdAt, r.updatedAt
  FROM assistance_requests r JOIN listings l ON l.id = r.listingId
  JOIN buyers b ON b.id = r.buyerId JOIN sellers s ON s.id = l.sellerId
`;

function requestOwner(actor: AssistanceActor) {
  if (actor.kind !== "Buyer" && actor.kind !== "Seller") throw new AssistanceError("A buyer or seller demo profile is required.");
  return actor.kind === "Buyer" ? "r.buyerId = ?" : "l.sellerId = ?";
}

function getOwnedRequest(db: DatabaseSync, actor: AssistanceActor, reference: string) {
  if (!hasAssistanceTables(db)) return undefined;
  return db.prepare(requestRows + " WHERE " + requestOwner(actor) + " AND r.reference = ?").get(actor.id, reference) as AssistanceRequest | undefined;
}

export function eventHistory(db: DatabaseSync, reference: string) {
  return db.prepare(`
    SELECT id, actorKind, activity, fromStage, toStage, checkId, completed, recordedAt
    FROM assistance_events WHERE reference = ? ORDER BY id
  `).all(reference) as AssistanceEvent[];
}

export function listAssistance(actor: AssistanceActor) {
  return withBuyerDatabase(db => {
    if (!hasAssistanceTables(db)) return [];
    return db.prepare(requestRows + " WHERE " + requestOwner(actor) + " ORDER BY r.updatedAt DESC, r.reference").all(actor.id) as AssistanceRequest[];
  });
}

export function getAssistance(actor: AssistanceActor, reference: string) {
  return withBuyerDatabase(db => {
    db.exec("BEGIN");
    try {
      const request = getOwnedRequest(db, actor, reference);
      const result = request && { request, published: readApprovedListings(db, request.listingId).length > 0, events: eventHistory(db, reference) };
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
}

export function updateAssistance(actor: AssistanceActor, reference: string, change: { action: string } | { check: string; completed: boolean }) {
  return withBuyerDatabase(db => transaction(db, () => {
    const request = getOwnedRequest(db, actor, reference);
    if (!request) throw new AssistanceError("This request is unavailable to the active demo profile.");
    const published = readApprovedListings(db, request.listingId).length > 0;
    const prepared = preparedChecks(eventHistory(db, reference));
    const recordedAt = new Date().toISOString();
    let stage: AssistanceStage = request.stage;
    if ("action" in change) {
      const action = assistanceActions(stage, actor.kind, published, prepared).find(item => item.id === change.action);
      if (!action) throw new AssistanceError("This action is unavailable at the current stage.");
      if (!action.enabled) throw new AssistanceError(action.reason ?? "Complete the pending checklist first.");
      stage = action.to;
      recordEvent(db, reference, actor, {
        activity: action.label, fromStage: request.stage, toStage: stage, checkId: null, completed: null, recordedAt,
      });
    } else {
      const check = assistanceChecklist.find(item => item.id === change.check);
      if (!check || check.group !== editableCheckGroup(stage, published)) throw new AssistanceError("This checklist item is unavailable at the current stage.");
      const checkId: AssistanceCheckId = check.id;
      if (prepared.has(checkId) === change.completed) return;
      recordEvent(db, reference, actor, {
        activity: change.completed ? "Marked preparation complete" : "Reopened preparation item",
        fromStage: null, toStage: null, checkId, completed: Number(change.completed), recordedAt,
      });
    }
    db.prepare("UPDATE assistance_requests SET stage = ?, updatedAt = ? WHERE reference = ?").run(stage, recordedAt, reference);
  }));
}
