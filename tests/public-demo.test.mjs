import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "./demo-marketplace") return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { publicParcels, publicListings, emptyPublicState, updatePublicDemo } = await import("../src/lib/public-demo.ts");

test("public snapshot preserves 17 stable parcels, three districts and approved P-15", () => {
  assert.equal(publicParcels.length, 17);
  assert.deepEqual([...new Set(publicParcels.map(p => p.district))].sort(), ["Dibrugarh", "Jorhat", "Kamrup"]);
  assert.equal(publicListings.length, 4);
  assert.equal(publicListings.find(p => p.id === "P-15").price, 250000);
  assert.ok(publicListings.every(p => p.voluntaryConsent && p.listingId.startsWith("public-P-")));
});
test("simulated interest prevents duplicates and rejects unpublished parcels", () => {
  const state = updatePublicDemo(emptyPublicState, { type: "interest", parcelId: "P-15" }, "test");
  assert.deepEqual(state.enquiries, ["P-15"]);
  assert.equal(updatePublicDemo(state, { type: "interest", parcelId: "P-15" }, "test"), state);
  assert.equal(updatePublicDemo(state, { type: "interest", parcelId: "P-16" }, "test"), state);
  assert.deepEqual(emptyPublicState.enquiries, []);
});
test("simulation enforces request and listing prerequisites with immutable history", () => {
  let state = emptyPublicState;
  assert.equal(updatePublicDemo(state, { type: "advance" }, "test"), state);
  assert.equal(updatePublicDemo(state, { type: "approve" }, "test"), state);
  for (const type of ["draft", "submit", "approve", "start", "advance", "cancel"]) state = updatePublicDemo(state, { type }, "test");
  assert.equal(state.approved, true);
  assert.equal(state.transactions["P-15"], -1);
  assert.equal(state.events.length, 6);
  assert.equal(updatePublicDemo(state, { type: "advance" }, "test"), state);
});
test("buyer checklist progress and responses do not mutate parcel or official records", () => {
  let state = updatePublicDemo(emptyPublicState, { type: "check", parcelId: "P-15", checkId: "ownership" }, "test");
  assert.deepEqual(state.checks["P-15"], ["ownership"]);
  state = updatePublicDemo(state, { type: "check", parcelId: "P-15", checkId: "ownership" }, "test");
  assert.deepEqual(state.checks["P-15"], []);
  assert.equal(updatePublicDemo(state, { type: "respond" }, "test"), state);
  assert.equal(publicListings.length, 4);
});
test("public entry points import no database, sessions or server actions", () => {
  const files = ["src/app/layout.demo.tsx", "src/app/[[...path]]/page.demo.tsx", "src/components/public-demo-workspace.tsx", "src/lib/public-demo.ts"];
  for (const file of files) assert.doesNotMatch(readFileSync(file, "utf8"), /node:sqlite|node:fs|seller-store|buyer-store|seller-session|buyer-session|admin-session|use server/);
  const config = readFileSync("next.config.ts", "utf8");
  assert.match(config, /\["demo\.tsx"\]/);
  assert.match(config, /Vercel requires BHUSUTRA_PUBLIC_DEMO=1/);
  assert.match(readFileSync(files[1], "utf8"), /\["switch", "access", "report"\]/);
});
test("public build has no registered server actions or private filesystem traces", () => {
  if (!existsSync(".next/server/server-reference-manifest.json")) return;
  // Run immediately after build:public; the separate local build can have actions.
  const routes = JSON.parse(readFileSync(".next/server/app-paths-manifest.json"));
  if (!routes["/[[...path]]/page"]) return;
  const actions = JSON.parse(readFileSync(".next/server/server-reference-manifest.json"));
  assert.equal(Object.keys(actions.node).length, 0);
  assert.equal(Object.keys(actions.edge).length, 0);
  const trace = readFileSync(".next/server/app/[[...path]]/page.js.nft.json", "utf8");
  assert.doesNotMatch(trace, /\.bhusutra-demo|\.sqlite|\.session-key|seller-store|buyer-store/);
});
