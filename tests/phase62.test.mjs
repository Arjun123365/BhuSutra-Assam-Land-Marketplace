import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, rmdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "next/headers") return { url: "data:text/javascript,export const cookies = async () => globalThis.readinessCookies", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export const revalidatePath = () => {}", shortCircuit: true };
    if (specifier === "next/navigation") return { url: "data:text/javascript,export const redirect = path => {throw new Error(path)}", shortCircuit: true };
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) return nextResolve(specifier + ".ts", context);
    return nextResolve(specifier, context);
  },
});
const directory = mkdtempSync(join(tmpdir(), "bhusutra-readiness-"));
const database = join(directory, "test.sqlite");
process.env.BHUSUTRA_DEMO_DB = database;
const jar = new Map();
jar.set = (key, value) => Map.prototype.set.call(jar, key, { value });
globalThis.readinessCookies = jar;
const store = await import("../src/lib/seller-store.ts");
const buyers = await import("../src/lib/buyer-store.ts");
const assistance = await import("../src/lib/assistance-store.ts");
const { assistanceChecklist } = await import("../src/lib/assistance.ts");
const { emptyListingDetails } = await import("../src/lib/seller-demo.ts");
const { saveBuyerCheck, getBuyerCheckHistory } = await import("../src/lib/due-diligence-store.ts");
const { getPublicMarketplace } = await import("../src/lib/public-marketplace.ts");
const { getHomepageStatistics, getAdministratorAnalytics } = await import("../src/lib/dashboard-data.ts");
const { getMonitoringSnapshot, getNotifications, recordCoordination, markNotificationRead } = await import("../src/lib/coordination-store.ts");
const { demoAdministratorId } = await import("../src/lib/admin-policy.ts");
const { unlockAdmin, currentAdmin } = await import("../src/lib/admin-session.ts");
const { currentBuyer, setDemoBuyer } = await import("../src/lib/buyer-session.ts");
const { currentSeller } = await import("../src/lib/seller-session.ts");
const { requireAssistanceActor } = await import("../src/lib/assistance-session.ts");
const { consumeActionRate } = await import("../src/lib/action-rate-limit.ts");
const { signSellerCookie } = await import("../src/lib/seller-cookie.ts");
const { ensureSigningKey } = await import("../src/lib/seller-session.ts");
const { unlockAdminAction } = await import("../src/app/admin/actions.ts");
const { downloadMonitoringReport } = await import("../src/lib/coordination-report.ts");
const { GET: verificationReport } = await import("../src/app/verify-records/report/[parcelId]/route.ts");
const { downloadAssistanceReport } = await import("../src/lib/assistance-report.ts");

const seller = store.registerSeller({ displayName: "Readiness Seller", mobile: "0000012345", email: "", district: "Kamrup", sellerType: "Individual" });
const buyer = buyers.registerBuyer({ displayName: "Readiness <Buyer>", mobile: "0000098765", email: "", district: "Kamrup", buyerType: "Individual" });
const owner = { kind: "Seller", id: seller };
const shopper = { kind: "Buyer", id: buyer };
const admin = { kind: "Admin", id: demoAdministratorId };
const details = { ...emptyListingDetails, askingPrice: "1900000", description: "Fictional readiness listing with voluntary declaration.", declaration: true, consent: true, acknowledgePending: true };
store.withDatabase(db => {
  const at = "2026-11-20T00:00:00Z";
  db.prepare("INSERT INTO listings VALUES ('readiness-p15', ?, 'P-15', 'Approved', ?, ?, ?, 0, ?, '')")
    .run(seller, at, at, at, JSON.stringify(details));
});
const originalApproval = getPublicMarketplace().listings.find(item => item.id === "P-15");
let reference;

after(() => {
  for (const suffix of ["", ".session-key"]) rmSync(database + suffix, { force: true });
  rmdirSync(directory);
});

test("registration, draft, approval, enquiry, verification, transaction and monitoring integrate end to end", async () => {
  store.saveListing({ sellerId: seller, parcelId: "P-16", draftId: "", submit: false, details });
  const draft = store.getSellerDashboard(seller).listings.find(item => item.parcelId === "P-16");
  assert.throws(() => store.saveListing({ sellerId: seller, parcelId: "P-16", draftId: "", submit: false, details }), /active demo listing/);
  store.saveListing({ sellerId: seller, parcelId: "P-16", draftId: draft.id, submit: true, details });
  for (const decision of ["Under Review", "Approved"]) {
    store.recordAdminDecision({ id: draft.id, administratorId: admin.id, decision, remarks: "Fictional publication review only.", acknowledgeRestriction: false, restrictionRemarks: "" });
  }
  assert.equal(getPublicMarketplace().listings.find(item => item.id === "P-16").listingId, draft.id);
  const enquiry = buyers.submitEnquiry(buyer, draft.id, "Fictional enquiry about demo coordination.");
  buyers.changeEnquiry(owner, enquiry, "Viewed");
  buyers.changeEnquiry(owner, enquiry, "Responded", "Fictional response for the demonstration.");
  assert.equal(buyers.getEnquiries(shopper)[0].events.length, 3);
  saveBuyerCheck(buyer, "P-16", "ownership", "Completed");
  assert.equal(getBuyerCheckHistory(buyer, "P-16")[0].status, "Completed");
  reference = assistance.startAssistance(buyer, draft.id);
  assert.equal(assistance.startAssistance(buyer, draft.id), reference);
  for (const [actor, action] of [[shopper, "request-contact"], [owner, "acknowledge"], [owner, "accept"], [shopper, "start-documents"]]) assistance.updateAssistance(actor, reference, { action });
  for (const check of assistanceChecklist.filter(item => item.group === "documents")) assistance.updateAssistance(shopper, reference, { check: check.id, completed: true });
  assistance.updateAssistance(shopper, reference, { action: "start-legal" });
  for (const check of assistanceChecklist.filter(item => item.group === "legal")) assistance.updateAssistance(owner, reference, { check: check.id, completed: true });
  assistance.updateAssistance(shopper, reference, { action: "refer" });
  recordCoordination(admin.id, reference, { kind: "flag", note: "Fictional preparation clarification." });
  const snapshot = getMonitoringSnapshot(admin);
  const flag = snapshot.coordination[0];
  recordCoordination(admin.id, reference, { kind: "complete", targetId: flag.id });
  assistance.updateAssistance(owner, reference, { action: "close-seller" });
  const notices = getNotifications(shopper);
  assert.ok(notices.some(item => item.message.includes("Closed")));
  markNotificationRead(shopper, notices[0].key);
  assert.equal(getNotifications(shopper).find(item => item.key === notices[0].key).read, true);
  assert.equal(getAdministratorAnalytics().transactionStages.find(item => item.label === "Closed").value, 1);
  assert.equal(getHomepageStatistics().enquiries, 1);
  assert.equal(assistance.getAssistance(shopper, reference).request.stage, "closed");
  await setDemoBuyer(buyer);
  const report = await downloadAssistanceReport("Buyer", reference);
  assert.equal(report.status, 200);
  const html = await report.text();
  assert.ok(html.includes("Readiness &lt;Buyer&gt;"));
  assert.ok(html.includes("DEMONSTRATION ONLY") && html.includes("Follow-up #"));
  assert.doesNotMatch(html, /<Buyer>|0000098765/);
  const verification = await verificationReport(new Request("http://localhost/report"), { params: Promise.resolve({ parcelId: "P-16" }) });
  assert.match(await verification.text(), /Not connected \/ Not verified/);
  assert.equal(getPublicMarketplace().listings.find(item => item.id === "P-15").listingId, originalApproval.listingId);
  assert.deepEqual(store.withDatabase(db => db.prepare("PRAGMA foreign_key_check").all()), []);
});

test("a failed audit insert rolls back the workflow update in the isolated store", () => {
  const listing = getPublicMarketplace().listings.find(item => item.id === "P-16");
  const second = assistance.startAssistance(buyer, listing.listingId);
  const before = assistance.getAssistance(shopper, second);
  store.withDatabase(db => db.exec("CREATE TRIGGER fail_readiness_audit BEFORE INSERT ON assistance_events BEGIN SELECT RAISE(ABORT, 'fixture audit failure'); END"));
  try {
    assert.throws(() => assistance.updateAssistance(shopper, second, { action: "request-contact" }), /fixture audit failure/);
    assert.equal(assistance.getAssistance(shopper, second).request.stage, before.request.stage);
    assert.equal(assistance.getAssistance(shopper, second).events.length, before.events.length);
  } finally { store.withDatabase(db => db.exec("DROP TRIGGER fail_readiness_audit")); }
});

test("cold reads preserve the complete schema and audit bytes without reseeding", () => {
  const before = readFileSync(database);
  const script = `
    import { registerHooks } from 'node:module';
    registerHooks({ resolve(specifier, context, nextResolve) {
      if (specifier === 'server-only') return { url:'data:text/javascript,', shortCircuit:true };
      if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !specifier.endsWith('.ts')) return nextResolve(specifier+'.ts',context);
      return nextResolve(specifier,context);
    } });
    const store = await import('./src/lib/seller-store.ts');
    if (!store.getApprovedListings().length) process.exit(1);
  `;
  const child = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", script], { cwd: process.cwd(), env: { ...process.env, BHUSUTRA_DEMO_DB: database }, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(readFileSync(database), before);
});

test("tampered, expired, forged-role and wrong-owner sessions cannot reveal private records", async () => {
  jar.clear();
  const key = ensureSigningKey();
  const now = Math.floor(Date.now() / 1000);
  jar.set("bhusutra_demo_buyer_workspace", signSellerCookie("buyer-session", buyer, now - 1, key));
  assert.equal(await currentBuyer(), undefined);
  jar.set("bhusutra_demo_seller", signSellerCookie("buyer-session", seller, now + 60, key));
  assert.equal(await currentSeller(), undefined);
  jar.set("bhusutra_demo_buyer_workspace", "forged.session.signature");
  assert.equal(await currentBuyer(), undefined);
  await assert.rejects(requireAssistanceActor("Admin"), error => error.message === "/");
  assert.deepEqual(getMonitoringSnapshot({ kind: "Unknown", id: seller }).requests, []);
  assert.throws(() => assistance.listAssistance({ kind: "Unknown", id: seller }), /demo profile/);
  assert.throws(() => buyers.getEnquiries({ kind: "Unknown", id: seller }), /demo profile/);
  const stranger = { kind: "Buyer", id: "' OR 1=1 --" };
  assert.deepEqual(assistance.listAssistance(stranger), []);
  assert.deepEqual(buyers.getEnquiries(stranger), []);
  assert.equal(assistance.getAssistance(stranger, reference), undefined);
  assert.equal((await downloadAssistanceReport("Buyer", reference)).status, 404);
  assert.equal((await downloadMonitoringReport(new URL("http://localhost/report?kind=status"))).status, 404);
});

test("rate windows expire, remain isolated and produce usable authentication feedback", async () => {
  const rateKey = "fixture-window";
  assert.equal(consumeActionRate(rateKey, 2, 1000).allowed, true);
  assert.equal(consumeActionRate(rateKey, 2, 1001).allowed, true);
  assert.equal(consumeActionRate(rateKey, 2, 1002).allowed, false);
  assert.equal(consumeActionRate("other-fixture-window", 2, 1002).allowed, true);
  assert.equal(consumeActionRate(rateKey, 2, 61001).allowed, true);
  const fields = new FormData();
  fields.set("key", "incorrect-demo-key");
  let response;
  for (let attempt = 0; attempt < 11; attempt += 1) response = await unlockAdminAction({}, fields);
  assert.match(response.error, /Too many demo actions.*seconds/);
});

test("administrator reports and coordination stay gated by development configuration", async () => {
  process.env.NODE_ENV = "development";
  process.env.BHUSUTRA_DEMO_ADMIN = "1";
  process.env.BHUSUTRA_DEMO_ADMIN_KEY = "local-readiness-test-key-only";
  assert.equal(await unlockAdmin(process.env.BHUSUTRA_DEMO_ADMIN_KEY), true);
  assert.equal(await currentAdmin(), admin.id);
  assert.equal((await downloadMonitoringReport(new URL("http://localhost/report?kind=history&reference=" + reference))).status, 200);
  process.env.NODE_ENV = "production";
  assert.equal(await currentAdmin(), null);
  assert.equal((await downloadMonitoringReport(new URL("http://localhost/report?kind=status"))).status, 404);
  jar.clear();
});
