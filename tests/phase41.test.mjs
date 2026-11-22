import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, rmdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "next/headers") return { url: "data:text/javascript,export const cookies = async () => new Map()", shortCircuit: true };
    if (specifier === "next/navigation") return nextResolve("next/navigation.js", context);
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) {
      return nextResolve(specifier + ".ts", context);
    }
    return nextResolve(specifier, context);
  },
});

const temporary = mkdtempSync(join(tmpdir(), "bhusutra-verification-"));
const path = join(temporary, "test.sqlite");
process.env.BHUSUTRA_DEMO_DB = path;
const { demoParcels, demoDistricts } = await import("../src/lib/demo-marketplace.ts");
const { getVerificationRecord } = await import("../src/lib/verification-service.ts");
const { demonstrationReportWatermark, getParcelVerification } = await import("../src/lib/verification-model.ts");
const { GET } = await import("../src/app/verify-records/report/[parcelId]/route.ts");
const { withDatabase } = await import("../src/lib/seller-store.ts");
const { emptyListingDetails } = await import("../src/lib/seller-demo.ts");

after(() => {
  rmSync(path, { force: true });
  rmdirSync(temporary);
});

test("all 17 synthetic parcels use the disconnected provider without initialising storage", async () => {
  assert.deepEqual(demoDistricts, ["Dibrugarh", "Jorhat", "Kamrup"]);
  assert.equal(new Set(demoParcels.map(({ id }) => id)).size, 17);
  for (const { id, district, circle, dagNumber, pattaNumber } of demoParcels) {
    const { parcel, records } = await getVerificationRecord(id);
    assert.deepEqual([parcel.id, parcel.district, parcel.circle, parcel.dagNumber, parcel.pattaNumber], [id, district, circle, dagNumber, pattaNumber]);
    const { checks, missingChecks } = getParcelVerification(parcel, records);
    assert.equal(checks.length, 8);
    assert.equal(missingChecks, checks.length);
    assert.ok(checks.every(({ result }) => result.status === "not-connected" && !("value" in result) && !("checkedAt" in result)));
  }
  assert.equal(existsSync(path), false);
});

test("report downloads show public P-15 declarations only and leave SQLite unchanged", async () => {
  withDatabase((db) => {
    const insert = db.prepare("INSERT INTO listings VALUES (?, 'demo-seeded-seller', ?, ?, ?, ?, ?, 0, ?, ?)");
    const date = "2026-11-18T04:00:00Z";
    const details = { ...emptyListingDetails, declaration: true, consent: true, askingPrice: "2200000" };
    insert.run("public-p15", "P-15", "Approved", date, date, date, JSON.stringify(details), "Public listing");
    insert.run("private-p14", "P-14", "Draft", date, date, null, JSON.stringify({ ...details, askingPrice: "1900000" }), "Private draft");
  });
  const databaseBefore = readFileSync(path);
  const download = (id) => GET(new Request("http://localhost/verify-records/report/" + id), { params: Promise.resolve({ parcelId: id }) });
  const response = await download("P-15");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="bhusutra-P-15-demo-verification.html"');
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const body = await response.text();
  for (const label of [demonstrationReportWatermark, "Synthetic demonstration data", "Seller-declared information", "Official Government records", "Buyer due diligence", "DEMO-D15", "DEMO-P15", "2.4 bigha", "₹22 lakh", "8 of 8 checks unavailable"]) {
    assert.ok(body.includes(label), label);
  }
  assert.doesNotMatch(body, /Government-record verified|Last checked|Seeded Demo Seller|0000000000/);
  const unlisted = await (await download("P-14")).text();
  assert.match(unlisted, /No active seller listing/);
  assert.doesNotMatch(unlisted, /₹19 lakh|Private draft/);
  const flagged = await (await download("P-07")).text();
  assert.match(flagged, /Synthetic restriction flag<\/strong> · Illustrative access review is an illustrative demo flag/);
  assert.equal((await download("unknown")).status, 404);
  assert.deepEqual(readFileSync(path), databaseBefore);
});
