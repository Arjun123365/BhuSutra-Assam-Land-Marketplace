import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, rmdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) return nextResolve(specifier + ".ts", context);
    return nextResolve(specifier, context);
  },
});
const temporary = mkdtempSync(join(tmpdir(), "bhusutra-dashboard-"));
const path = join(temporary, "fixture.sqlite");
process.env.BHUSUTRA_DEMO_DB = path;
const { getHomepageStatistics, getAdministratorAnalytics, getBuyerVerificationOverview, getParcelDistributions } = await import("../src/lib/dashboard-data.ts");
const { withDatabase, registerSeller } = await import("../src/lib/seller-store.ts");
const { registerBuyer, submitEnquiry } = await import("../src/lib/buyer-store.ts");
const { saveBuyerCheck } = await import("../src/lib/due-diligence-store.ts");
const { startAssistance } = await import("../src/lib/assistance-store.ts");
const { emptyListingDetails } = await import("../src/lib/seller-demo.ts");
const { getPublicMarketplace } = await import("../src/lib/public-marketplace.ts");
after(() => { rmSync(path, { force: true }); rmdirSync(temporary); });

test("dashboard handles absent storage with actual parcel distributions and no database writes", () => {
  assert.deepEqual(getHomepageStatistics(), { parcels: 17, approved: 0, sellers: 0, buyers: 0, enquiries: 0, transactions: 0 });
  assert.deepEqual(getBuyerVerificationOverview("unknown"), []);
  assert.deepEqual(getAdministratorAnalytics().enquiryTrends, []);
  const { districts, categories } = getParcelDistributions();
  assert.deepEqual(districts.map(item => item.label), ["Dibrugarh", "Jorhat", "Kamrup"]);
  assert.equal(districts.reduce((sum, item) => sum + item.value, 0), 17);
  assert.equal(categories.reduce((sum, item) => sum + item.value, 0), 17);
  assert.equal(existsSync(path), false);
});

test("homepage counters use stored records, publication policy and no legacy interest placeholders", () => {
  const seller = registerSeller({ displayName: "Dashboard Demo Seller", mobile: "0000012345", email: "", district: "Kamrup", sellerType: "Individual" });
  const buyer = registerBuyer({ displayName: "Dashboard Demo Buyer", mobile: "0000098765", email: "", district: "Kamrup", buyerType: "Individual" });
  const details = { ...emptyListingDetails, consent: true, declaration: true, askingPrice: "2200000" };
  const date = "2026-11-20T00:00:00Z";
  withDatabase(db => {
    const insert = db.prepare("INSERT INTO listings VALUES (?, ?, ?, 'Approved', ?, ?, ?, 0, ?, '')");
    insert.run("public-p15", seller, "P-15", date, date, date, JSON.stringify(details));
    insert.run("unreviewed-p07", seller, "P-07", date, date, date, JSON.stringify(details));
    insert.run("no-consent", seller, "P-14", date, date, date, JSON.stringify({ ...details, consent: false }));
  });
  assert.equal(getHomepageStatistics().enquiries, 0);
  submitEnquiry(buyer, "public-p15", "Fictional dashboard fixture.");
  startAssistance(buyer, "public-p15");
  const before = readFileSync(path);
  assert.deepEqual(getHomepageStatistics(), { parcels: 17, approved: 4, sellers: 2, buyers: 1, enquiries: 1, transactions: 1 });
  const analytics = getAdministratorAnalytics();
  assert.equal(analytics.listingStatus.find(item => item.label === "Approved").value, 6);
  assert.deepEqual(analytics.transactionStages, [{ label: "Interest Expressed", value: 1 }]);
  assert.equal(analytics.enquiryTrends.reduce((sum, item) => sum + item.value, 0), 1);
  const listing = getPublicMarketplace().listings.find(item => item.id === "P-15");
  assert.equal(listing.circle, "Boko");
  assert.equal(listing.listingId, "public-p15");
  assert.deepEqual(readFileSync(path), before);
});

test("buyer progress aggregates the latest mark per category and isolates profiles", () => {
  const buyer = registerBuyer({ displayName: "Review Demo Buyer", mobile: "0000098765", email: "", district: "Jorhat", buyerType: "Individual" });
  saveBuyerCheck(buyer, "P-15", "ownership", "Completed");
  saveBuyerCheck(buyer, "P-15", "encumbrances", "Completed");
  saveBuyerCheck(buyer, "P-15", "ownership", "In Progress");
  saveBuyerCheck(buyer, "P-14", "ownership", "Completed");
  const before = readFileSync(path);
  const progress = getBuyerVerificationOverview(buyer);
  assert.equal(progress.find(item => item.parcelId === "P-15").completed, 1);
  assert.equal(progress.find(item => item.parcelId === "P-15").touched, 2);
  assert.equal(progress.find(item => item.parcelId === "P-14").completed, 1);
  assert.deepEqual(getBuyerVerificationOverview("unrelated-buyer"), []);
  assert.ok(progress.every(item => !Number.isNaN(Date.parse(item.updatedAt))));
  assert.deepEqual(readFileSync(path), before);
});
