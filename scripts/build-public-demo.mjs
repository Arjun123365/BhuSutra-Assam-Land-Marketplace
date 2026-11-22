import { spawnSync } from "node:child_process";
const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit", env: { ...process.env, BHUSUTRA_PUBLIC_DEMO: "1" },
});
if (result.status !== 0) process.exit(result.status ?? 1);
const audit = spawnSync(process.execPath, ["scripts/audit-public-build.mjs"], { stdio: "inherit" });
process.exit(audit.status ?? 1);
