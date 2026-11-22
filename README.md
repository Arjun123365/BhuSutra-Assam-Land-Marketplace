# BhuSutra (ভূসূত্ৰ)

**Connecting Land. Building Trust.**

A consent-led land marketplace and due-diligence demonstration for Assam, developed for the NESFIC innovation challenge.

> BhuSutra is an NESFIC demonstration prototype using synthetic data. It is not an official Government land-record portal and does not certify legal title or transaction eligibility.

The proposed vision is a Government-verified land marketplace. The current implementation is a local, functional prototype: **no Government database or API is connected, and no Government approval or deployment is claimed**. Marketplace publication approval, buyer checklist completion and transaction coordination are demonstration states.

## Implemented features

- **Public marketplace:** compact responsive homepage, stored-data summary cards, approved demo listings and working search filters.
- **Parcel discovery:** 17 synthetic parcels with stable IDs, district/revenue-circle filters, clickable GeoJSON polygons, map/list synchronisation, zoom/pan, selection highlighting and legends.
- **Self-contained basemap:** original local field-pattern artwork and SVG parcel context views. No external map tiles or API key are required. Boundaries are illustrative, not official cadastral boundaries.
- **Seller workspace:** fictional registration, consent, draft/submission management, duplicate-listing prevention, clarification responses and listing history.
- **Buyer workspace:** fictional registration, approved-listing enquiries, seller responses, status histories and buyer-specific dashboards.
- **Verification and due diligence:** eight official-check categories remain Not connected / Not verified; buyer preparation has separate statuses, audit history, rule-based observations and recommended next steps.
- **Transaction assistance:** persisted coordination requests, validated buyer/seller stages, a preparation checklist, cancellation/closure and activity timelines. No payment, sale agreement or ownership transfer occurs.
- **Administrator workspace:** demo listing review/publication decisions, transaction monitoring, coordination notes/follow-ups, read-only profile/enquiry monitoring, analytics and notifications.
- **Reports:** watermarked downloadable HTML verification and coordination reports. These are not official certificates or legal documents.
- **Development-only profile switching:** separately protected seller/buyer switchers select existing fictional accounts without re-registration.

All notification delivery is in-app; no SMS, email or WhatsApp messages are sent. No Aadhaar, PAN or actual identity-document collection is implemented.

## Demonstration coverage

| District | Revenue circles represented | Synthetic parcels |
| --- | --- | ---: |
| Jorhat | Teok, Mariani | 11 |
| Kamrup | Boko | 3 |
| Dibrugarh | Chabua | 3 |

This is sample coverage, not a claim of official cadastral coverage. Every map displays an illustrative-map notice. Synthetic attributes and seller declarations are separate from unavailable authoritative information.

## Technology and architecture

- Next.js App Router, pinned to **16.4.6**.
- React 19, TypeScript 5.9, Tailwind CSS 4 and application CSS.
- Leaflet 1.9.4 and React-Leaflet 5, loaded on the client.
- Node.js 24 with its built-in `node:sqlite` API; local SQLite persistence and transactional store helpers.
- Next.js Server Actions, signed demo cookies, server-side role/ownership checks and parameterised SQL.
- ESLint and Node's test runner. The optional browser smoke runner uses an already installed Playwright package; it is not an application dependency.

```text
Browser: responsive pages, forms, filters and local parcel map
    |
Next.js server: sessions, authorisation, workflow rules and reports
    |                                  |
Local SQLite workflow records          GovernmentRecordProvider
+ synthetic TypeScript/GeoJSON         (disconnected interface only)
```

## Local setup

Use **Node.js 24 LTS**, npm and an existing checkout. For the proposed GitHub repository, clone `BhuSutra-Assam-Land-Marketplace` using its actual repository URL, then enter the repository directory.

```powershell
npm.cmd ci
npm.cmd run dev -- --hostname localhost --port 3000
```

Open [http://localhost:3000](http://localhost:3000). On macOS/Linux, use `npm` instead of `npm.cmd`.

Use fictional display names, test mobile numbers beginning with `00000` followed by five digits, and optional email addresses ending in `.test`. Do not enter real citizen or landowner information.

### Fresh clone versus an existing installation

The source contains the 17 synthetic parcel definitions. **The working SQLite database, signed sessions, keys and existing account/workflow histories are intentionally not in Git.**

A fresh clone can therefore show empty marketplace counts until its local demo store is initialised through the normal registration workflow. Store initialisation creates the existing synthetic seed fixtures; it does not reproduce another installation's sellers, buyers, enquiries, assistance requests or approvals.

P-15's existing Approved status belongs to the preserved working database on the original installation. It is not hard-coded into the public source or included as a database export. Do not overwrite an existing store to reproduce a presentation.

### Local storage and preservation

By default the application uses `.bhusutra-demo/seller.sqlite`. Buyer and seller sessions are signed using the adjacent `seller.sqlite.session-key` file. Keep the existing database and its signing-key file private and together to preserve records and valid sessions.

`BHUSUTRA_DEMO_DB` selects an alternative SQLite path **before server startup**. Use a separate disposable database for rehearsals; retain the original store unchanged. A missing alternative path may initialise a new demo store through normal workflows. Never point demonstrations at production or personal data.

Do not commit databases, backups, journal/WAL files, cookies, signing keys, private unlock keys or exported account histories.

## Optional local administrator and profile switching

These tools are deliberately disabled unless explicitly configured in **development**. Buyer/seller sessions do not grant administrator access. These shared-key tools are demonstration conveniences, not production authentication.

| Environment variable | Purpose |
| --- | --- |
| `NODE_ENV=development` | Development mode; use `npm run dev`. |
| `BHUSUTRA_DEMO_DB` | Optional private local database-path override. |
| `BHUSUTRA_DEMO_ADMIN=1` | Enable the local administrator gate. |
| `BHUSUTRA_DEMO_ADMIN_KEY` | Separate private administrator unlock key, at least 20 characters. |
| `BHUSUTRA_DEMO_SELLER_SWITCH=1` | Enable the local seller-switch gate. |
| `BHUSUTRA_DEMO_SELLER_SWITCH_KEY` | Separate private seller-switch key, at least 20 characters. |
| `BHUSUTRA_DEMO_BUYER_SWITCH=1` | Enable the local buyer-switch gate. |
| `BHUSUTRA_DEMO_BUYER_SWITCH_KEY` | Separate private buyer-switch key, 20-512 characters. |

Stop the existing server with Ctrl+C in its **original PowerShell terminal** before setting variables there. Another terminal cannot update the environment of an already running server. Retain existing database overrides and keys. Use different private keys for the three tools.

The following optional example asks for hidden input; it never generates or prints a key. It enables all three local tools only when you run it yourself:

```powershell
$env:NODE_ENV = 'development'
$env:BHUSUTRA_DEMO_ADMIN = '1'
$env:BHUSUTRA_DEMO_SELLER_SWITCH = '1'
$env:BHUSUTRA_DEMO_BUYER_SWITCH = '1'

foreach ($demoKeyName in @(
    'BHUSUTRA_DEMO_ADMIN_KEY',
    'BHUSUTRA_DEMO_SELLER_SWITCH_KEY',
    'BHUSUTRA_DEMO_BUYER_SWITCH_KEY'
)) {
    if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($demoKeyName, 'Process'))) {
        $demoSecret = Read-Host "Enter your private $demoKeyName (20-512 characters)" -AsSecureString
        [Environment]::SetEnvironmentVariable(
            $demoKeyName,
            [System.Net.NetworkCredential]::new('', $demoSecret).Password,
            'Process'
        )
        $demoSecret.Dispose()
        Remove-Variable demoSecret
    }
    $demoKeyLength = [Environment]::GetEnvironmentVariable($demoKeyName, 'Process').Length
    if ($demoKeyLength -lt 20 -or $demoKeyLength -gt 512) {
        throw 'Local demo keys must contain 20-512 characters.'
    }
}

npm.cmd run dev -- --hostname localhost --port 3000
```

Do not paste keys into issues, screenshots or source files. The `.gitignore` excludes environment files; no environment file is required for the basic demo.

## Main routes

| Route | Purpose and access |
| --- | --- |
| `/` | Public homepage and featured listings. |
| `/explore` | Public interactive parcel discovery. |
| `/explore/parcels/P-15` | Synthetic P-15 record; public information only unless a buyer session adds its own progress. |
| `/verify-records?parcel=P-15` | Verification categories and the current buyer's preparation workspace. |
| `/seller/register`, `/seller/dashboard`, `/seller/list-property` | Fictional seller entry and seller-scoped workspace. |
| `/buyer/register`, `/buyer/dashboard`, `/buyer/transactions` | Fictional buyer entry and buyer-scoped workflows. |
| `/seller/switch`, `/buyer/switch` | Key-protected, explicitly enabled development tools. |
| `/admin/access`, `/admin/dashboard` | Local demo administrator unlock and protected dashboard. |
| `/admin/listings`, `/admin/transactions` | Protected review and coordination monitoring. |
| `/admin/profiles`, `/admin/enquiries` | Protected, read-only profile/enquiry monitoring. |
| `/buyer/notifications`, `/seller/notifications`, `/admin/notifications` | Role/profile-scoped in-app notifications. |

The switchers select existing fictional profiles without duplicating them. Unlock lasts 15 minutes. Buyer/seller workspace sessions last 30 days; the administrator session lasts one hour. Locking a switcher leaves the selected profile active.

## Testing and build checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:regression
npm.cmd run build
```

Automated store/workflow tests use isolated temporary databases. Do not run destructive tests against your working store. The aggregate suite currently excludes the previously deferred `seller withdrawal` test; do not treat that exclusion as executed coverage.

Focused commands include:

```powershell
npm.cmd run test:buyer-switch
npm.cmd run test:admin-monitoring
npm.cmd run test:maps
npm.cmd run test:runtime-performance
```

For optional headless map checks, supply the path to an **already installed** Playwright package's `index.mjs` in `BHUSUTRA_PLAYWRIGHT_MODULE`, then run `npm.cmd run test:map-browser`. The runner uses installed Chrome by default, or installed Edge with `BHUSUTRA_MAP_BROWSER_CHANNEL=msedge`. It creates an isolated source/database copy and checks the original database hash. That runner expects an existing approved P-15 listing in the source demonstration store, so it is not a fresh-clone fixture. No browser or package is downloaded automatically.

The latest local regression results and Proof-of-Work evidence are generated artifacts and are excluded from publication. The project owner has reported 12/12 planned Phase 7 manual tests passed; this is not an independent certification or a substitute for production security and performance validation.

### Development timing compatibility patch

The pinned Next.js version includes a React development-profiler timing issue during redirected/aborted renders. The auditable [compatibility script](scripts/patch-rsc-performance.mjs) adds valid-end-time guards to the installed development bundles. `postinstall` and `predev` apply it idempotently. It preserves valid measurements and normal application errors. Review and retire the patch when upgrading to a framework release with the upstream correction; the script deliberately fails for an unreviewed Next.js version.

## Security, accuracy and operating limits

- All parcels, profiles and workflow records must remain fictional demonstration data.
- No live Government APIs, official ownership certificates, legal clearances, payments or automatic transfers are implemented.
- A listing's Approved status means demo marketplace publication, not ownership or transaction eligibility certification.
- A completed buyer checklist is self-reported preparation. Unavailable official data is an information gap, not proof of a dispute or encumbrance.
- Signed HttpOnly cookies and server-side actor/ownership checks protect workflow access. Local HTTP, shared demo keys and file-based signing material are not a production identity system.
- The process-local rate limiter is bounded but is not distributed abuse protection. The current CSP is not a complete nonce-based script policy.
- Offline basemap operation does not make the whole application an offline-installable web app; the local Next.js server is still required.
- No production deployment, scale benchmark, uptime guarantee, Government affiliation or independent security certification is claimed.

Before any real-data pilot, obtain the relevant authorisations and review identity, permissions, privacy, hosting, backups, retention, security and licensed map/data access.

## Repository layout

```text
src/app/          App Router pages, server actions, reports and styles
src/components/   Marketplace, map, workspace and monitoring UI
src/lib/          Synthetic parcels, stores, sessions and workflow rules
tests/            Isolated regression, security and rendering tests
scripts/          Development timing patch and optional browser smoke runner
public/           Public static assets
```

`.gitignore` excludes dependencies, build/cache output, environment files, local sessions, keys, SQLite files/sidecars, generated reports/screenshots, logs and backups. Exclusion prevents accidental additions; it is not a substitute for reviewing staged files and commit history.

See [DEMONSTRATION.md](DEMONSTRATION.md) for a safe walkthrough. Do not publish local evidence exports without a separate content review.

## Project status and licence

This repository is prepared as an NESFIC demonstration project. No project licence has been selected and no `LICENSE` file has been added.
