import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { demoMapNotice, paintDemoMapTile } from "../src/lib/demo-map-background.ts";
import { demoParcels, parcelHref, parcelRecordHref } from "../src/lib/demo-marketplace.ts";

function paint(x, y) {
  const operations = [];
  const context = new Proxy({}, {
    set(target, key, value) { operations.push([key, value]); return Reflect.set(target, key, value); },
    get(target, key) { return target[key] ?? ((...values) => operations.push([key, ...values])); },
  });
  paintDemoMapTile(context, 256, x, y);
  return operations;
}

test("offline map paints original field artwork without images or network access", () => {
  const operations = paint(1024, 512);
  assert.equal(operations.filter(([name]) => name === "fillRect").length, 17);
  assert.equal(operations.filter(([name]) => name === "strokeRect").length, 16);
  assert.ok(operations.some(([name]) => name === "lineTo"));
  assert.ok(!operations.some(([name]) => name === "drawImage"));
  for (const operation of operations) for (const value of operation.slice(1)) {
    if (typeof value === "number") assert.ok(Number.isFinite(value));
  }
  assert.match(demoMapNotice, /not an official cadastral map/);
});

test("offline artwork is deterministic through panning, wrapping and negative tile coordinates", () => {
  for (const [x, y] of [[0, 0], [-1, -12], [65535, 65535]]) {
    const operations = paint(x, y);
    assert.deepEqual(operations, paint(x, y));
    assert.ok(operations.filter(([name]) => name === "fillStyle").every(([, color]) => /^#[a-f0-9]{6}$/.test(color)));
  }
});

test("every preserved parcel has valid geometry, district/circle membership and stable navigation", () => {
  assert.equal(demoParcels.length, 17);
  assert.equal(new Set(demoParcels.map(({ id }) => id)).size, 17);
  for (const district of ["Jorhat", "Kamrup", "Dibrugarh"]) {
    const parcels = demoParcels.filter(parcel => parcel.district === district);
    assert.ok(parcels.length >= 3);
    for (const parcel of parcels) {
      assert.ok(parcel.circle);
      assert.equal(parcel.feature.properties.parcelId, parcel.id);
      const ring = parcel.feature.geometry.coordinates[0];
      assert.deepEqual(ring[0], ring.at(-1));
      assert.ok(ring.every(([lng, lat]) => lng > 90 && lng < 97 && lat > 25 && lat < 29));
      assert.equal(parcelHref(parcel.id), `/explore?parcel=${parcel.id}`);
      assert.equal(parcelRecordHref(parcel.id), `/explore/parcels/${parcel.id}`);
    }
  }
});

test("all application map surfaces remain independent of external tile services", () => {
  function files(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
  }
  for (const file of files("src").filter(file => /\.(tsx?|css)$/.test(file))) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /tile\.openstreetmap\.org|<TileLayer\b|\btileLayer\(/, file);
  }
  const map = readFileSync("src/components/parcel-map.tsx", "utf8");
  assert.match(map, /<OfflineDemoBasemap/);
  assert.match(map, /<GeoJSON/);
  assert.match(map, /focusRequest/);
  const layer = readFileSync("src/components/offline-demo-basemap.tsx", "utf8");
  assert.match(layer, /artwork\.remove\(\)/);
  assert.doesNotMatch(layer, /fetch\(|new Image\(/);
});
