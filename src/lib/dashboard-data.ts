import "server-only";

import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { assistanceStages } from "./assistance";
import { demoDistricts, demoParcels } from "./demo-marketplace";
import { databasePath, readApprovedListings } from "./seller-store";
import { cache } from "react";

export type ChartValue = { label: string; value: number };
export type DashboardActivity = { label: string; recordedAt: string; href: string };
export type BuyerParcelProgress = { parcelId: string; completed: number; touched: number; updatedAt: string };

function readDashboard<T>(work: (db?: DatabaseSync) => T): T {
  if (!existsSync(databasePath)) return work();
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout = 5000; BEGIN");
    const result = work(db);
    db.exec("COMMIT");
    return result;
  } finally { db.close(); }
}

function hasTable(db: DatabaseSync | undefined, table: string): db is DatabaseSync {
  return Boolean(db?.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?").get(table));
}

function count(db: DatabaseSync | undefined, table: string) {
  return hasTable(db, table) ? Number(db.prepare("SELECT count(*) AS total FROM " + table).get()?.total) : 0;
}

export const getHomepageStatistics = cache(function getHomepageStatistics() {
  return readDashboard(db => ({
    parcels: demoParcels.length,
    approved: db && hasTable(db, "listings") && db.prepare("PRAGMA user_version").get()?.user_version === 1 ? readApprovedListings(db).length : 0,
    sellers: count(db, "sellers"),
    buyers: count(db, "buyers"),
    enquiries: count(db, "buyer_enquiries"),
    transactions: count(db, "assistance_requests"),
  }));
});

export function getParcelDistributions() {
  const categories = [...new Set(demoParcels.map(parcel => parcel.category))].sort();
  return {
    districts: demoDistricts.map(label => ({ label, value: demoParcels.filter(parcel => parcel.district === label).length })),
    categories: categories.map(label => ({ label, value: demoParcels.filter(parcel => parcel.category === label).length })),
  };
}

export const getAdministratorAnalytics = cache(function getAdministratorAnalytics() {
  return readDashboard(db => {
    const listingStatus = hasTable(db, "listings") ? db.prepare("SELECT status AS label, count(*) AS value FROM listings GROUP BY status ORDER BY status").all() as ChartValue[] : [];
    const transactions = hasTable(db, "assistance_requests") ? db.prepare("SELECT stage, count(*) AS value FROM assistance_requests GROUP BY stage ORDER BY stage").all() : [];
    const enquiryTrends = hasTable(db, "buyer_enquiries") ? db.prepare(`
      SELECT strftime('%Y-%m-%d', createdAt, '+5 hours', '+30 minutes') AS label, count(*) AS value
      FROM buyer_enquiries GROUP BY label ORDER BY label DESC LIMIT 14
    `).all().reverse() as ChartValue[] : [];
    const listingActivity = hasTable(db, "listing_audit") ? db.prepare("SELECT event AS label, recordedAt FROM listing_audit ORDER BY id DESC LIMIT 8").all() as Omit<DashboardActivity, "href">[] : [];
    const buyerActivity = hasTable(db, "enquiry_audit") ? db.prepare("SELECT actorKind, newStatus, recordedAt FROM enquiry_audit ORDER BY id DESC LIMIT 8").all() : [];
    return {
      listingStatus, enquiryTrends,
      transactionStages: transactions.map(item => ({ label: assistanceStages[item.stage as keyof typeof assistanceStages], value: Number(item.value) })),
      recentActivity: [
        ...listingActivity.map(item => ({ ...item, href: "/admin/listings" })),
        ...buyerActivity.map(item => ({ label: item.actorKind + " enquiry activity · " + item.newStatus, recordedAt: String(item.recordedAt), href: "/admin/enquiries" })),
      ].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).slice(0, 8),
    };
  });
});

export const getBuyerVerificationOverview = cache(function getBuyerVerificationOverview(buyerId: string): BuyerParcelProgress[] {
  return readDashboard(db => hasTable(db, "buyer_check_history") ? db.prepare(`
    SELECT h.parcelId, count(*) AS touched, sum(h.status = 'Completed') AS completed, max(h.recordedAt) AS updatedAt
    FROM buyer_check_history h
    WHERE h.buyerId = ? AND NOT EXISTS (
      SELECT 1 FROM buyer_check_history newer
      WHERE newer.buyerId = h.buyerId AND newer.parcelId = h.parcelId AND newer.checkId = h.checkId AND newer.id > h.id
    )
    GROUP BY h.parcelId ORDER BY h.parcelId
  `).all(buyerId) as BuyerParcelProgress[] : []);
});
