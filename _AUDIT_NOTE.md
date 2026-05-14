# Audit Note — AIMedicalDeviceComplianceManager

Source audit: `_AUDIT/reports/batch_05.md` § 18 (verdict: **substantive**, 31 AI endpoints)

## Original audit recommendations

### Missing AI endpoints
- `/submission-review` (review submissions before FDA)
- `/recall-response` (automated recall planning)
- `/complaint-analysis` (analyze safety complaints, trends)

### Missing non-AI features
- Document version control & e-signature
- Third-party audit coordination
- Automated compliance notifications (expiry alerts)
- ERP integration
- Mobile app
- Supplier scorecard

### Custom feature suggestions
- Agentic regulatory advisor
- Vision-based document compliance verification
- Streaming audit anomaly detection
- Autonomous CAPA management
- Supplier compliance orchestration
- Regulatory intelligence agent

## Implemented in this pass
**Backlog-only.** Per the audit-apply policy ("substantive projects all-non-mechanical → backlog-only"), this project — which already exposes 31 AI endpoints across CAPA, change controls, audit logs, suppliers, calibration, training, and standards — gets no new mechanical endpoints. Adding them would risk overlap with `/risk-mitigation-advisor`, `/audit-anomaly-detection`, `/ncr-investigation-assistant`, etc. without product input.

## Backlog (priority order)

### Mechanical (after duplicate-check vs existing 31 endpoints)
- `/submission-review` — must coordinate with `/submission-package` and `/regulatory-pathway` (likely overlap)
- `/recall-response` — new domain, lowest overlap; safe candidate for next pass
- `/complaint-analysis` — overlaps with `/audit-anomaly-detection`; needs PM call on whether complaints are a separate entity

### Needs creds / external SDK
- E-signature (DocuSign, Adobe Sign)
- ERP sync (SAP, Oracle)
- Mobile app (out of backend scope)
- Regulatory intelligence feeds (FDA, EMA RSS / API)

### Needs product decision
- Document version control schema (DMR/DHF immutability rules)
- Third-party audit coordination workflow
- Supplier scorecard formula (which compliance signals)
- Automated expiry-alert policy (threshold rules)

## Apply pass 3 (frontend)

LEFT-AS-IS. The React/Vite frontend ships a comprehensive `AIToolsPage.jsx`
(in `client/src/pages/`) that wires all 30 AI endpoints in
`server/routes/ai.js` (compliance, risk, CAPA, training, suppliers, NCR,
change control, calibration, audit). JWT Bearer auth is handled by
`services/api.js`. Idempotence rule applies — no changes made.

## Apply pass 4 (mechanical backlog)

LEFT-AS-IS. All three mechanical backlog candidates are already wired in
this repository:

- `POST /api/ai/submission-review` (BE: `server/routes/ai.js` line 1766).
- `POST /api/ai/recall-response` (BE: same file line 1826).
- `POST /api/ai/complaint-analysis` (BE: same file line 1883).

All three reuse the existing `OPENROUTER_API_KEY` 503 helper at the top of
`ai.js`. Frontend coverage: `client/src/pages/AIToolsPage.jsx` already lists
all three under their respective tools (lines 312-338) — they POST to the
above endpoints through the shared API client with JWT bearer auth.
Idempotent — no new files written.
