import "server-only";

import type { DatabaseSync } from "node:sqlite";
import type { AssistanceEvent, AssistanceRequest } from "./assistance";
import { requestRows } from "./assistance-store";
import { withBuyerDatabase } from "./buyer-store";
import { demoAdministratorId } from "./admin-policy";
import {
  notificationMessage, openFollowups, withDemoLocation,
  type CoordinationEvent, type MonitoringSnapshot, type WorkspaceActor,
} from "./coordination";
import { transaction } from "./seller-store";
import { cache } from "react";

export class CoordinationError extends Error {}

function hasTable(db: DatabaseSync, name: string) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?").get(name));
}

function migrateCoordination(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS coordination_events (
      id INTEGER PRIMARY KEY, reference TEXT NOT NULL REFERENCES assistance_requests(reference),
      kind TEXT NOT NULL CHECK (kind IN ('note','flag','complete')), note TEXT NOT NULL,
      targetId INTEGER REFERENCES coordination_events(id), actorId TEXT NOT NULL, recordedAt TEXT NOT NULL,
      CHECK ((kind = 'complete' AND targetId IS NOT NULL) OR (kind <> 'complete' AND targetId IS NULL))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_completion_per_followup ON coordination_events(targetId) WHERE kind = 'complete';
    CREATE INDEX IF NOT EXISTS coordination_events_by_request ON coordination_events(reference, id);
    CREATE TABLE IF NOT EXISTS coordination_notification_reads (
      role TEXT NOT NULL CHECK (role IN ('Buyer','Seller','Admin')), profileId TEXT NOT NULL,
      eventKey TEXT NOT NULL, readAt TEXT NOT NULL, PRIMARY KEY (role, profileId, eventKey)
    );
  `);
}

function actorCondition(actor: WorkspaceActor) {
  if (actor.kind === "Admin") return { sql: "?", args: [actor.id === demoAdministratorId ? 1 : 0] };
  if (actor.kind === "Buyer" || actor.kind === "Seller") return { sql: actor.kind === "Buyer" ? "r.buyerId = ?" : "l.sellerId = ?", args: [actor.id] };
  return { sql: "?", args: [0] };
}

function coordinationEvents(db: DatabaseSync, references: ReadonlySet<string>) {
  if (!hasTable(db, "coordination_events")) return [];
  return (db.prepare("SELECT id, reference, kind, note, targetId, recordedAt FROM coordination_events ORDER BY id").all() as CoordinationEvent[])
    .filter(event => references.has(event.reference));
}

const monitoringSnapshot = cache((kind: WorkspaceActor["kind"], id: string): MonitoringSnapshot => {
  const actor = { kind, id };
  return withBuyerDatabase(db => {
    if (!hasTable(db, "assistance_requests")) return { requests: [], activities: [], coordination: [] };
    db.exec("BEGIN");
    try {
      const condition = actorCondition(actor);
      const requests = (db.prepare(requestRows + " WHERE " + condition.sql).all(...condition.args) as AssistanceRequest[]).map(withDemoLocation);
      const references = new Set(requests.map(item => item.reference));
      const activities = db.prepare(`
        SELECT a.id, a.actorKind, a.activity, a.fromStage, a.toStage, a.checkId, a.completed, a.recordedAt, a.reference
        FROM assistance_events a JOIN assistance_requests r ON r.reference = a.reference
        JOIN listings l ON l.id = r.listingId WHERE ${condition.sql} ORDER BY a.id
      `).all(...condition.args) as (AssistanceEvent & { reference: string })[];
      const snapshot = { requests, activities, coordination: coordinationEvents(db, references) };
      db.exec("COMMIT");
      return snapshot;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
});

export function getMonitoringSnapshot(actor: WorkspaceActor) {
  return monitoringSnapshot(actor.kind, actor.id);
}

export function recordCoordination(adminId: string, reference: string, change: { kind: string; note?: string; targetId?: number }) {
  if (adminId !== demoAdministratorId) throw new CoordinationError("An active local demo administrator is required.");
  const note = change.note?.trim() ?? "";
  if (!["note", "flag", "complete"].includes(change.kind) || note.length > 500 || (change.kind !== "complete" && !note)) {
    throw new CoordinationError("Enter a coordination note of 1–500 characters.");
  }
  return withBuyerDatabase(db => transaction(db, () => {
    if (!hasTable(db, "assistance_requests") || !db.prepare("SELECT 1 FROM assistance_requests WHERE reference = ?").get(reference)) throw new CoordinationError("Request unavailable.");
    migrateCoordination(db);
    const events = coordinationEvents(db, new Set([reference]));
    if (change.kind === "complete") {
      const target = events.find(event => event.id === change.targetId && event.kind === "flag");
      if (!target) throw new CoordinationError("Follow-up unavailable for this request.");
      if (!openFollowups(events).some(event => event.id === target.id)) return;
    }
    db.prepare("INSERT INTO coordination_events (reference, kind, note, targetId, actorId, recordedAt) VALUES (?, ?, ?, ?, ?, ?)")
      .run(reference, change.kind, note, change.kind === "complete" ? change.targetId! : null, adminId, new Date().toISOString());
  }));
}

export type CoordinationNotification = { key: string; reference: string; message: string; recordedAt: string; read: boolean };

const notifications = cache((kind: WorkspaceActor["kind"], id: string): CoordinationNotification[] => {
  const actor = { kind, id };
  const snapshot = getMonitoringSnapshot(actor);
  const candidates = [
    ...snapshot.activities.map((event: AssistanceEvent & { reference: string }) => ({
      key: "activity-" + event.id, reference: event.reference, message: notificationMessage(event), recordedAt: event.recordedAt,
    })),
    ...snapshot.coordination.map(event => ({
      key: "coordination-" + event.id, reference: event.reference,
      message: "Administrator coordination update · " + (event.kind === "flag" ? "Incomplete documentation flagged" : event.kind === "complete" ? "Follow-up completed" : "Note recorded"),
      recordedAt: event.recordedAt,
    })),
  ];
  return withBuyerDatabase(db => {
    const reads = hasTable(db, "coordination_notification_reads")
      ? new Set(db.prepare("SELECT eventKey FROM coordination_notification_reads WHERE role = ? AND profileId = ?").all(actor.kind, actor.id).map(row => String(row.eventKey))) : new Set<string>();
    return candidates.map(item => ({ ...item, read: reads.has(item.key) }))
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.key.localeCompare(a.key, undefined, { numeric: true }));
  });
});

export function getNotifications(actor: WorkspaceActor) {
  return notifications(actor.kind, actor.id);
}

export function markNotificationRead(actor: WorkspaceActor, eventKey: string) {
  // The accessible event set comes from the same ownership joins used for monitoring.
  if (!getNotifications(actor).some(item => item.key === eventKey)) throw new CoordinationError("Notification unavailable.");
  withBuyerDatabase(db => transaction(db, () => {
    migrateCoordination(db);
    db.prepare("INSERT OR IGNORE INTO coordination_notification_reads VALUES (?, ?, ?, ?)")
      .run(actor.kind, actor.id, eventKey, new Date().toISOString());
  }));
}
