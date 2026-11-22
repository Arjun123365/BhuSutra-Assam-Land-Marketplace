import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const flightBundles = [
  "react-server-dom-turbopack",
  "react-server-dom-turbopack-experimental",
  "react-server-dom-webpack",
  "react-server-dom-webpack-experimental",
];

// Mirrors the missing error/abort guards proposed in react/react#37563.
// An unfinished track has no usable end timestamp and cannot form a measure.
export function patchFlightPerformance(source) {
  let changes = 0;
  const branches = [
    { prefix: /error = root\.reason;\s+if \(supportsUserTiming/, end: "childrenEndTime$jscomp$1" },
    { prefix: /childrenEndTime\$jscomp\$3 = childrenEndTime;\s+if \(supportsUserTiming/, end: "childrenEndTime$jscomp$3" },
  ];
  for (const branch of branches) {
    const match = source.match(branch.prefix);
    if (!match) throw new Error("RSC performance patch no longer matches this Next.js bundle. Review the upstream fix before updating the patch.");
    const offset = match.index + match[0].length;
    const guard = " && 0 <= " + branch.end;
    if (source.slice(offset).startsWith(guard + ")")) continue;
    if (!source.slice(offset).startsWith(") {")) throw new Error("Unexpected RSC performance guard.");
    source = source.slice(0, offset) + guard + source.slice(offset);
    changes += 1;
  }
  return { source, changes };
}

export function applyFlightPerformancePatch(projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")) {
  const nextRoot = join(projectRoot, "node_modules", "next");
  const version = JSON.parse(readFileSync(join(nextRoot, "package.json"), "utf8")).version;
  if (version !== "16.4.6") throw new Error("Review the RSC performance patch for Next.js " + version + " before changing the pinned framework version.");
  // Validate every target before changing any installed bundle.
  const plan = flightBundles.map(bundle => {
    const file = join(nextRoot, "dist", "compiled", bundle, "cjs", bundle.replace("-experimental", "") + "-client.browser.development.js");
    return { file, ...patchFlightPerformance(readFileSync(file, "utf8")) };
  });
  for (const item of plan) {
    if (item.changes) writeFileSync(item.file, item.source);
  }
  return plan.reduce((sum, item) => sum + item.changes, 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = applyFlightPerformancePatch();
  process.stdout.write("Next.js RSC timing guards ready (" + count + " guards updated).\n");
}
