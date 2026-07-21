# Governed medical-device change control

The durable path is `/api/governed-device-change-control`. Authenticated manufacturer membership and tenant/idempotency headers are required. Versioned devices move through intended-use/classification, user-need/requirement/hazard/control traceability, risk review, verification/validation evidence, submission review, qualified electronic approval, release, post-market change, recall review, and closure. Evidence is immutable and digest-based; versions, effective dates, retention, scope, segregation of duties, and optimistic locking are enforced.

Apply `server/migrations/001_governed_device_compliance.sql` only through the controlled deployment migrator. eQMS, complaints, suppliers, SBOM/cybersecurity, labs, and submission systems remain unconfigured until credentials, signed-record contracts, authoritative rule sources, and validation are approved. Legacy AI regulatory routes are quarantined in production.

The deterministic check supports explicit FDA, EU MDR, and EU IVDR rule-version references but provides no regulatory conclusion or citation. Qualified quality/regulatory professionals must verify jurisdiction, effective dates, electronic signatures, standards applicability, patient risk, and submission reproducibility. These professional and authoritative-data gates fail closed.

Use `.env.example` with secret management and keep bootstrap/demo/provider flags false. Run `node --test server/governance/workflow.test.cjs` and `bash -n start.sh`. Startup is nondestructive and does not install or alter the database.
