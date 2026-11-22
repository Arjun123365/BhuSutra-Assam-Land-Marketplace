import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmdirSync, unlinkSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";

function installSourceLoader(register) {
  // Node runs the source directly in tests. Next enforces server-only in the app.
  register({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
      if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) {
        return nextResolve(specifier + ".ts", context);
      }
      return nextResolve(specifier, context);
    },
  });
}
installSourceLoader(registerHooks);

const temp = mkdtempSync(join(tmpdir(), "bhusutra-phase32-"));
const database = join(temp, "legacy.sqlite");
process.env.BHUSUTRA_DEMO_DB = database;
const { emptyListingDetails } = await import("../src/lib/seller-demo.ts");
const { demoParcels, getActiveListing } = await import("../src/lib/demo-marketplace.ts");
const details = {
  ...emptyListingDetails, askingPrice: "1900000", description: "Fictional parcel and sale declaration.",
  declaration: true, consent: true, acknowledgePending: true, acknowledgeRestriction: true,
};

const legacy = new DatabaseSync(database);
legacy.exec(`
  CREATE TABLE sellers (
    id TEXT PRIMARY KEY, displayName TEXT NOT NULL, mobile TEXT NOT NULL, email TEXT NOT NULL,
    district TEXT NOT NULL, sellerType TEXT NOT NULL, registeredAt TEXT NOT NULL
  );
  CREATE TABLE listings (
    id TEXT PRIMARY KEY, sellerId TEXT NOT NULL REFERENCES sellers(id), parcelId TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Draft','Submitted','Under Review','Approved','Rejected','Withdrawn')),
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, submittedAt TEXT, seeded INTEGER NOT NULL,
    details TEXT NOT NULL, title TEXT NOT NULL
  );
  CREATE UNIQUE INDEX one_active_listing_per_parcel ON listings(parcelId)
    WHERE status IN ('Draft','Submitted','Under Review','Approved');
  CREATE TABLE listing_audit (
    id INTEGER PRIMARY KEY, listingId TEXT NOT NULL REFERENCES listings(id),
    event TEXT NOT NULL, recordedAt TEXT NOT NULL
  );
`);
const date = "2026-11-16T22:00:00.000Z";
legacy.prepare("INSERT INTO sellers VALUES (?, ?, ?, ?, ?, ?, ?)")
  .run("legacy-seller", "Fictional Legacy Seller", "0000012345", "", "Jorhat", "Individual", date);
legacy.prepare("INSERT INTO listings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
  .run("legacy-listing", "legacy-seller", "P-04", "Submitted", date, date, date, 0, JSON.stringify(details), "");
legacy.prepare("INSERT INTO listing_audit VALUES (?, ?, ?, ?)").run(99, "legacy-listing", "Phase 3.1 audit event", date);
legacy.close();

const store = await import("../src/lib/seller-store.ts");
const { getPublicMarketplace } = await import("../src/lib/public-marketplace.ts");
const policy = await import("../src/lib/admin-policy.ts");
const filters = { query: "", district: "", circle: "", status: "", date: "", sort: "newest", page: 1 };
const seller = "legacy-seller";
const administratorId = policy.demoAdministratorId;

function listingFor(parcelId) {
  return store.getSellerDashboard(seller).listings.find(listing => listing.parcelId === parcelId);
}
function decide(id, decision, extra = {}) {
  return store.recordAdminDecision({ id, decision, administratorId, remarks: "", acknowledgeRestriction: false, restrictionRemarks: "", ...extra });
}
function submit(parcelId, input = details) {
  store.saveListing({ sellerId: seller, parcelId, draftId: "", submit: true, details: input });
  return listingFor(parcelId).id;
}

after(() => {
  unlinkSync(database);
  rmdirSync(temp);
});

test("Phase 3.1 migration preserves existing requests, audit IDs, seeded listings and 17 parcels", () => {
  assert.equal(listingFor("P-04").id, "legacy-listing");
  assert.equal(store.getAdminReview("legacy-listing").events[0].id, 99);
  assert.equal(store.getReviewCounts().total, 4);
  assert.equal(store.getReviewCounts().statuses.get("Submitted"), 1);
  assert.equal(store.getReviewCounts().statuses.get("Approved"), 3);
  assert.equal(demoParcels.length, 17);
  assert.deepEqual(getPublicMarketplace().listings.map(listing => listing.id), ["P-01", "P-02", "P-03"]);
  const db = new DatabaseSync(database, { readOnly: true });
  assert.equal(db.prepare("PRAGMA user_version").get().user_version, 1);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  db.close();
});

test("queue combines district, circle, status, IST date and search filters and sorts", () => {
  const find = { ...filters, query: "demo-d04", district: "Jorhat", circle: "Teok", status: "Submitted", date: "2026-11-17" };
  assert.deepEqual(store.getReviewQueue(find).rows.map(row => row.id), ["legacy-listing"]);
  assert.equal(store.getReviewQueue({ ...find, circle: "Mariani" }).total, 0);
  assert.equal(store.getReviewQueue({ ...find, date: "2026-11-16" }).total, 0);
  assert.equal(store.getReviewQueue({ ...filters, sort: "price-high" }).rows[0].id, "seed-P-03");
});

test("invalid transitions and missing consent or remarks fail without changing status", () => {
  assert.throws(() => decide("legacy-listing", "Approved", { remarks: "Demo only" }), /current listing status/);
  decide("legacy-listing", "Under Review");
  for (const status of ["Approved", "Rejected", "Clarification Required"]) {
    assert.throws(() => decide("legacy-listing", status, { remarks: "  " }), /decision remarks/);
  }
  assert.equal(store.getAdminReview("legacy-listing").listing.status, "Under Review");
  const id = submit("P-16", { ...details, consent: false });
  decide(id, "Under Review");
  assert.throws(() => decide(id, "Approved", { remarks: "Demo only" }), /Voluntary listing consent/);
});

test("clarification reserves the parcel, accepts only its seller's response and audits resubmission", () => {
  decide("legacy-listing", "Clarification Required", { remarks: "Describe the demo sale." });
  assert.equal(store.getReviewCounts().statuses.get("Clarification Required"), 1);
  assert.throws(() => submit("P-04"), /active demo listing request/);
  assert.throws(() => submit("P-01"), /approved demo listing/);
  assert.throws(() => store.resubmitClarification("other-seller", "legacy-listing", "Fictional response."), /unavailable/);
  assert.throws(() => store.resubmitClarification(seller, "legacy-listing", " "), /clarification response/);
  store.resubmitClarification(seller, "legacy-listing", "Whole parcel for the demo.");
  assert.equal(listingFor("P-04").status, "Submitted");
  const event = store.getAdminReview("legacy-listing").events[0];
  assert.equal(event.previousStatus, "Clarification Required");
  assert.equal(event.sellerResponse, "Whole parcel for the demo.");
  assert.throws(() => store.resubmitClarification(seller, "legacy-listing", "Duplicate response"), /unavailable/);
});

test("flag acknowledgement and extra remarks gate approval, publication and seller withdrawal", () => {
  const id = submit("P-07");
  assert.equal(getPublicMarketplace().counts.activeListings, 3);
  decide(id, "Under Review");
  assert.throws(() => decide(id, "Approved", { remarks: "Demo only" }), /acknowledge/i);
  assert.throws(() => decide(id, "Approved", { remarks: "Demo only", acknowledgeRestriction: true }), /additional review remarks/i);
  decide(id, "Approved", { remarks: "Demo marketplace only.", acknowledgeRestriction: true, restrictionRemarks: "Synthetic access review considered." });
  const published = getPublicMarketplace();
  assert.equal(published.counts.activeListings, 4);
  assert.equal(getActiveListing(published.parcels.find(parcel => parcel.id === "P-07")).price, 1900000);
  const event = store.getAdminReview(id).events[0];
  assert.equal(event.actorId, administratorId);
  assert.equal(event.restrictionRemarks, "Synthetic access review considered.");
  store.withdrawListing(seller, id);
  assert.equal(listingFor("P-07").status, "Withdrawn");
  assert.equal(getPublicMarketplace().counts.activeListings, 3);
});

test("rejected requests stay private and decisions persist across independent process startup", () => {
  const id = submit("P-15");
  decide(id, "Under Review");
  decide(id, "Rejected", { remarks: "Fictional rejection for the demonstration." });
  assert.equal(getPublicMarketplace().listings.some(listing => listing.id === "P-15"), false);
  const program = [
    'import { registerHooks } from "node:module";',
    installSourceLoader.toString(), "installSourceLoader(registerHooks);",
    'const store = await import("./src/lib/seller-store.ts");',
    "const review = store.getAdminReview(" + JSON.stringify(id) + ");",
    "console.log(JSON.stringify([review.listing.status, review.events[0].remarks, store.getApprovedListings().length]));",
  ].join("\n");
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", program], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ["Rejected", "Fictional rejection for the demonstration.", 3]);
});

test("demo access is opt-in, production rejects it, and sessions require an unexpired signature", () => {
  const key = "fictional test key for local test only", now = 10000;
  const env = { BHUSUTRA_DEMO_ADMIN: "1", BHUSUTRA_DEMO_ADMIN_KEY: key };
  assert.equal(policy.demoAdminKey({ ...env, NODE_ENV: "production" }), undefined);
  assert.equal(policy.demoAdminKey({ NODE_ENV: "development", BHUSUTRA_DEMO_ADMIN_KEY: key }), undefined);
  assert.equal(policy.demoAdminKey({ ...env, NODE_ENV: "development" }), key);
  assert.equal(policy.matchesAdminKey("wrong", key), false);
  const token = policy.signAdminSession(key, now + 60);
  assert.equal(policy.validAdminSession("", key, now), false);
  assert.equal(policy.validAdminSession(administratorId, key, now), false);
  assert.equal(policy.validAdminSession(token, key + " rotated", now), false);
  assert.equal(policy.validAdminSession(token, key, now + 61), false);
  assert.equal(policy.validAdminSession(token, key, now), true);
});
