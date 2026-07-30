# Trust & Proof onboarding integration — 2026-07-30

## Problem

NXT//LINK already stores certifications, case studies, and gallery photos and already exposes working vendor APIs and portal editors for them. The onboarding Trust & Proof step currently reduces those capabilities to three link cards that send the vendor back to `/vendor/portal`. That makes onboarding feel unfinished and forces vendors to leave the task they are completing.

## Targeted change

Embed the existing certification, case-study, and gallery workflows directly in the existing `/vendor/onboarding` Trust & Proof card.

- Reuse `/api/vendor/certifications`, `/api/vendor/case-studies`, and `/api/vendor/gallery`.
- Reuse the existing database records and limits. Do not create endpoints, tables, or duplicate persistence.
- Explain what each proof type does before asking for information.
- Reveal each focused form only when the vendor opens that proof type.
- Show saved records, useful metadata, upload requirements, item limits, loading, empty, success, and inline error states.
- Keep all new user-facing copy in English and Spanish.
- Keep the existing NXT//LINK palette, typography, spacing, mobile behavior, and single violet primary navigation action.

## Acceptance checks

1. A vendor can add and remove a certification without leaving onboarding.
2. A vendor can add and remove a structured case study without leaving onboarding.
3. A vendor can upload and remove a gallery photo without leaving onboarding.
4. Existing proof records load and remain visible in onboarding and the portal.
5. Required and optional fields are clearly marked.
6. Upload requirements are visible before upload.
7. Failures appear inline and do not erase entered form content.
8. Keyboard focus is visible and every input has a label.
9. Typecheck and automated tests pass.

## Explicit non-goals

- No fee-engine changes.
- No new database schema or API route.
- No portal redesign.
- No changes to buyer onboarding.
- No push to `master` and no production deployment.

