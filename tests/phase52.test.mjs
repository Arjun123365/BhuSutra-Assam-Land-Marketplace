import assert from "node:assert/strict";
import { mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "next/headers") return { url: "data:text/javascript,export const cookies = async () => globalThis.coordinationTestCookies", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export const revalidatePath = () => {}", shortCircuit: true };
    if (specifier === "next/navigation") return { url: "data:text/javascript,export const redirect = path => {throw new Error(path)}", shortCircuit: true };
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) return nextResolve(specifier + ".ts", context);
    return nextResolve(specifier, context);
  },
});
const directory = mkdtempSync(join(tmpdir(), "bhusutra-coordination-"));
process.env.BHUSUTRA_DEMO_DB = join(directory, "test.sqlite");
const jar = new Map();
jar.set = (name, value) => Map.prototype.set.call(jar, name, { value });
globalThis.coordinationTestCookies = jar;
const { registerBuyer } = await import("../src/lib/buyer-store.ts");
const { registerSeller, withDatabase, getApprovedListings } = await import("../src/lib/seller-store.ts");
const { emptyListingDetails } = await import("../src/lib/seller-demo.ts");
const { startAssistance, updateAssistance } = await import("../src/lib/assistance-store.ts");
const { getMonitoringSnapshot, getNotifications, markNotificationRead, recordCoordination } = await import("../src/lib/coordination-store.ts");
const { filterTransactions, transactionAnalytics, openFollowups, coordinationWatermark } = await import("../src/lib/coordination.ts");
const { coordinationAction, notificationReadAction } = await import("../src/app/coordination-actions.ts");
const { demoAdministratorId } = await import("../src/lib/admin-policy.ts");
const { unlockAdmin } = await import("../src/lib/admin-session.ts");
const { setDemoBuyer } = await import("../src/lib/buyer-session.ts");
const { GET: report } = await import("../src/app/admin/transactions/report/route.ts");
const admin = { kind: "Admin", id: demoAdministratorId };
const buyer = { kind: "Buyer", id: registerBuyer({ displayName: "Fixture Buyer", mobile: "0000012345", email: "buyer@example.test", district: "Kamrup", buyerType: "Individual" }) };
const otherBuyer = { kind: "Buyer", id: registerBuyer({ displayName: "Other Buyer", mobile: "0000098765", email: "", district: "Jorhat", buyerType: "Individual" }) };
const seller = { kind: "Seller", id: registerSeller({ displayName: "Fixture Seller", mobile: "0000054321", email: "", district: "Kamrup", sellerType: "Individual" }) };
const stranger = { kind: "Seller", id: "unrelated-seller" };
withDatabase(db => db.prepare("INSERT INTO listings VALUES ('published-p15', ?, 'P-15', 'Approved', ?, ?, ?, 0, ?, '')")
  .run(seller.id, "2026-11-18T04:00:00Z", "2026-11-18T04:00:00Z", "2026-11-18T04:00:00Z", JSON.stringify({ ...emptyListingDetails, consent: true, declaration: true, askingPrice: "2200000" })));
const reference = startAssistance(buyer.id, "published-p15");
const otherReference = startAssistance(otherBuyer.id, "seed-P-01");
const preservedTables = ["sellers", "seller_consent", "listings", "listing_audit", "buyers", "buyer_enquiries", "enquiry_audit", "assistance_requests", "assistance_events"];
const snapshotRows = () => withDatabase(db => Object.fromEntries(preservedTables.map(table => [table, db.prepare("SELECT * FROM " + table + " ORDER BY rowid").all()])));
const makeReport = query => report(new Request("http://localhost/admin/transactions/report?" + query));

after(() => {
  for (const suffix of ["", ".session-key"]) rmSync(process.env.BHUSUTRA_DEMO_DB + suffix, { force: true });
  rmdirSync(directory);
});

test("monitoring isolates participants and reads actual totals, district distribution and pending roles", () => {
  const snapshot = getMonitoringSnapshot(admin);
  assert.equal(snapshot.requests.length, 2);
  assert.deepEqual(getMonitoringSnapshot(buyer).requests.map(item => item.reference), [reference]);
  assert.deepEqual(getMonitoringSnapshot(seller).requests.map(item => item.reference), [reference]);
  assert.deepEqual(getMonitoringSnapshot(stranger).requests, []);
  assert.deepEqual(getMonitoringSnapshot({ kind: "Admin", id: "forged-admin" }).requests, []);
  const stats = transactionAnalytics(snapshot);
  assert.equal(stats.total, 2);
  assert.equal(stats.active, 2);
  assert.equal(stats.buyerPending, 2);
  assert.equal(stats.averageHours, null);
  assert.equal(stats.districts.find(item => item.district === "Kamrup").total, 1);
  assert.equal(stats.districts.find(item => item.district === "Dibrugarh").total, 0);
  assert.equal(filterTransactions(snapshot, { district: "Kamrup", query: "P-15", stage: "interest" }).length, 1);
  assert.equal(filterTransactions(snapshot, { district: "Dibrugarh" }).length, 0);
});

test("coordination notes and documentation follow-ups are additive, audited and complete idempotently", () => {
  const before = snapshotRows();
  assert.throws(() => recordCoordination("forged-admin", reference, { kind: "note", note: "Fixture" }), /administrator/);
  assert.throws(() => recordCoordination(admin.id, reference, { kind: "approve-title", note: "Fixture" }), /coordination note/);
  assert.throws(() => recordCoordination(admin.id, "unknown", { kind: "flag", note: "Fixture" }), /unavailable/);
  recordCoordination(admin.id, reference, { kind: "note", note: "Fictional <coordination> note" });
  recordCoordination(admin.id, reference, { kind: "flag", note: "Request preparation notes for the demo document checklist." });
  const flag = openFollowups(getMonitoringSnapshot(admin).coordination)[0];
  assert.equal(transactionAnalytics(getMonitoringSnapshot(admin)).followups, 1);
  assert.equal(filterTransactions(getMonitoringSnapshot(admin), { followup: "pending" })[0].reference, reference);
  assert.throws(() => recordCoordination(admin.id, otherReference, { kind: "complete", targetId: flag.id }), /unavailable/);
  recordCoordination(admin.id, reference, { kind: "complete", targetId: flag.id });
  recordCoordination(admin.id, reference, { kind: "complete", targetId: flag.id });
  assert.equal(getMonitoringSnapshot(admin).coordination.length, 3);
  assert.equal(openFollowups(getMonitoringSnapshot(admin).coordination).length, 0);
  assert.equal(getMonitoringSnapshot(buyer).coordination.length, 3);
  assert.equal(getMonitoringSnapshot(otherBuyer).coordination.length, 0);
  assert.deepEqual(snapshotRows(), before);
  assert.deepEqual(withDatabase(db => db.prepare("PRAGMA foreign_key_check").all()), []);
});

test("in-app updates follow real stage events and read receipts are durable and private", () => {
  updateAssistance(buyer, reference, { action: "request-contact" });
  assert.equal(transactionAnalytics(getMonitoringSnapshot(admin)).sellerPending, 1);
  updateAssistance(seller, reference, { action: "acknowledge" });
  updateAssistance(seller, reference, { action: "accept" });
  const notices = getNotifications(buyer);
  assert.ok(notices.some(item => item.message.includes("Seller response")));
  assert.ok(notices.some(item => item.message.includes("Administrator coordination update")));
  assert.ok(getNotifications(admin).some(item => item.message.includes("New buyer assistance request")));
  assert.ok(notices.every(item => item.reference === reference));
  const newest = notices[0];
  markNotificationRead(buyer, newest.key);
  markNotificationRead(buyer, newest.key);
  assert.equal(getNotifications(buyer).find(item => item.key === newest.key).read, true);
  assert.equal(getNotifications(seller).find(item => item.key === newest.key).read, false);
  assert.throws(() => markNotificationRead(otherBuyer, newest.key), /unavailable/);
  assert.equal(getNotifications(stranger).length, 0);
  assert.ok(getApprovedListings().some(item => item.parcelId === "P-15"));
});

test("analytics calculates closed duration from recorded closure events and filters dates in IST", () => {
  const data = getMonitoringSnapshot(admin);
  const first = data.requests.find(item => item.reference === reference);
  const second = data.requests.find(item => item.reference === otherReference);
  const fixture = {
    requests: [
      { ...first, stage: "closed", createdAt: "2026-11-18T00:00:00Z", updatedAt: "2026-11-30T00:00:00Z" },
      { ...second, stage: "closed", createdAt: "2026-11-18T01:00:00Z" },
    ],
    activities: [
      { reference, toStage: "closed", recordedAt: "2026-11-18T02:00:00Z" },
      { reference: otherReference, toStage: "closed", recordedAt: "2026-11-18T05:00:00Z" },
    ], coordination: [],
  };
  assert.equal(transactionAnalytics(fixture).averageHours, 3);
  assert.equal(filterTransactions(fixture, { from: "2026-11-18", to: "2026-11-18" }).length, 2);
  assert.equal(filterTransactions(fixture, { from: "2026-11-19" }).length, 0);
  updateAssistance(buyer, reference, { action: "cancel" });
  assert.equal(transactionAnalytics(getMonitoringSnapshot(admin)).cancelled, 1);
  assert.ok(getNotifications(seller).some(item => item.message.includes("Cancelled")));
});

test("admin actions and reports require the local signed development session and escape shared text", async () => {
  const form = new FormData();
  form.set("kind", "flag");
  form.set("note", "Fictional pending follow-up for the demo.");
  assert.equal((await makeReport("kind=status")).status, 404);
  await assert.rejects(coordinationAction(reference, form), /\/admin\/access/);
  await assert.rejects(notificationReadAction("Admin", "activity-1"), /\/admin\/access/);
  process.env.NODE_ENV = "development";
  process.env.BHUSUTRA_DEMO_ADMIN = "1";
  process.env.BHUSUTRA_DEMO_ADMIN_KEY = "test-key-for-local-demo-administrator";
  assert.equal(await unlockAdmin(process.env.BHUSUTRA_DEMO_ADMIN_KEY), true);
  await assert.rejects(coordinationAction(reference, form), error => error.message === "/admin/transactions/" + reference);
  for (const kind of ["status", "districts", "followups", "history"]) {
    const response = await makeReport("kind=" + kind + "&reference=" + reference);
    assert.equal(response.status, 200, kind);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.text();
    assert.ok(body.includes(coordinationWatermark));
    assert.doesNotMatch(body, /0000012345|0000054321|buyer@example.test|Government-record verified|<coordination>/);
    if (kind === "history") assert.ok(body.includes("&lt;coordination&gt;"));
  }
  assert.equal((await makeReport("kind=invalid")).status, 400);
  assert.equal((await makeReport("kind=history&reference=unknown")).status, 404);
  await setDemoBuyer(otherBuyer.id);
  const key = getNotifications(buyer)[0].key;
  await assert.rejects(notificationReadAction("Buyer", key), /\/buyer\/notifications/);
  assert.equal(getNotifications(otherBuyer).some(item => item.key === key), false);
  process.env.NODE_ENV = "production";
  assert.equal((await makeReport("kind=status")).status, 404);
  await assert.rejects(coordinationAction(reference, form), /\/admin\/access/);
  jar.clear();
});
