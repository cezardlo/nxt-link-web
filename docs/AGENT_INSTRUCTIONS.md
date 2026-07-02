# NXT Link Agent Instructions

## Purpose

NXT Link uses the **WAT Framework: Workflows, Agents, and Tools**. It separates probabilistic AI reasoning from deterministic execution so the platform remains reliable, testable, secure, and understandable.

AI should coordinate and recommend. Code should validate and execute. Humans must approve sensitive, confidential, financial, legal, or externally binding actions.

## The WAT Architecture

### Layer 1: Workflows — The Instructions

Workflows are plain-language Markdown standard operating procedures stored in `workflows/`.

Each workflow should define:

- Objective and business outcome
- Required inputs and preconditions
- Roles and permissions
- Tools to run and their sequence
- Human approval gates
- Expected outputs
- Validation and acceptance criteria
- Failure handling and rollback or recovery
- Confidentiality and audit requirements
- English and Spanish considerations where applicable

Write workflows as if briefing a capable teammate. Preserve and improve existing workflows. Do not create, replace, or overwrite a workflow without explicit user authorization.

### Layer 2: Agents — The Decision-Makers

Agents interpret intent and coordinate the work. They should:

- Read the relevant workflow before acting
- Gather only the information needed
- Ask focused clarification questions when a material choice is missing
- Select and sequence approved tools
- Handle failures gracefully
- Explain recommendations, confidence, and missing information
- Escalate sensitive or binding decisions to a human
- Record durable lessons in the authorized workflow

Agents must not pretend that a probabilistic answer is a completed transaction.

### Layer 3: Tools — Deterministic Execution

Tools are testable scripts and services stored in `tools/`. They handle work such as:

- API calls and integrations
- Input validation and normalization
- File and document processing
- Database reads and writes
- Permission enforcement
- Fee and quote calculations
- Notifications
- PDF generation
- Audit logging
- Data transformations and exports

Credentials and API keys belong only in environment-managed secrets such as `.env`. Never place secrets in source code, prompts, logs, workflows, examples, or committed files.

## Core Operating Rules

### Look for an existing tool first

Before creating anything new, inspect `tools/` for an existing capability that satisfies the workflow. Extend a suitable tool when safe. Create a new tool only when no appropriate implementation exists.

### Verify every execution

A successful-looking response is not proof of completion. Tools should return structured results, and the agent should verify the intended state change using the smallest authoritative check.

### Learn from failures

When something fails:

1. Read the complete error and trace.
2. Identify the real cause.
3. Fix the tool or configuration.
4. Retest safely.
5. Verify the corrected behavior.
6. Update the authorized workflow with the durable lesson.
7. Continue with the stronger process.

Before repeating paid API calls or anything that consumes credits, obtain user approval.

### Keep workflows current

When rate limits, timing constraints, provider behavior, privacy requirements, or recurring edge cases are discovered, document them in the relevant workflow after authorization. Refine existing instructions rather than discarding them.

## NXT Link Human Approval Gates

AI may draft, extract, classify, translate, rank, compare, explain, and recommend. Deterministic tools may validate, calculate, transform, persist, notify, and enforce permissions. A human must approve the following before execution:

- Publishing a vendor profile or extracted brochure information
- Sharing customer identity, contacts, facility details, files, or operational problems
- Sending vendor outreach, an RFI, an RFQ, or a quote
- Selecting or rejecting a vendor for a protected opportunity
- Revealing identities or enabling direct contact
- Sending or signing an NDA, MNDA, NCA, pilot agreement, SOW, MSA, contract, or purchase order
- Accepting a quote, pilot, proposal, contract, or purchase
- Setting, changing, waiving, or finalizing a success fee or commission
- Making payments, refunds, credits, or financial adjustments
- Publishing event invitations or contacting external attendees

The application must never automatically send, sign, accept, purchase, disclose, or finalize these actions.

## Confidentiality and Access Control

NXT Link must follow least privilege:

- Use organization memberships and server-side role authorization
- Enforce row-level and object-level access
- Keep vendor templates, pricing, quotes, and conversations private from competitors
- Keep customer identity and sensitive details hidden until consent and agreement gates are satisfied
- Store files privately and use expiring signed access
- Log consent, sharing, reveal, approval, document, and fee events
- Make field-level sharing explicit and reviewable
- Prevent cross-organization and cross-vendor leakage
- Never rely on client-provided role, user, or organization identifiers without server verification
- Never use a hard-coded shared administrator code

## Reliability Standards for Tools

Every production tool should have:

- Strict input and output schemas
- Authentication and authorization checks
- Idempotency for retried mutations
- Bounded retries with backoff
- Timeouts and graceful failure states
- Structured logs with secrets and sensitive data removed
- Clear error categories
- Audit identifiers for important operations
- Unit tests for deterministic rules
- Integration tests for external services where practical
- Safe dry-run or preview behavior for sensitive actions

## Directory Conventions

```text
.tmp/              Disposable, reproducible intermediate files
tools/             Deterministic scripts and integrations
workflows/         Authorized Markdown SOPs
docs/              Product, architecture, governance, and operating documentation
.env               Local environment variables; never committed
credentials.json   OAuth credentials; always gitignored
token.json         OAuth tokens; always gitignored
```

Final deliverables should be saved to the approved destination defined by the workflow. Local intermediate files should be reproducible, and everything in `.tmp/` is disposable.

## Initial NXT Link Workflows

Recommended MVP workflows include:

1. Vendor onboarding and verification
2. Brochure upload, extraction, review, and approval
3. Customer adaptive intake and confidentiality selection
4. RFI and RFQ drafting, approval, and controlled distribution
5. AI-assisted vendor matching with operator review
6. NDA, MNDA, and NCA approval and identity-reveal gates
7. Vendor questions and structured quote submission
8. Quote comparison, shortlist, demo, and pilot coordination
9. Contract and purchase-order handoff
10. Deterministic success-fee calculation and acknowledgment
11. Notifications, reminders, and stalled-opportunity follow-up
12. Event lead capture and post-event conversion

These are recommendations. New workflow files require explicit user authorization.

## Initial NXT Link Tools

Recommended deterministic tools include:

- Private file upload and malware/type validation
- OCR and brochure text extraction
- Vendor/product taxonomy normalization
- Structured intake and RFQ validation
- Matching feature calculation and explainable score storage
- Permission and consent gate enforcement
- Email and in-app notification delivery
- Calendar and meeting integration
- PDF quote and document generation
- English/Spanish translation with human review
- Quote comparison normalization
- Commission calculator with versioned policies
- Audit-event writer
- Analytics aggregation that excludes confidential details

## AI Boundaries

AI output must be treated as a draft unless explicitly approved. AI must:

- State important uncertainty and missing information
- Provide explainable match reasons
- Avoid inventing brochure facts, pricing, credentials, certifications, or customer requirements
- Never expose hidden information through summaries, embeddings, logs, or prompts
- Never make legal or tax determinations
- Never finalize fee terms
- Never contact an external party without approval
- Support human correction and preserve the correction in structured data

## Bilingual and Worker-Support Principles

Customer and vendor workflows should support English and Spanish. Translations of binding documents, prices, technical requirements, or safety instructions require human review.

Recommendations should support workers, reduce errors and friction, improve safety and visibility, and make jobs easier. The platform must not imply that replacing workers is the default measure of value.

## Acceptance Criteria

This document is complete when:

- It lives at `docs/AGENT_INSTRUCTIONS.md`
- Headings are navigable and responsibilities are unambiguous
- Workflows, agents, and tools have distinct boundaries
- NXT Link approval gates are explicit
- Confidentiality, permissions, audit, and secret-handling rules are present
- Directory conventions and the failure-improvement loop are defined
- No credentials, tokens, private data, or real secrets are included
- Future agents can use it to continue the project safely

## Bottom Line

The agent sits between user intent and reliable execution. It reads authorized workflows, makes careful decisions, calls deterministic tools, verifies results, protects confidential information, obtains human approval for sensitive actions, and improves the system when failures teach something durable.

Stay pragmatic. Stay reliable. Keep learning.
