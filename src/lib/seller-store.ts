import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { findDemoParcel } from "./demo-marketplace";
import { activeStatusesSql, migrateListingReview } from "./listing-migration";
import { allowedReviewDecisions, reviewChecks, type ReviewDecision } from "./listing-review";
import {
  canWithdraw, emptyListingDetails,
  type DemoListing, type DemoSeller, type DemoSellerProfile, type ListingAuditEvent, type ListingDetails, type ListingStatus, type ParcelReservation,
} from "./seller-demo";

export const databasePath = resolve(/* turbopackIgnore: true */ process.env.BHUSUTRA_DEMO_DB ?? ".bhusutra-demo/seller.sqlite");
export const seededSellerId = "demo-seeded-seller";
let initialized = false;

const seededListings = [
  { parcelId: "P-01", price: 1850000, title: "Farmland near Jorhat" },
  { parcelId: "P-02", price: 2800000, title: "Residential plot in Kamrup" },
  { parcelId: "P-03", price: 4200000, title: "Roadside plot in Dibrugarh" },
];

export class SellerDemoError extends Error {}

export function transaction<T>(db: DatabaseSync, write: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = write();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function initialize(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sellers (
      id TEXT PRIMARY KEY, displayName TEXT NOT NULL, mobile TEXT NOT NULL, email TEXT NOT NULL,
      district TEXT NOT NULL, sellerType TEXT NOT NULL, registeredAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS seller_consent (
      sellerId TEXT PRIMARY KEY REFERENCES sellers(id),
      processingConsentAt TEXT NOT NULL, termsAcceptedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY, sellerId TEXT NOT NULL REFERENCES sellers(id), parcelId TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Draft','Submitted','Under Review','Approved','Rejected','Withdrawn')),
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, submittedAt TEXT, seeded INTEGER NOT NULL,
      details TEXT NOT NULL, title TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_listing_per_parcel ON listings(parcelId)
      WHERE status IN ('Draft','Submitted','Under Review','Approved');
    CREATE TABLE IF NOT EXISTS listing_audit (
      id INTEGER PRIMARY KEY, listingId TEXT NOT NULL REFERENCES listings(id),
      event TEXT NOT NULL, recordedAt TEXT NOT NULL
    );
  `);

  migrateListingReview(db);

  transaction(db, () => {
    const now = new Date().toISOString();
    db.prepare("INSERT OR IGNORE INTO sellers VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(seededSellerId, "Seeded Demo Seller", "0000000000", "", "Jorhat", "Individual", now);
    const insert = db.prepare(`
      INSERT INTO listings VALUES (?, ?, ?, 'Approved', ?, ?, NULL, 1, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);
    for (const { parcelId, price, title } of seededListings) {
      const id = "seed-" + parcelId;
      const fields = {
        ...emptyListingDetails,
        askingPrice: String(price),
        consent: true,
      };
      const result = insert.run(id, seededSellerId, parcelId, now, now, JSON.stringify(fields), title);
      if (result.changes) recordAudit(db, id, "Seeded approved demonstration listing", now, { newStatus: "Approved", actorKind: "Seed", actorId: seededSellerId });
    }
  });
}

export function withDatabase<T>(work: (db: DatabaseSync) => T): T {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  try {
    db.exec("PRAGMA busy_timeout = 5000");
    if (!initialized) {
      const ready = db.prepare("PRAGMA user_version").get()?.user_version === 1
        && Number(db.prepare("SELECT count(*) AS total FROM sqlite_schema WHERE type = 'table' AND name IN ('sellers','seller_consent','listings','listing_audit')").get()?.total) === 4;
      if (!ready) initialize(db);
      initialized = true;
    }
    return work(db);
  } finally {
    db.close();
  }
}

type AuditMetadata = Partial<Omit<ListingAuditEvent, "id" | "listingId" | "event" | "recordedAt">>;

function recordAudit(db: DatabaseSync, id: string, event: string, recordedAt: string, metadata: AuditMetadata) {
  db.prepare(`
    INSERT INTO listing_audit (listingId, event, recordedAt, previousStatus, newStatus, actorKind, actorId,
      remarks, restrictionRemarks, sellerResponse) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, event, recordedAt, metadata.previousStatus ?? null, metadata.newStatus ?? null,
    metadata.actorKind ?? null, metadata.actorId ?? null, metadata.remarks || null,
    metadata.restrictionRemarks || null, metadata.sellerResponse || null);
}

type ListingRow = Omit<DemoListing, "details" | "seeded"> & { details: string; seeded: number; title: string };

function toListing(row: ListingRow): DemoListing {
  const { id, parcelId, status, createdAt, updatedAt, submittedAt, details, seeded } = row;
  return { id, parcelId, status, createdAt, updatedAt, submittedAt, details: JSON.parse(details), seeded: seeded === 1 };
}

export function getSeller(id: string) {
  return withDatabase(db => db.prepare("SELECT * FROM sellers WHERE id = ?").get(id) as DemoSeller | undefined);
}

export function listDemoSellerProfiles(): DemoSellerProfile[] {
  if (!existsSync(databasePath)) return [];
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout = 5000");
    return db.prepare(`
      SELECT s.id, s.displayName, count(l.id) AS listingCount
      FROM sellers s LEFT JOIN listings l ON l.sellerId = s.id
      WHERE s.id = ?
        OR (s.mobile GLOB '00000[0-9][0-9][0-9][0-9][0-9]' AND (s.email = '' OR lower(s.email) LIKE '%.test'))
      GROUP BY s.id, s.displayName
      ORDER BY s.displayName COLLATE NOCASE, s.id
    `).all(seededSellerId).map(row => ({
      id: String(row.id), displayName: String(row.displayName), listingCount: Number(row.listingCount),
    }));
  } finally {
    db.close();
  }
}

export function registerSeller(profile: Omit<DemoSeller, "id" | "registeredAt">) {
  return withDatabase(db => transaction(db, () => {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare("INSERT INTO sellers VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, profile.displayName, profile.mobile, profile.email, profile.district, profile.sellerType, now);
    db.prepare("INSERT INTO seller_consent VALUES (?, ?, ?)").run(id, now, now);
    return id;
  }));
}

export function getSellerDashboard(sellerId: string) {
  return withDatabase(db => ({
    listings: (db.prepare("SELECT * FROM listings WHERE sellerId = ? ORDER BY updatedAt DESC, id")
      .all(sellerId) as ListingRow[]).map(toListing),
    events: db.prepare(`
      SELECT a.* FROM listing_audit a JOIN listings l ON l.id = a.listingId
      WHERE l.sellerId = ? ORDER BY a.id DESC
    `).all(sellerId) as ListingAuditEvent[],
  }));
}

export function getListingEditor(sellerId: string, draftId?: string) {
  return withDatabase(db => {
    const draft = draftId
      ? db.prepare("SELECT * FROM listings WHERE id = ? AND sellerId = ? AND status = 'Draft'").get(draftId, sellerId) as ListingRow | undefined
      : undefined;
    const blocked = db.prepare(`
      SELECT id, parcelId, sellerId, status FROM listings WHERE status IN (${activeStatusesSql}) AND id <> ?
    `).all(draft?.id ?? "") as (Pick<ListingRow, "id" | "parcelId" | "status"> & { sellerId: string })[];
    const reservations: ParcelReservation[] = blocked.map(({ id, parcelId, status, sellerId: owner }) => ({
      parcelId, status, ...(status === "Draft" && owner === sellerId ? { ownDraftId: id } : {}),
    }));
    return { draft: draft ? toListing(draft) : undefined, blocked: reservations };
  });
}

export function saveListing(input: {
  sellerId: string;
  draftId: string;
  parcelId: string;
  submit: boolean;
  details: ListingDetails;
}) {
  return withDatabase(db => transaction(db, () => {
    const { sellerId, draftId, parcelId, submit, details } = input;
    if (draftId && !db.prepare("SELECT id FROM listings WHERE id = ? AND sellerId = ? AND status = 'Draft'").get(draftId, sellerId)) {
      throw new SellerDemoError("This draft is unavailable. Open your dashboard to check its current status.");
    }

    const conflict = listingConflict(db, parcelId, draftId);
    if (conflict) {
      throw new SellerDemoError(conflict.status === "Approved"
        ? "This parcel already has an approved demo listing."
        : "This parcel already has an active demo listing request. Choose another parcel.");
    }

    const id = draftId || randomUUID();
    const status = submit ? "Submitted" : "Draft";
    const now = new Date().toISOString();
    const submittedAt = submit ? now : null;
    if (draftId) {
      db.prepare("UPDATE listings SET parcelId = ?, status = ?, updatedAt = ?, submittedAt = ?, details = ? WHERE id = ?")
        .run(parcelId, status, now, submittedAt, JSON.stringify(details), id);
    } else {
      db.prepare("INSERT INTO listings VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, '')")
        .run(id, sellerId, parcelId, status, now, now, submittedAt, JSON.stringify(details));
    }
    recordAudit(db, id, submit ? "Listing submitted for demo review" : draftId ? "Draft updated" : "Draft created", now, { previousStatus: draftId ? "Draft" : null, newStatus: status, actorKind: "Seller", actorId: sellerId });
  }));
}

export function withdrawListing(sellerId: string, id: string) {
  return withDatabase(db => transaction(db, () => {
    const listing = db.prepare("SELECT status FROM listings WHERE id = ? AND sellerId = ?").get(id, sellerId) as Pick<DemoListing,"status"> | undefined;
    if (!listing || !canWithdraw(listing.status)) throw new SellerDemoError("This request is unavailable for withdrawal.");

    const now = new Date().toISOString();
    db.prepare("UPDATE listings SET status = 'Withdrawn', updatedAt = ? WHERE id = ?").run(now, id);
    recordAudit(db, id, "Listing withdrawn by demo seller", now, { previousStatus: listing.status, newStatus: "Withdrawn", actorKind: "Seller", actorId: sellerId });
  }));
}

export function readApprovedListings(db: DatabaseSync, listingId?: string) {
  return (db.prepare(`
    SELECT l.*, EXISTS(SELECT 1 FROM listing_audit a WHERE a.listingId = l.id
      AND a.newStatus = 'Approved' AND a.restrictionRemarks IS NOT NULL) AS restrictionReviewed
    FROM listings l WHERE l.status = 'Approved' AND (? IS NULL OR l.id = ?)
  `).all(listingId ?? null, listingId ?? null) as (ListingRow & { restrictionReviewed: number })[])
    .flatMap(row => {
      const { consent, askingPrice } = toListing(row).details;
      const price = Number(askingPrice);
      const parcel = findDemoParcel(row.parcelId);
      if (!consent || !Number.isFinite(price) || price <= 0 || !parcel || (parcel.restriction && !row.restrictionReviewed)) return [];
      return [{ listingId: row.id, parcelId: row.parcelId, price, title: row.title, seeded: row.seeded === 1, restrictionReviewed: row.restrictionReviewed === 1 }];
    });
}

export function getApprovedListings(listingId?: string) {
  return withDatabase(db => readApprovedListings(db, listingId));
}

export function getApprovedListingsReadOnly() {
  if (!existsSync(databasePath)) return [];
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout = 5000");
    // Publication review metadata is present after the Phase 3.2 migration.
    return db.prepare("PRAGMA user_version").get()?.user_version === 1 ? readApprovedListings(db) : [];
  } finally {
    db.close();
  }
}

const visibleInReview = "(submittedAt IS NOT NULL OR seeded = 1) AND status <> 'Draft'";

export function getReviewCounts() {
  return withDatabase(db => {
    const rows = db.prepare("SELECT status, count(*) AS total FROM listings WHERE " + visibleInReview + " GROUP BY status")
      .all() as { status: ListingStatus; total: number }[];
    return {
      total: rows.reduce((total, row) => total + row.total, 0),
      statuses: new Map(rows.map(row => [row.status, row.total])),
    };
  });
}

type ReviewRow = ListingRow & { sellerName: string };

export type ReviewFilters = {
  query: string;
  district: string;
  circle: string;
  status: string;
  date: string;
  sort: string;
  page: number;
};

export function getReviewQueue(filters: ReviewFilters) {
  return withDatabase(db => {
    const rows = db.prepare(`
      SELECT l.*, s.displayName AS sellerName FROM listings l JOIN sellers s ON s.id = l.sellerId
      WHERE ${visibleInReview}
    `).all() as ReviewRow[];
    const filtered = rows.map(row => ({
      id: row.id, parcelId: row.parcelId, sellerName: row.sellerName, submittedAt: row.submittedAt,
      price: Number(toListing(row).details.askingPrice) || null, status: row.status,
      parcel: findDemoParcel(row.parcelId),
    })).filter(row => {
      const day = row.submittedAt ? new Date(Date.parse(row.submittedAt) + 330 * 60000).toISOString().slice(0, 10) : "";
      return (!filters.district || row.parcel?.district === filters.district)
        && (!filters.circle || row.parcel?.circle === filters.circle)
        && (!filters.status || row.status === filters.status)
        && (!filters.date || day === filters.date)
        && [row.id, row.parcelId, row.sellerName, row.parcel?.dagNumber, row.parcel?.pattaNumber]
          .some(value => value?.toLowerCase().includes(filters.query.toLowerCase()));
    });
    filtered.sort((a, b) => {
      if (filters.sort === "price-high") return (b.price ?? 0) - (a.price ?? 0) || a.id.localeCompare(b.id);
      if (filters.sort === "price-low") return (a.price ?? 0) - (b.price ?? 0) || a.id.localeCompare(b.id);
      if (filters.sort === "status") return a.status.localeCompare(b.status) || a.id.localeCompare(b.id);
      if (!a.submittedAt || !b.submittedAt) return Number(!a.submittedAt) - Number(!b.submittedAt) || a.id.localeCompare(b.id);
      const dateOrder = a.submittedAt.localeCompare(b.submittedAt);
      return (filters.sort === "oldest" ? dateOrder : -dateOrder) || a.id.localeCompare(b.id);
    });
    const pageSize = 15;
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.min(filters.page, pages);
    return { total: filtered.length, pages, page, rows: filtered.slice((page - 1) * pageSize, page * pageSize) };
  });
}

function listingConflict(db: DatabaseSync, parcelId: string, id: string) {
  return db.prepare(`
    SELECT id, status FROM listings WHERE parcelId = ? AND id <> ? AND status IN (${activeStatusesSql})
  `).get(parcelId, id);
}

export function getAdminReview(id: string) {
  return withDatabase(db => {
    const row = db.prepare(`
      SELECT l.*, s.displayName AS sellerName FROM listings l JOIN sellers s ON s.id = l.sellerId
      WHERE l.id = ? AND ${visibleInReview}
    `).get(id) as ReviewRow | undefined;
    if (!row) return null;
    const listing = toListing(row);
    return {
      listing, sellerName: row.sellerName, parcel: findDemoParcel(row.parcelId),
      conflict: Boolean(listingConflict(db, row.parcelId, id)),
      events: db.prepare("SELECT * FROM listing_audit WHERE listingId = ? ORDER BY id DESC").all(id) as ListingAuditEvent[],
    };
  });
}

export function recordAdminDecision(input: {
  id: string; decision: ReviewDecision; administratorId: string;
  remarks: string; acknowledgeRestriction: boolean; restrictionRemarks: string;
}) {
  withDatabase(db => transaction(db, () => {
    const row = db.prepare("SELECT * FROM listings WHERE id = ? AND " + visibleInReview).get(input.id) as ListingRow | undefined;
    if (!row || !allowedReviewDecisions(row.status).includes(input.decision)) {
      throw new SellerDemoError("This decision is unavailable for the current listing status.");
    }
    const remarks = input.remarks.trim();
    const restrictionRemarks = input.restrictionRemarks.trim();
    if (remarks.length > 1000 || (input.decision !== "Under Review" && !remarks)) {
      throw new SellerDemoError("Enter decision remarks of 1–1,000 characters.");
    }
    const parcel = findDemoParcel(row.parcelId);
    if (input.decision === "Approved") {
      const conflict = Boolean(listingConflict(db, row.parcelId, row.id));
      const failed = reviewChecks(toListing(row), parcel, conflict).find(check => !check.passed);
      if (failed) throw new SellerDemoError("Resolve this checklist item before approval: " + failed.label + ".");
      if (parcel?.restriction && (!input.acknowledgeRestriction || !restrictionRemarks || restrictionRemarks.length > 1000)) {
        throw new SellerDemoError("Acknowledge the demo restriction and enter additional review remarks of 1–1,000 characters.");
      }
    }
    const now = new Date().toISOString();
    db.prepare("UPDATE listings SET status = ?, updatedAt = ? WHERE id = ?").run(input.decision, now, row.id);
    recordAudit(db, row.id, "Administrator decision", now, {
      previousStatus: row.status, newStatus: input.decision, actorKind: "Administrator", actorId: input.administratorId, remarks,
      restrictionRemarks: input.decision === "Approved" && parcel?.restriction ? restrictionRemarks : undefined,
    });
  }));
}

export function resubmitClarification(sellerId: string, id: string, response: string) {
  const sellerResponse = response.trim();
  if (!sellerResponse || sellerResponse.length > 1000) throw new SellerDemoError("Enter a clarification response of 1–1,000 characters.");
  withDatabase(db => transaction(db, () => {
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE listings SET status = 'Submitted', updatedAt = ?, submittedAt = ?
      WHERE id = ? AND sellerId = ? AND status = 'Clarification Required'
    `).run(now, now, id, sellerId);
    if (!result.changes) throw new SellerDemoError("This listing is unavailable for clarification resubmission.");
    recordAudit(db, id, "Seller clarification submitted", now, {
      previousStatus: "Clarification Required", newStatus: "Submitted", actorKind: "Seller", actorId: sellerId, sellerResponse,
    });
  }));
}
