import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { flightBundles, patchFlightPerformance } from "../scripts/patch-rsc-performance.mjs";

for (const bundle of flightBundles) {
  test(bundle + " rejects unfinished timings and preserves valid measurements", () => {
    const file = join("node_modules", "next", "dist", "compiled", bundle, "cjs", bundle.replace("-experimental", "") + "-client.browser.development.js");
    const installed = readFileSync(file, "utf8");
    const original = installed.replace(/ && 0 <= childrenEndTime\$jscomp\$(?:1|3)(?=\) \{)/g, "");
    const patched = patchFlightPerformance(original);
    assert.equal(patched.changes, 2);
    assert.equal(patchFlightPerformance(patched.source).changes, 0);
    for (const [name, endName, prefix] of [
      ["SellerDashboardPage", "childrenEndTime$jscomp$1", /error = root\.reason;\s+if \(([^\n]+)\) \{/],
      ["SellerTransactionsPage", "childrenEndTime$jscomp$3", /childrenEndTime\$jscomp\$3 = childrenEndTime;\s+if \(([^\n]+)\) \{/],
    ]) {
      const guard = patched.source.match(prefix)?.[1];
      assert.ok(guard);
      const record = new Function("supportsUserTiming", endName, "emit", "if (" + guard + ") emit();");
      assert.throws(() => performance.measure(name, { start: 0, end: -Infinity }));
      for (const invalidEnd of [-Infinity, -25, NaN]) {
        record(true, invalidEnd, () => { throw new Error("Unfinished timing must not be emitted"); });
      }
      for (const validEnd of [0, 12]) {
        let measured = false;
        record(true, validEnd, () => {
          const entry = performance.measure(name, { start: 0, end: validEnd });
          assert.equal(entry.duration, validEnd);
          measured = true;
          performance.clearMeasures(name);
        });
        assert.equal(measured, true);
      }
    }
  });
}

test("a changed framework bundle fails visibly instead of silently applying an unrelated patch", () => {
  assert.throws(() => patchFlightPerformance("unrelated code"), /no longer matches/);
});
