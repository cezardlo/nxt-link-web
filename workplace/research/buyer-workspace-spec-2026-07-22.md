# Buyer Workspace Spec — "System of Record for Procurement" (from Cesar, 2026-07-22)

**Departments: ENGINEERING (fullstack — spans UI + data) + DESIGN.** Routed by
coordinator. This is the detailed vision for the buyer side: saved items,
supplier directory, unified messaging, gradual contact reveal, request/quote
tracking, and global navigation.

**Status: BLUEPRINT — not scheduled.** Big, multi-slice. Directly extends the
approved `FLOW-BLUEPRINT-2026-07-22.md` **Slice 4** (buyer journey reskin +
/intake↔/projects merge + Deal Room Accept). Build post-landing, one slice at a
time, on Cesar's go. Much of this ALREADY exists in pieces — the work is
unify + extend, not build-from-zero.

## Engineering reality check — what EXISTS today vs. what's NEW

| Spec section | Already in the app | New / to extend |
|---|---|---|
| 1. Saved for Quote workspace | Quote **cart** (`/cart`, "Your quote cart", `cart_items` + localStorage) + **Save** button on cards (`saved_listings` table) | Header bookmark icon + count; tabs (All/Products/Services/**Lists**); **custom named lists** ("Warehouse Expansion 2026"); batch select→request; **Recently Viewed** (auto, last 20); **private notes** per saved item |
| 2. My Suppliers directory | `saved_quotes`/`saved_listings` patterns; vendor storefront pages exist | Buyer-side **supplier favorites** auto-saved on interaction (message/quote/accept); private notes; **tags/labels**; performance amber-dot alerts |
| 3. Messaging center | Messaging exists (`/api/buyer/messages`, `/api/vendor/messages`, threads); **contact masking** pre-acceptance already enforced; no-bypass scanning partially (maskContacts) | Unified full-page inbox (list+chat+context panel); **structured quote cards in chat**; read receipts / presence / typing; star/archive/search; per-message context tag (request/order) |
| 4. Contact management (gradual reveal) | **Contact masking until quote accepted ALREADY SHIPPED** (name shown, email/phone masked pre-accept; revealed post-accept) | The 3-stage model (pre-quote → after-quote: website+business phone → after-order: full rep contact); a **Contacts directory** tab auto-populated by interaction + visibility level |
| 5. Request & quote tracking | **`/projects` + `/projects/[id]` Deal Room with StageTracker pipeline ALREADY EXISTS**; quotes compare (QuoteCompare); activity present | Request detail as full "command center": quotes list + **activity timeline (audit log)** + related-messages jump + linked saved-products; wire **Accept in the Deal Room** (Slice 4 item) |
| 6. Global navigation | Buyer nav exists (thinner surface); `/buyer` dashboard | Persistent **sidebar** (Dashboard/Requests/Saved/Suppliers/Messages/Contacts/Orders/Settings); header icons with **counts** (Saved 🔖 / Messages ✉️); **mobile bottom nav** (Home/Requests/Saved/Messages/Profile) |

**Key existing constraint to preserve:** the no-bypass / contact-masking rules
are a shipped security feature — the spec's "phone/email auto-scanned, hidden
until order" must reuse `maskContacts` + the acceptance gate, not weaken them.
NO escrow/holds-funds language anywhere (standing rule). Everything EN/ES.

---

## Cesar's spec (faithful capture; ASCII mockups condensed to behaviors)

### 1. Saved for Quote workspace
- **Access:** bookmark icon in global header (between search and messages) with
  item-count badge.
- **Tabs:** All items · Products · Services · **Lists**. View toggle Cards/List.
- **Custom Lists:** buyers create named lists (e.g. "Warehouse Expansion 2026",
  "Forklift Fleet Replacement") and move saved items in — Amazon "Lists" model
  for procurement; build a "project" without committing to a formal RFQ yet.
- **Batch actions:** checkboxes → bulk **Request Quotes for Selected**, remove,
  or move to a list.
- **Recently Viewed:** separate auto-maintained list (last 20), in the same
  header dropdown — pure Amazon, no manual saving; safety net for forgotten items.
- **Notes on saved items:** small private "Add a note" field per item.
- Item card shows: image, name, supplier, "Request Quote" price, lead time,
  saved-ago, [Remove] [Move to list].
- Psychology: organizing reduces anxiety; lets buyers assemble a project pre-RFQ.

### 2. My Suppliers (favorites / following)
- **Access:** buyer dashboard sidebar tab, or the Saved-for-Quote header dropdown.
- **Card:** logo, name, ★rating(count), Verified, "Responds within Xh", city,
  categories, [View Storefront] [Message] [Remove], private Note.
- **Auto-save on interaction:** messaging, requesting a quote, or accepting a
  quote auto-adds the supplier (Alibaba contact-list model).
- **Private notes** per supplier ("Sales rep is Carlos – very responsive").
- **Performance alerts:** amber dot if a saved supplier's rating drops or they
  stop responding (proactive trust management).
- **Grouping:** custom labels/tags ("Local", "Reliable", "For automation") for
  filtering (lightweight CRM).
- Rationale: B2B is relationship-driven — remember companies, not just products;
  grows a trusted network inside NXT//LINK.

### 3. Messaging & communication center — Unified Inbox
- **Access:** envelope icon in global header with unread badge.
- **Desktop layout:** left conversation list (tabs All/Unread/Starred/Archived +
  search) · center chat pane · context header at top of chat.
- **Context-rich:** every chat auto-linked to a product / quote request / order /
  contract; context shown at top with a link to the full request/order.
- **Quick actions in chat:** vendor sends a **structured quote / revised quote**
  as a special card in the thread; buyer requests a revision or schedules a demo
  one-click (pre-filled); both share files (CAD/PDF/images) via drag-drop.
- **Status:** read receipts (✓✓), online/offline presence dot, typing indicator.
- **Search & filter:** full-text across conversations; Starred/Unread/Archived.
- **Archiving:** archive but never delete (audit).
- **No bypass:** phone/email/external links auto-scanned → blocked or flagged for
  operator review; contact details hidden until an order is placed.

### 4. Contact information management (gradual revelation)
- **Pre-quote:** only company name, location, Verified badge; all comms via
  NXT//LINK messaging.
- **After a quote received:** supplier website (if provided) + general business
  phone (if verified) become visible on profile + chat context panel.
- **After a contract (order accepted):** full contact details (direct phone,
  assigned rep email) revealed in the order details page; both reminded that
  staying on NXT//LINK protects the transaction.
- **Buyer's "Contacts" directory tab:** list of supplier reps interacted with +
  visibility level, auto-populated, ordered by most-recent interaction. Card:
  name · company · role · contact (with "visible after order" state) · last
  message · [View conversation] [View supplier profile].

### 5. Request & quote tracking (status pipeline)
- Pill-based status bar already designed. **Request Detail Page = command
  center** per request (reached by clicking a request card):
  - Header: Request # + title, Status ("Comparing Quotes (3 received)"),
    pipeline: Submitted → Matching → Quotes Received → Comparing → Selected →
    Completed.
  - **Quotes Received:** per-supplier row (total, lead time, [View Quote]
    [Message]) + [Compare All Quotes].
  - **Activity Timeline:** chronological audit log (quote submitted, matched,
    submitted) — enterprise-procurement idea, simplified.
  - **Related Messages:** [View all conversations for this request].
  - **Saved Products for this Request:** linked from the Quote List workspace.
  - Actions: [Post a new need based on this] [Cancel request].
- **Integration:** messages scoped to the request (jump from a quote into that
  supplier's chat, tagged with request ID); a pre-submission Quote List attaches
  here for reference.

### 6. Global organization & navigation
- **Buyer persistent sidebar (desktop):** Dashboard · My Requests (status
  filters) · Saved for Quote · My Suppliers · Messages · Contacts · Orders ·
  Settings.
- **Header icons (always):** 🔍 Search · 🔖 Saved (count) · ✉️ Messages (count)
  · 👤 Account (recently viewed, settings, sign out).
- **Mobile bottom nav:** Home · Requests · Saved · Messages · Profile.
- Principle: everything saved / everyone messaged / every quote received is
  findable from persistent nav — no lost data, no URL-hunting, no email digging.

### Summary — what the system achieves
Saved items become project-based lists with notes + batch actions; suppliers are
auto-remembered, tagged, noted, monitored; messages are context-rich and replace
email; contacts reveal gradually as trust builds; request tracking centralizes
quotes/messages/files/saved-products with a clear pipeline. NXT//LINK becomes the
**system of record for industrial procurement** — a workspace that organizes
everything for the buyer, not just a search engine.
