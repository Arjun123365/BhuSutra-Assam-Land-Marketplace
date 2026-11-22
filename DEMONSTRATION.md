# BhuSutra demonstration guide

> BhuSutra is an NESFIC demonstration prototype using synthetic data. It is not an official Government land-record portal and does not certify legal title or transaction eligibility.

This guide describes the existing application. The [README](README.md) contains setup, private local configuration, routes, tests and limitations. Do not include private keys, cookies, database exports or citizen information in presentation material.

## Preserve the working installation

- Keep the existing SQLite database and adjacent signing-key sidecar private and together.
- Do not reset, reseed, replace or delete an existing store to reproduce a demonstration.
- Preserve P-15's Approved status on the original working installation. That record is local and is not distributed by Git.
- Observe saved records without submitting actions when preparing screenshots or reports.
- For rehearsals that create or update records, use an explicitly separate disposable store and confirm its path before starting the server.
- A fresh clone contains 17 synthetic parcel definitions, but not another installation's account histories or approvals. Do not register a duplicate profile to regain an existing account; use the configured local switcher.

## Suggested judge walkthrough

1. **Homepage:** show stored-data counters, featured public listings, charts and the prototype disclaimer. Counts depend on the selected local store.
2. **Explore Land:** filter Jorhat, Kamrup and Dibrugarh, select available revenue circles and choose parcels from both the map and list. Show the green/grey/amber/gold legend.
3. **Parcel record:** open a stable parcel record and distinguish synthetic attributes, seller declarations and missing official checks. Where the existing store contains the approved P-15 listing, use it as an observation anchor.
4. **Seller workspace:** use the existing fictional owning seller. Inspect listing status and audit history; preserve existing approvals.
5. **Administrator review:** unlock the configured local workspace. Show review decisions as marketplace-publication decisions only, not title certification.
6. **Buyer enquiry:** inspect a saved enquiry, seller response and timestamped audit trail in the appropriate existing buyer/seller sessions.
7. **Verification:** show all eight authoritative-check categories as Not connected / Not verified. Buyer checklist completion remains self-reported preparation.
8. **Assistance:** inspect an existing saved request and its timeline. Opening the start page is guidance; the explicit Create assistance request action persists a request. Do not create artificial requests just to raise a count.
9. **Coordination:** show administrator notes/follow-ups, notifications and stored-data analytics. Notes are shared within the related demonstration workflow.
10. **Read-only monitoring:** use the administrator dashboard cards to open `/admin/profiles` and `/admin/enquiries`; expand saved enquiry histories.
11. **Reports:** download a watermarked HTML verification or coordination report. Explain that it is neither a sale agreement nor an official Government record.
12. **Future vision:** explain that authenticated Government adapters, official geometry, production identity and operational deployment require separate authorisation and implementation.

The current basemap uses original, locally painted decorative field artwork. No OpenStreetMap volunteer tile server is requested. Every boundary is illustrative; the application is not an official cadastral map.

## Access and privacy

Use separate fictional buyer/seller sessions or the development-only profile switchers. Both switchers need explicit opt-in and distinct private unlock keys. Administrator access has its own key and session. Follow the README's hidden-input instructions; do not print keys or capture an unlock field containing a value.

All workflow mutations derive the actor from the server session. Enquiries, verification history, assistance requests and notifications remain scoped to the relevant profiles; administrator monitoring requires administrator authorization. These controls do not constitute production-grade authentication.

## Acceptance and automated evidence

The project owner reports that all 12 planned Phase 7 manual tests passed. No independent certification is implied. Local evidence packages and screenshots remain outside the publication set by default.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:regression
npm.cmd run build
```

The aggregate suite uses temporary databases and excludes the previously deferred seller-withdrawal test. Do not execute a withdrawal against P-15 or interpret an excluded test as a pass. The optional map browser runner has separate prerequisites documented in the README.

For future acceptance records, keep an itemised execution sheet with the code version, environment, expected/observed behaviour, date, reviewer and evidence references. Preserve screenshots of the actual application; label unavailable or historical views explicitly.

## Production readiness boundary

No live Government integration, payments, ownership transfer, official title certificate or public production deployment is claimed. Real-data operation requires a separately reviewed identity/access design, authorised data sharing, privacy and security assessment, backups/recovery, licensed map data and measured operational requirements.
