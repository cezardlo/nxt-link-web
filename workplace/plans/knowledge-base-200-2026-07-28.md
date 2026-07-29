# The Knowledge Base · 200 items (from web-Claude, pasted by Cesar 2026-07-28)

> STATUS: SAVED AS REFERENCE. ★ = can sink the business if ignored.
> ⚠️ CORRECTIONS vs reality (terminal-Claude, 2026-07-28): E-3 says cap "~$12.5k" — LIVE engine = $20,000 cap (Cesar's ruling). I-2/Q-1 "code on GitHub" = DONE (origin/master = c220e48). I-3/Q-2 demo/prod split = DONE except DNS + demo banner. Admin console/ban-audit/constant-time items = already built, confirmed.

## A · Market & users
1. Buyers buy to solve problems, not to shop — speed to a real answer is the product.
2. Vendors are small industrial firms — no web team, phone-first, allergic to complexity.
3. The Borderplex = two countries, two languages, two currencies, one market.
4. ★ Spanish is not optional — half your market is Spanish-first.
5. Repeat purchases are the business — retention beats acquisition.
6. ★ Marketplaces die of emptiness — seed both supply AND demand; demand is the weakest plan today.
7. The first ~10 vendors are hand-recruited and concierge-onboarded, not self-serve.
8. Buyers arrive with intent from Google — SEO is the cheapest demand channel.
9. WhatsApp is where Borderplex business talks — plan for it (notifications v2).
10. Trust here is regional: "local + verified" beats "global + anonymous."

## B · Listings & catalog
11. Four publishable things: products, services, innovations, case studies.
12. One standardized template — fixed slots; price/specs/media always in the same place.
13. Camera/brochure first, AI drafts — nobody ever faces a blank form.
14. Category auto-detect + per-category spec chips keep data structured & comparable.
15. 1 photo minimum, 4–6 nudged; video measurably lifts conversion.
16. PDFs (spec sheets, certs, brochures) live in a standard Downloads slot.
17. Quality is nudged (completeness meter), never a publish blocker.
18. Condition matters for equipment: New · Refurbished · Used · For parts.
19. Bulk import exists but never first — one live listing beats an overwhelming import.
20. Every listing links two-way to its company profile — no dead ends.

## C · Pricing & quotes
21. 5 standard formats: fixed · per-unit+tiers · starting-at · range · quote-on-request.
22. Pricing models differ; the display never does.
23. "Quote on request" allowed but nudged to show a typical range.
24. Standard quote card: line items · lead time · valid-until · included/excluded chips.
25. Vendors may attach their own PDF quote — structured summary still required.
26. Quote revisions are versioned.
27. Accepted quotes are immutable.
28. ★ No hidden fees, structurally: the quote total is exactly what the buyer pays.
29. Volume/MOQ pricing is normal in B2B — support tiers from day one.
30. USD first; MXN display is a later question.

## D · Messaging — the handshake
31. ★ The thread is the heart of the marketplace — deals happen in conversation; #1 build.
32. One thread per deal — tied to the request/listing record forever.
33. Attachments in-thread: specs, drawings, photos, site plans. [BUILT 7/27]
34. Quotes are sent inside the thread — acceptable in one tap.
35. ★ Response time is a first-class feature — on profiles, in ranking, nudged.
36. Notifications must reach people off-platform (email now, WhatsApp later) or threads die.
37. Threads are dispute evidence — never deletable.
38. Contact info stays in-platform pre-transaction — anti-leakage by design. [BUILT: masking]
39. Every thread shows whose move it is.
40. Auto-translate EN↔ES in-thread — future superpower; design for it.

## E · Payments & money flow
41. ★ Stripe Connect Express; the platform never holds funds.
42. Fee = application fee auto-split at payment — never invoiced after.
43. Locked model: 4% first $50k · 2% above · cap [SPEC SAYS ~$12.5k — ACTUAL LIVE = $20k] · first deal 50% off.
44. 0% on pre-existing customers — only with dated proof registered at request time.
45. ★ KYC deferred until first sale — bank/ID at signup is the #1 onboarding killer.
46. ★ Big deals don't use credit cards — support ACH/bank debit or big deals leak to wire.
47. Card ~2.9% vs ACH ~0.8% — nudge large transactions to ACH.
48. ★ VERIFY: can Juárez (Mexican) vendors receive Stripe payouts? UNRESOLVED — could break half the market.
49. Define refunds before the first sale.
50. Every money event gets an audit row reconcilable against Stripe.

## F · Trust & safety
51. "Verified" requires a real process — manual checklist fine at first, but real.
52. Reviews only from completed transactions.
53. Response time + profile completeness = computable trust signals.
54. Ban hammer with audit log (built) — keep it.
55. Write the dispute policy before the first transaction — even one page.
56. Watch for: fake vendors, quote-phishing "buyers," off-platform bait.
57. Case studies auto-built from completed deals.
58. "Payment protected" messaging matters as much as the mechanics.
59. Buyer quality matters too — junk leads kill vendor faith fastest.
60. Moderate for spam/junk, don't gatekeep quality.

## G · Legal & compliance
61. ★ Form the LLC before money moves (~$300 DIY).
62. ToS + Privacy + Vendor Agreement live & accepted at signup — drafts exist.
63. Attorney review later, with revenue.
64. You are an intermediary, not a party to transactions — say it in ToS and UI.
65. Marketplace-facilitator sales tax laws may apply — check Texas rules before scale.
66. Cross-border customs/IVA/USMCA = parties' responsibility, stated in ToS.
67. OFAC screening — Stripe does most; know what remains.
68. Never give tax/customs/legal advice in product copy.
69. CCPA basics: privacy-request inbox, don't sell data.
70. Arbitration + class waiver drafted — attorney confirms enforceability.

## H · Security
71. ★ RLS on every table — cross-vendor data leak is company-ending.
72. Secrets server-side only; anon key is the only browser key.
73. Admin locked at server/API level — hidden UI is not security. [BUILT]
74. Validate every upload — this app has had XSS/SVG holes before.
75. Rate-limit public forms. [BUILT]
76. Constant-time compares on codes/tokens. [BUILT]
77. No PII in logs; no service keys in client bundles — audit before launch.
78. Verify Stripe webhook signatures.
79. ★ Backups on + restore TESTED before launch.
80. Error monitoring from day one.

## I · Tech & infrastructure
81. Stack: Next.js 14 · Vercel · Supabase · Stripe · Zoho · AI API. Boring is good.
82. ★ GitHub is source of truth; push = deploy. [DONE 7/28: origin/master live]
83. Two environments: demo (vercel.app) and production (nxtlinktech.com, fresh DB). [DONE 7/28 except DNS]
84. Env vars in Vercel — never committed. [DONE]
85. nxtlinktech.com owned → production.
86. Build-safety stays on.
87. Images: compress on upload, Next/Image + Supabase storage.
88. Serverless limits — long jobs queued, not awaited.
89. AI extract engine exists — reuse for listing drafts.
90. Browser-test the golden path before every launch push.

## J · UX & design system
91. Modern · simple · minimal · professional-fun. Violet brand, light+dark.
92. One decision per screen; one primary action.
93. Tap, don't type — typing only for name, description, price.
94. Autosave everything; skip anything; resume anytime.
95. Empty states teach — never a blank screen.
96. Skeletons over spinners; errors say what to do next.
97. ★ Mobile-first is survival.
98. Celebrate wins — sparingly, professionally.
99. No dead ends — every page links onward.
100. Wizard questions map 1:1 to page slots.

## K · Buyer experience
101. Two doors: browse/search AND post-a-request.
102. Search must work: keyword + category + location minimum.
103. "New & innovative" shelf — the mission made visible.
104. Standardized fields exist so side-by-side comparison works. [quote-compare BUILT]
105. Request form = tap-chips (what · when · budget) — 60 seconds max.
106. Status always visible: sent → matched → quotes (3).
107. Quote inbox with compare view. [BUILT]
108. Buyer accounts lightweight — no walls before value.
109. Paper trail downloadable — accountants are users too.
110. Reorder in two taps.

## L · Vendor experience
111. Onboard in one sitting: ~6 min, AI writes, no bank details asked.
112. Leads inbox is the vendor's home. [BUILT]
113. ★ Qualify leads before inboxes (budget/timeline chips) — junk kills vendor faith.
114. Quote from a phone with one thumb.
115. Post-launch: storefront checklist drives completion.
116. Completeness meter + nudges — reward, never block. [meter BUILT]
117. Payout status visible.
118. Vendor analytics: views, inquiries, response time, win rate.
119. One-tap case study from each completed deal.
120. Vendors can pause listings without deleting.

## M · Notifications & email
121. ★ Deliverability or death: SPF/DKIM/DMARC or threads die in spam.
122. Notify on: new lead, new message, quote received/accepted, payout sent.
123. Instant for money & messages; digest for the rest.
124. Every email deep-links to the exact thread/screen.
125. Unsubscribe: marketing yes, transactional no.
126. WhatsApp notifications = v2 killer feature.
127. In-app notification center = simple unread counts.
128. Transactional email from your domain, not gmail.
129. Reminders: unanswered lead 24h; onboarding nudges 24/72h. [invite reminders BUILT]
130. Respect language preference in every notification.

## N · SEO & growth
131. Programmatic SEO: {category} × {El Paso/Juárez} pages from real listings.
132. Every listing indexable with schema.org markup.
133. AI-answer SEO: structured Q&A for ChatGPT/Perplexity citations.
134. Demo site is a sales tool — keep it polished for pitching.
135. Referral loop in pricing: 0% own customers → vendors invite their buyers.
136. Every vendor = new landing pages — supply growth IS content growth.
137. Local partnerships: chambers, industrial parks, maquila associations.
138. Collect emails from day one — new-listings digest.
139. Measure funnel: visit → search → listing → inquiry → quote → paid.
140. Do things that don't scale: concierge onboarding IS early marketing.

## O · Metrics
141. North star: completed transactions/month.
142. Health pair: vendor time-to-first-response & buyer time-to-first-quote.
143. ★ Liquidity: % of requests getting ≥2 quotes within 48h.
144. Vendor activation: signup → published listing (>50%).
145. Buyer activation: visit → inquiry or request.
146. Retention: buyer 30-day repeat; weekly-active vendors.
147. Realized take-rate vs sticker.
148. Leakage signal: threads going silent at contact-exchange moment.
149. Simple stack: Vercel analytics + one metrics table.
150. Weekly ritual: one dashboard, six numbers, Monday.

## P · Operations & support
151. You are support at launch — same-day SLA you can keep.
152. Help email + WhatsApp business line beat a ticket system.
153. Concierge onboarding: do vendors' first listings with them.
154. FAQ page (fees, payouts, verification, disputes).
155. Admin console is mission control. [BUILT]
156. Manual verification checklist: registration, website/social, a phone call.
157. Refund/dispute playbook written down.
158. Downtime honesty.
159. Weekly backup-verification ritual.
160. Write SOPs as you go.

## Q · Launch
161. ★ Step 0: code on GitHub. [DONE 7/28]
162. Demo at vercel.app as pitch tool; production on nxtlinktech.com. [IN PROGRESS — DNS pending]
163. Seed 8–10 hand-picked vendors before inviting buyers. Never launch empty.
164. ★ Soft-launch ONE category first (e.g., material handling) — density beats thin coverage.
165. First buyers from your network + vendors' own customers (0% sweetener).
166. Do the first 5 transactions manually alongside users.
167. Launch checklist: backups ✓ monitoring ✓ legal pages ✓ email auth ✓ golden-path ✓.
168. Every deploy reversible.
169. Collect a testimonial from the first happy deal immediately.
170. Announce publicly only after the catalog looks alive.

## R · Business & finance
171. Infra break-even ≈ half a deal/month — volume is the risk, not cost.
172. Connect app-fee model chosen; validate economics on first real deals.
173. LTV:CAC unproven — validate with real deals before scaling spend.
174. 50%-off first deal: keep it.
175. Watch: average deal size · quote-to-close rate.
176. Separate business banking from day one (LLC account).
177. Set aside for taxes on commission revenue.
178. Monthly bookkeeping, even a spreadsheet.
179. Price experiments allowed — grandfather existing vendors.
180. Revenue expansion after liquidity, not before.

## S · Bilingual & cross-border
181. Full EN/ES parity: UI, emails, legal pages.
182. Language preference per user, set on first visit.
183. Listings display in creator's language + labeled auto-translated view.
184. USD baseline; MXN estimate later.
185. Cross-border logistics is the parties' job — link helpful resources.
186. ★ Mexican vendor payouts must be verified with Stripe before promising anything.
187. Phone/address/tax-ID fields flexible MX/US.
188. One time zone (MT); still store UTC.
189. Spanish legal pages may matter for enforceability — attorney question.
190. Personal onboarding is the culture here, not a growth hack.

## T · Edge cases & failure modes
191. Vendor never responds → auto-expire, tell buyer, re-match.
192. Buyer ghosts after quotes → auto-close politely; vendor stats unaffected.
193. Payment fails mid-deal → thread notice + retry; nothing lost.
194. Vendor suspended mid-deal → in-flight deals complete or refund (ToS).
195. Duplicate vendor accounts → admin merge path, eventually.
196. Sold out/discontinued → pause state, never delete.
197. Price changed after a quote → the quote price wins.
198. Chargeback → evidence = thread + delivery proof; Stripe runs it.
199. AI drafts wrong → vendor always reviews before publish — no auto-publish, ever.
200. Site down during a deal → honest status comms + safe data.
