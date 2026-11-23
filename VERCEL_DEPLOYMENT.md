# BhuSutra — isolated Vercel public demonstration

## Production diagnosis

The existing source at commit `b5b2f65f1f048c4369091a75bcc7efc299b715bb` is the full local application. GitHub reports a successful Vercel deployment check for that commit. The repository default branch is `main`. The dedicated publication branch is `vercel-public-demo`. It preserves `main` and carries the isolated public demonstration.

The supplied Production URL returned HTTP 500 during this investigation, with a Next.js error digest and no public-demo banner. The old homepage calls `getPublicMarketplace()`, which calls SQLite-backed `getApprovedListings()`. Its store can create directories, initialize SQLite and seed an absent store. Account sessions also depend on a local signing-key sidecar. These are incompatible with the intended filesystem-independent public demonstration.

**Runtime-log limitation:** no authenticated Vercel log connection is available in this session. The dashboard URL obtained from GitHub is access-controlled. The exact deployed exception and the deployment's Source branch cannot be independently confirmed from the public error digest. Inspect Vercel → deployment → Source and Runtime Logs before final diagnosis; an HTTP error digest is not a stack trace. Do not upload secrets or copy the local database to solve this error.

## Build separation

`BHUSUTRA_PUBLIC_DEMO=1` changes Next.js page extensions to `demo.tsx`. Only the public root layout, public catch-all page, public error and not-found entries become routes. Original local route handlers, layouts, signed sessions, server actions and account dashboards are excluded from the public route graph. A separate TypeScript configuration avoids mixing the two generated route type sets. Vercel builds fail closed if public mode is absent.

The public build uses a curated snapshot: the same 17 synthetic parcel geometries across Jorhat, Kamrup and Dibrugarh, plus four publication fixtures (P-01, P-02, P-03 and P-15). P-15's snapshot price is ₹250,000. These are presentation fixtures with `public-P-*` identifiers, never a database/account/history export. Snapshot approval means demo marketplace publication, never Government verification.

Buyer, seller, administrator, checklist, enquiry, notification and transaction previews run in tab memory. Navigation retains tab activity; refresh clears it. No registration, cookies, local storage, server-side persistence, actual administrator role, personal contact disclosure or messages are provided. The administrator screen is a public presentation, not an administrative endpoint. The original local application remains functional with the flag unset.

## Vercel configuration — existing project

1. Use the approved `vercel-public-demo` branch and its published commit. Do not merge it into `main`. In the existing Vercel project, open **Settings → Environments → Production → Branch Tracking**, set the production branch to `vercel-public-demo`, and save.
2. Verify the connected GitHub repository is `Arjun123365/BhuSutra-Assam-Land-Marketplace`. In **Deployments → Create Deployment**, enter the `vercel-public-demo` Git reference, verify its approved commit, select Production where offered, then create the deployment. Alternatively open the new branch deployment and select **Redeploy → Production**. Do not redeploy the old `main` commit.
3. Framework preset: **Next.js**. Root Directory: repository root. Node.js: **24.x**. Package manager: npm. Install: `npm ci`. Build: `npm run build:public`. Output Directory: default `.next`; do not use static export or a custom output directory.
4. Set `BHUSUTRA_PUBLIC_DEMO=1` for Production and Preview, at build and runtime. `vercel.json` also supplies it. No secret is needed. Remove database paths, private admin/switch keys, local unlock flags and local environment values from Vercel. Never upload `.env` or `.bhusutra-demo`.
5. Redeploy the approved commit **without the old build cache**. A successful deployment of the old commit cannot include the repair.
6. Confirm the public-demo banner, 17 parcels, 4 snapshot listings and offline map. Confirm `/buyer/switch`, `/seller/switch` and `/admin/access` return 404. Public workspace links are safe simulated presentations only.
7. Use the free `vercel.app` hostname. No database, paid add-on or tile service is needed. Confirm eligibility for the Hobby plan's current personal/non-commercial terms; public challenge demonstrations do not automatically establish eligibility. Do not add paid services.

Official references: [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Hobby plan](https://vercel.com/docs/plans/hobby), [page extensions](https://nextjs.org/docs/app/api-reference/config/next-config-js/pageExtensions).

## Local production preview

Use a separate PowerShell terminal. No private keys or local unlock configuration are needed.

```powershell
Set-Location D:\BhuSutra
$env:BHUSUTRA_PUBLIC_DEMO = '1'
npm run build:public
npm run start -- --port 3100
```

Open `http://localhost:3100`. To return to the full local application, stop this server, remove the flag and rebuild/restart the local app:

```powershell
Remove-Item Env:BHUSUTRA_PUBLIC_DEMO -ErrorAction SilentlyContinue
npm run dev
```

The two modes share `.next`; do not build different modes concurrently. No database migration is required by public mode.

## Preview routes

`/`, `/explore`, `/explore?parcel=P-15`, `/explore/parcels/P-15`, `/verify-records?parcel=P-15`, `/buyer/dashboard`, `/seller/dashboard`, `/seller/list-property`, `/admin/dashboard`, `/buyer/transactions`, `/buyer/notifications`.

The existing marketplace listing buttons use public fixture IDs and lead to browser simulation. The download is a clearly watermarked plain-text demo summary. Original authenticated reports and private detail URLs are unavailable publicly.

## Validation and preservation

- ESLint: passed without warnings. Original local-mode TypeScript and production build: passed. Public-mode production build and its separate TypeScript check: passed.
- Original regression suite: 56 tests passed using isolated test databases; the deferred seller-withdrawal test remains excluded.
- Public-specific unit/build checks: 6 tests (snapshot, duplicates, state transitions, checklist isolation, route separation, empty server-action manifest and clean function traces).
- Production Chrome smoke runner: 84 assertions, including all 17 record associations, offline district maps, simulated enquiry/response/listing review/assistance/checklist, blocked private routes/actions, refresh reset and 1440/1280/390/320px layouts. External requests blocked; none were made.
- Public build has zero registered server actions. No database or signing file was created by the production smoke tests. Original SQLite SHA-256 remained `37D6531D6521F78EAE70F5216AC7A937CE864BC18145FD76E6E69A7E6F20EB65`.
- The live deployment artifact cannot be inspected without Vercel access. Only the newly prepared build can be audited locally. `.vercelignore` and output tracing exclusions defend against local private-file uploads; Git ignore rules continue excluding databases, keys, generated output and environment files.

Run `npm run lint`, `npm run typecheck` (local mode), `npm run test:regression`, `npm run build:public`, then `npm run test:public-demo`. Public build performs its own TypeScript check. Optional `scripts/test-public-browser.mjs` uses an independently installed Playwright selected with `BHUSUTRA_PLAYWRIGHT_MODULE`; no new app dependency is installed.

## Files changed

Modified: `README.md`, `next.config.ts`, `package.json`, `package-lock.json`.

Added: `.vercelignore`, `vercel.json`, `tsconfig.public.json`, `VERCEL_DEPLOYMENT.md`, `scripts/build-public-demo.mjs`, `scripts/audit-public-build.mjs`, `scripts/test-public-browser.mjs`, `src/lib/public-demo.ts`, `src/components/public-demo-workspace.tsx`, `src/app/layout.demo.tsx`, `src/app/error.demo.tsx`, `src/app/not-found.demo.tsx`, `src/app/[[...path]]/page.demo.tsx`, `src/app/public-demo.css`, `tests/public-demo.test.mjs`.

## Limitations

The public snapshot is not synchronized to the local SQLite database. Existing private sellers, buyers, enquiries, approvals and histories remain only on the original laptop. Public simulation is deliberately simplified and cannot substitute for role authorization, durable audit history, legal review or production authentication. There are no Government integrations, payments or ownership transfers. Refresh resets all simulated activity. Publication of this branch does not prove the live website works. Production must be tested after redeployment; no manual Vercel deployment is performed by the preparation scripts.

BhuSutra is an NESFIC demonstration prototype using synthetic data. It is not an official Government land-record portal and does not certify legal title or transaction eligibility.

## Shared workspace UI and About page

The public demo now uses the original local registration, listing wizard, buyer/seller/admin dashboard views, due-diligence view, parcel/verification page content, transaction detail/progress views and administrator review/coordination views. Local wrappers retain their signed sessions, database access, existing server actions and authorisation. Public adapters use fictional presentation profiles and browser-memory records only. The public and local applications both provide `/about` using the same component.

| Area | Public demonstration behaviour |
| --- | --- |
| Home and Explore Land | Shared original layout, six labelled snapshot cards, all 17 geometries, working filters and offline maps |
| Buyer and seller registration | Original field layouts and validation; creates/updates only a fictional tab-local persona |
| Buyer dashboard | Shared metrics, profile card, due-diligence progress, enquiries, responses and assistance list |
| Seller dashboard | Shared metrics, listing status groups, audit, enquiry and assistance sections |
| Listing submission | Shared three-step wizard; save/resume draft, consent, duplicate reservation and simulated review |
| Parcel and verification | Shared record sections, source badges and eight buyer status controls; official checks stay unavailable |
| Transaction assistance | Original participant actions, preparation gates, progress tracker, checklist and history; tab-local only |
| Administrator | Matching command-centre charts, review queue/table, review checklist/map, coordination monitoring and follow-ups; no privileged server writes |
| Notifications | Mark browser-generated notifications read; no external messages |
| About | Shared vision, mission, modules, workflows, geographic scope, technology, benefits, prototype status, roadmap, NESFIC context, GitHub link and disclaimers |

Intentional differences: public values use new fictional fixtures rather than exporting local profiles or history; public tools require JavaScript and reset on refresh; local authentication/unlock/switching tools remain unavailable publicly; downloaded public reports are watermarked plain-text summaries rather than the local persisted-record reports. Homepage snapshot counts do not change with browser activity; workspace totals reflect the current tab. No Government verification, financial transaction or ownership transfer is performed.

Validation scripts: `npm run test:regression` includes 62 isolated tests; `npm run test:workspaces` covers six browser-adapter policy tests. `scripts/test-full-workspace-parity.mjs` builds an isolated public production copy, exercises browser journeys, and captures desktop/mobile comparisons in `output/full-workspace-parity/`. Protected local screens use a new disposable synthetic reference store and fresh test keys, never copies of original accounts, sessions or keys. Public local screens can also be compared directly with localhost:3000. The output folder, reference databases, keys and screenshots are ignored and must not be committed.

Final workspace validation: ESLint and local TypeScript passed; the isolated public production build and its TypeScript check passed. All 62 regression tests, 12 public-mode unit/build checks, 140 production browser assertions and 339 screenshot/structure assertions passed. The comparison covers 18 page pairs at 1280px and 390px, with additional public responsive checks at 1440px, 1280px, 390px and 320px. A labelled local comparison gallery is generated at `output/full-workspace-parity/index.html` and remains uncommitted. The original SQLite SHA-256 is unchanged, P-15 remains Approved, and the public artifact contains zero server actions with no private database/key/environment file traces.
