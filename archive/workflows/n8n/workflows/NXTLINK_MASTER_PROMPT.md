# NXT LINK — MASTER AI GENERATION PROMPT
# ══════════════════════════════════════════════════════════════════════
# HOW TO USE THIS FILE
# ══════════════════════════════════════════════════════════════════════
# 1. Open VS Code
# 2. Open the Claude or Copilot chat panel (or use claude.ai)
# 3. Copy ONE prompt block at a time (marked === START / === END)
# 4. Paste into the AI and press Enter
# 5. Save the output as the filename listed in each section header
#
# BUILD ORDER:
#   Prompt A → frontend/index.html        (the full web app UI)
#   Prompt B → backend/schemas/*.py       (Python data models)
#   Prompt C → backend/prompts/*.txt      (AI agent instructions)
#   Prompt D → backend/main.py            (FastAPI server)
#   Prompt E → backend/data/vendors_seed.json
#   Prompt F → backend/data/example_company.json
#   Prompt G → README.md
#   Prompt H → requirements.txt
# ══════════════════════════════════════════════════════════════════════


# ──────────────────────────────────────────────────────────────────────
# PROMPT A — FULL FRONTEND WEB APP
# Save output as: frontend/index.html
# ──────────────────────────────────────────────────────────────────────

=== START PROMPT A ===

You are a senior frontend engineer and UI designer.
Build a complete, single-file production-grade HTML web application
for NXT Link — a Logistics Technology Evaluation Platform.

──────────────────────────────────────────
IDENTITY
──────────────────────────────────────────
App:       NXT Link Intelligence Engine
Tagline:   "Validate before you commit. Protect before you sign."
Audience:  Logistics CEOs, Operations Directors, 3PL owners (20–200 employees)
Purpose:   Help logistics companies evaluate TMS vendors and design
           30-day pilot programs BEFORE signing any contract.
Demo use:  POC for enterprise/big-player presentations.
           Must impress a logistics executive in 90 seconds.

──────────────────────────────────────────
DESIGN SYSTEM
──────────────────────────────────────────
Aesthetic: Industrial-corporate. Serious. Not consumer. Not gamer.
Fonts (Google Fonts, load in <head>):
  Display: "Barlow Condensed" — weights 700, 800, 900
  Body:    "Barlow" — weights 300, 400, 500, 600

CSS Variables (define in :root):
  --navy:      #1B2A4A    primary dark sections
  --dark:      #0F1A2E    hero / deep background
  --orange:    #E8601C    primary accent
  --orange-lt: #FF7A35    hover state
  --cream:     #F9F6F1    light section backgrounds
  --gray:      #E8E4DD    borders and dividers
  --green:     #2D8A4E    success / confidence signals
  --red:       #C0392B    risk / danger signals
  --yellow:    #D4A017    medium risk signals
  --white:     #FFFFFF
  --text:      #2C2C2C
  --muted:     #7A7A7A

HARD RULES:
  - NO purple gradients anywhere
  - NO neon colors
  - NO gamer aesthetics
  - ONLY animate pain bars and revenue chart
  - Static layout everywhere else — sharp and clean
  - Mobile responsive with CSS grid and media queries

──────────────────────────────────────────
APP STRUCTURE
──────────────────────────────────────────
Sticky top navbar:
  Left: Logo "NXT LINK" — LINK in orange, bold Barlow Condensed
  Right: Tab buttons: [ THE PROBLEM ] [ THE ENGINE ] [ THE OUTCOME ]

Tab switching: clicking a tab shows its section, hides the others.
Default active tab: THE PROBLEM.
Active tab button: orange text + orange bottom border.

──────────────────────────────────────────
TAB 1 — THE PROBLEM
──────────────────────────────────────────

SECTION 1.1 — HERO (background: --dark)
  Layout: 2 columns

  Left column:
    Small tag pill: "EL PASO, TEXAS  ·  CROSS-BORDER LOGISTICS"
    H1: "THE TECHNOLOGY TRAP"  (Barlow Condensed 900, white, ~64px)
    Subheadline: "Most logistics companies discover the wrong fit
    after the contract is signed. By then, it's too late."  (white, 17px)
    Three stat badges in a row (navy bg + orange border):
      "30-Day Sprint"   |   "3 Vendors Tested"   |   "0 Vendor Commissions"

  Right column (dark card, slight border):
    Title: "Why Companies Fail at Tech Adoption"  (orange, 13px uppercase)
    5 animated pain bars (fill left to right on page load via CSS keyframes):
      78% — Bought based on demo alone
      62% — Experienced failed implementation
      71% — Overpaid for unused features
      83% — Had no in-house IT to evaluate
      91% — Wished they tested before buying
    Each bar: label on left, percentage on right (orange), red/orange gradient fill.
    Animate with @keyframes fillBar { from {width:0} to {width: var(--w)} }

SECTION 1.2 — MARKET STAT CARDS (background: --cream)
  4-column card grid. Each card: top orange bar (3px), icon, big bold number, description.
    🚛  $40K+   "Avg annual TMS cost for a 50-person 3PL — your evaluation fee is 5% of that"
    🌉  #2      "El Paso-Juarez: 2nd largest US-Mexico commercial crossing by volume"
    🏭  200+    "Maquiladora facilities in Juarez creating daily cross-border complexity"
    🚫  80%     "SMB freight operators still on manual coordination — spreadsheets + WhatsApp"

SECTION 1.3 — WITHOUT vs WITH NXTLINK (background: white)
  Title: "Status Quo vs. NXT Link"
  Two-column split table layout.

  LEFT column (red left-border 4px, light red bg):
    Header: "❌ Without NXT Link"  (red, Barlow Condensed bold)
    6 items with ✗ icon:
      Company Googles "best TMS" — gets ad-driven results
      Sales rep controls demo in a sanitized environment
      No cross-border compliance expertise in the room
      Contract signed on gut feeling and pitch quality
      Implementation reveals the real gaps — too late to walk away
      2–3 year lock-in on the wrong platform

  RIGHT column (green left-border 4px, light green bg):
    Header: "✅ With NXT Link"  (green, Barlow Condensed bold)
    6 items with ✓ icon:
      Client defines success criteria before vendors enter
      All 3 vendors run same scenarios on same scorecard
      Top vendor tested in client's actual environment with real data
      Decision backed by 7-section performance report
      NXT Link takes zero vendor commissions — written in contract
      Client signs with confidence and documented rationale

SECTION 1.4 — GAP ANALYSIS TABLE (background: --cream)
  Title: "Current State — Gap Analysis"
  Table with columns: Category | Current State | Risk Level | Impact
  Header row: --navy background, white text
  Alternating row shading (white / #FAFAF8)
  Risk Level = colored badge: red pill / yellow pill / green pill

  Rows:
    Vendor Vetting      | Informal research         | 🔴 HIGH   | Wrong vendor selected
    KPI Definition      | Undefined                 | 🔴 HIGH   | No success measurement
    Demo Control        | Vendor-led                | 🟡 MEDIUM | Biased evaluation results
    Pilot Structure     | None exists               | 🔴 HIGH   | No real-world validation
    Compliance Check    | Manual / ad hoc           | 🔴 HIGH   | Cross-border failure risk
    Reference Checks    | 0–1 on average            | 🟡 MEDIUM | Incomplete due diligence

──────────────────────────────────────────
TAB 2 — THE ENGINE
──────────────────────────────────────────

SECTION 2.1 — SPRINT TIMELINE (background: white)
  Title: "The 30-Day Validation Sprint"
  Subtitle: "Four weeks. Structured process. Vendor-neutral. Every step produces a document."

  Horizontal timeline: 4 numbered circle nodes (W1 W2 W3 W4)
  Connected by orange horizontal line.
  Odd nodes (W1, W3): --navy circle fill, orange border.
  Even nodes (W2, W4): --orange fill, white number text.

  Below each node: a card with content:
    W1 — "Success Criteria"
      • Kickoff + process mapping
      • Quantify current pain costs
      • Build requirements matrix
      • Define success thresholds
      • Sign Sprint Charter
      Output badge: "Signed Success Criteria Doc"

    W2 — "Vendor Demos"
      • Send identical demo scripts to all 3 vendors
      • 3 x 90-min facilitated demos — NXT Link controls the room
      • No vendor-to-client direct contact permitted
      • Score each demo same day
      Output badge: "Vendor Score Comparison"

    W3 — "Live Operational Test"
      • Top vendor in client's actual environment
      • Client team runs 5 real operational scenarios
      • NXT Link times each task against benchmarks
      • Log workarounds, errors, friction
      Output badge: "Performance Data Record"

    W4 — "Final Report"
      • Final scoring across all 3 vendors
      • Independent reference calls (not vendor-supplied)
      • Risk assessment per vendor
      • 90-day implementation roadmap
      Output badge: "7-Section Risk Report"

SECTION 2.2 — VENDOR SCORING MATRIX (background: --cream)
  Title: "Vendor Scoring Matrix"
  Subtitle: "Same criteria. Same weight. Every vendor evaluated identically."

  Table layout — header: --navy bg, white text:
    Columns: Requirement Category | Weight | Vendor A | Vendor B | Vendor C

  6 data rows:
    🌉 Cross-Border Compliance | 25% | 5 green dots | 4 yellow dots | 2 red dots
    🚚 Carrier & Load Mgmt     | 20% | 4 green dots | 5 green dots  | 3 yellow dots
    📊 Visibility & Reporting  | 20% | 4 green dots | 4 yellow dots | 5 green dots
    🔗 System Integration      | 15% | 3 yellow dots| 5 green dots  | 2 red dots
    🛠 Implementation Support   | 15% | 5 green dots | 3 yellow dots | 4 yellow dots
    💰 Pricing & Contract Terms |  5% | 4 green dots | 3 yellow dots | 5 green dots

  Each "dots" cell = 5 small circles side by side (12px each).
  Filled circles = scored color. Empty circles = light gray.
  Show numeric score (e.g. "4.0") below the dots, colored to match.

  Final summary row (--navy bg, white text):
    "WEIGHTED TOTAL" | 100% | "4.35 ✓" (green, 28px) | "4.10" (yellow) | "3.20" (red)

  Color legend below table:
    🟢 Strong (4–5)   🟡 Adequate (3–4)   🔴 Weak (1–3)

SECTION 2.3 — CREDIBILITY PATH (background: white)
  Title: "The Credibility Path"
  Subtitle: "5 steps from zero clients to trusted advisor."

  5 alternating vertical blocks (full width, stacked):
    ODD blocks (1, 3, 5): --navy background, white text
    EVEN blocks (2, 4): white background, orange left-border (6px)

  Each block contains:
    - Step number ("01" "02" etc.) in large Barlow Condensed, light color
    - Step title (bold)
    - Step description (2 sentences max)

  Step 1 (navy): "Identify the Risk"
    "Map the client's current tech evaluation process. Quantify the cost
    of a wrong implementation decision before any vendor is contacted."

  Step 2 (cream, orange border): "Define the Criteria"
    "Set measurable success thresholds collaboratively with the client.
    Criteria are locked before any vendor enters the evaluation."

  Step 3 (navy): "Control the Evaluation"
    "All vendors run identical scenarios. NXT Link facilitates every demo.
    Zero vendor-controlled narrative is permitted."

  Step 4 (cream, orange border): "Measure Performance"
    "Real operational test with the client's actual team, real data,
    and timed benchmarks against Week 1 success criteria."

  Step 5 (navy): "Decide with Evidence"
    "A 7-section performance report replaces opinion with data.
    Client signs with confidence and a documented rationale."

SECTION 2.4 — CEO OBJECTIONS ACCORDION (background: --cream)
  Title: "CEO Objections — And How to Answer Them"
  Subtitle: "Every logistics executive will say one of these five things."

  5 accordion items. Click question to toggle answer. Default: all closed.
  Question row: left red border (4px), light bg, arrow icon rotates on open.
  Answer row: left green border (4px), slightly different bg.

  Item 1:
    Q: "We can research vendors ourselves. Why would I pay for this?"
    A: "You can — and you know your operation better than anyone. What
    you're paying for is structure that prevents a $40,000 decision from
    being based on a controlled demo. I set success criteria before vendors
    know what they are, test in your actual environment, and deliver a
    performance record — not an opinion. Most internal evaluations take
    60–90 hours over 3 months. I do it in 30 days while your team stays
    focused on operations."

  Item 2:
    Q: "We don't have budget for this right now."
    A: "If the TMS you're evaluating costs $25,000 a year and you sign
    the wrong one, you're locked in for 2–3 years and spending $10,000–$20,000
    to switch. This sprint costs $2,000. If budget genuinely isn't available,
    let's start with a free 90-minute discovery session. But if you're
    actively evaluating vendors right now, delay has a real cost."

  Item 3:
    Q: "How do I know you're not being paid by one of the vendors?"
    A: "It's in the contract. The Sprint Charter includes a written clause
    stating NXT Link accepts zero compensation from any vendor during the
    engagement. Not a promise — a signed legal commitment. My entire model
    depends on being the only neutral party in this market. That's not
    marketing language. That's the structure."

  Item 4:
    Q: "We're already leaning toward a vendor. We don't need a full evaluation."
    A: "That's actually the most important time to run this sprint. It
    either confirms you're right — giving you documented rationale to defend
    the decision internally — or it surfaces a gap before you sign. Either
    way you're protected. The Week 3 operational test alone is worth the fee."

  Item 5:
    Q: "We've used consultants before and nothing was ever actionable."
    A: "Most consulting deliverables aren't actionable because they're
    opinion documents. What I deliver is a performance record. Your team ran
    five real scenarios in the actual system. I measured time-on-task against
    thresholds you defined in Week 1. That's your data — not my judgment about
    your industry."

──────────────────────────────────────────
TAB 3 — THE OUTCOME
──────────────────────────────────────────

SECTION 3.1 — ROI EQUATION (background: white)
  Title: "The ROI Case"
  Subtitle: "What you say to every CFO."

  Large centered 3-box equation layout (horizontal):
    BOX 1 (red number):   "$60,000"
                           label: "Cost of a Wrong Implementation"
                           sublabel: "Software + retraining + switching + lost productivity"

    OPERATOR: "−"  (large, muted gray, Barlow Condensed)

    BOX 2 (navy number):  "$2,000"
                           label: "NXT Link Sprint Fee"
                           sublabel: "Flat fee, paid to NXT Link only"

    OPERATOR: "="  (large, muted gray)

    BOX 3 (green number): "$58,000"
                           label: "Downside Risk Protected"
                           sublabel: "If the sprint prevents one bad decision"

  Below equation — orange callout bar (left border, light orange bg):
    Title: "THE PITCH LINE"
    Text: "If the software you're evaluating costs $25,000 a year and you
    sign the wrong one, you're locked in for 2–3 years. This sprint costs
    $2,000. That's the cheapest insurance available on a $75,000 decision."

SECTION 3.2 — REVENUE BAR CHART (background: --cream)
  Title: "90-Day Revenue Roadmap"
  Subtitle: "Target: $4,500 by Day 90. One sprint at a time."

  Animated bar chart — 6 vertical bars, animate when this tab is activated.
  Bars grow from height 0 upward via CSS animation (trigger on tab click).
  Maximum bar height: 160px.

  Bar data (label | value | height % | bar color | milestone note):
    Day 1   | $0     | 2%   | navy   | (start)
    Day 28  | $1,000 | 22%  | navy   | "Charter 1 Signed" (orange label)
    Day 45  | $2,000 | 44%  | navy   | "Sprint 1 Midpoint"
    Day 58  | $3,000 | 66%  | navy   | "Report Delivered" (green label)
    Day 65  | $3,500 | 77%  | navy   | "Charter 2 Signed" (orange label)
    Day 90  | $4,500 | 100% | orange gradient | "Sprint 2 Complete ✓" (green label)

  Dollar values appear above each bar.
  Milestone labels appear below X-axis.
  Bottom border of chart area = 2px --gray.

SECTION 3.3 — EXECUTION PHASE BLOCKS (background: white)
  Title: "90-Day Execution Plan"
  Subtitle: "Hunt. Execute. Repeat."

  3 stacked horizontal phase blocks. Each = colored left label + 3-column content.

  PHASE 1 (left label: --navy bg):
    Label text: "01" / "DAYS 1–30" / "HUNT"
    Content col 1 — "WEEKLY ACTIVITY":
      5 outreach contacts per day. 20 discovery conversations total.
    Content col 2 — "KEY MILESTONES":
      CRM setup. Vendor partner programs. 3 institution contacts.
    Content col 3 — "REVENUE TARGET":
      "$1,000"  (large green Barlow Condensed)
      "Sprint 1 deposit"

  PHASE 2 (left label: --orange bg):
    Label text: "02" / "DAYS 31–60" / "EXECUTE"
    Content col 1 — "WEEKLY ACTIVITY":
      Run Sprint 1. Maintain 10 active pipeline conversations.
    Content col 2 — "KEY MILESTONES":
      Deliver report. Collect balance. Get written testimonial.
    Content col 3 — "REVENUE TARGET":
      "$2,000"  (large green)
      "Sprint 1 complete"

  PHASE 3 (left label: #2D5A8E bg):
    Label text: "03" / "DAYS 61–90" / "REPEAT"
    Content col 1 — "WEEKLY ACTIVITY":
      Close Sprint 2. Build case study from Sprint 1. Referral outreach.
    Content col 2 — "KEY MILESTONES":
      Sprint 2 charter signed. Sprint 2 report delivered.
    Content col 3 — "REVENUE TARGET":
      "$4,500"  (large green)
      "Cumulative total"

SECTION 3.4 — PRICING TIERS (background: --cream)
  Title: "Service Pricing"
  Subtitle: "Client pays NXT Link. NXT Link takes nothing from vendors. Ever."

  3-column pricing grid. Center column is FEATURED (navy bg).
  Each tier: top border 4px, phase tag, title, price, description, checklist.

  TIER 1 (left, white bg, gray top border):
    Phase tag: "Sprint 1–3  ·  Introductory"
    Title: "VENDOR COMPARISON REPORT"
    Price: "$1,500"
    Desc: "Fastest path to first revenue. 2 weeks. No pilot required."
    Checklist:
      ✓ Requirements matrix session
      ✓ 3 vendor demos (standardized script)
      ✓ 6 independent reference calls
      ✓ 5-page recommendation report

  TIER 2 (center, --navy bg, orange top border, FEATURED):
    Phase tag: "Sprint 1–3  ·  Full Service"  (muted)
    Title: "30-DAY VALIDATION SPRINT"  (white)
    Price: "$2,000"  (orange)
    Desc: "Full sprint with live operational testing. Core product."  (muted)
    Checklist (white text):
      ✓ All 4 weeks of sprint structure
      ✓ Live operational test (Week 3)
      ✓ Performance data record
      ✓ 7-section risk report
      ✓ 90-day implementation roadmap

  TIER 3 (right, white bg, navy top border):
    Phase tag: "Sprint 7+  ·  Standard Rate"
    Title: "FULL SPRINT + MONITOR"
    Price: "$5,000"
    Desc: "Post-case study rate with ongoing implementation support."
    Checklist:
      ✓ Full 30-day validation sprint
      ✓ 90-day post-implementation monitor
      ✓ Monthly check-ins + adjustments
      ✓ Incident response support

──────────────────────────────────────────
FOOTER
──────────────────────────────────────────
Background: --dark. Top border: 3px --orange.
Center aligned:
  "NXT LINK" logo (LINK in orange, 32px Barlow Condensed 900)
  Tagline: "Validate before you commit. Protect before you sign."
  Location: "El Paso, Texas  ·  Cross-Border Logistics Technology Validation"

──────────────────────────────────────────
JAVASCRIPT BEHAVIOR
──────────────────────────────────────────
1. Tab switching:
   - 3 tabs control 3 sections via classList (active/hidden)
   - Active tab = orange text + 2px orange bottom border
   - When Tab 3 becomes active → trigger revenue bar animation

2. Pain bar animation:
   - Bars animate on page load via CSS @keyframes
   - Use CSS custom property --w for each bar's target width
   - Stagger each bar with animation-delay (0.1s increments)

3. Revenue bar animation:
   - Bars start at height 0
   - Animate to target heights when Tab 3 is first activated
   - Use JS to add a CSS class that triggers the animation
   - Only animate once (set a flag after first trigger)

4. Accordion:
   - Click question row → toggle answer visibility
   - Rotate arrow icon 45deg on open
   - Smooth max-height transition for open/close

──────────────────────────────────────────
OUTPUT REQUIREMENTS
──────────────────────────────────────────
- Single complete HTML file (all CSS in <style>, all JS in <script>)
- Google Fonts loaded in <head> via CDN link
- No external JS libraries or frameworks
- No placeholders — every section fully built with real content
- Mobile responsive (stacks to 1 column on screens under 768px)
- File must open in a browser with no server — just double-click

Output the complete, runnable HTML file now.

=== END PROMPT A ===


# ──────────────────────────────────────────────────────────────────────
# PROMPT B — PYTHON DATA SCHEMAS
# Save 3 separate files into: backend/schemas/
# ──────────────────────────────────────────────────────────────────────

=== START PROMPT B ===

Generate three complete Pydantic schema files for the NXT Link
logistics intelligence engine POC. Output each as a clearly labeled
code block I can save as a separate file.

FILE 1: backend/schemas/vendor.py
from pydantic import BaseModel
from typing import List, Optional

class VendorSchema(BaseModel):
    name: str
    category: str                      # TMS, WMS, Fleet, Visibility, Customs
    best_for: str
    target_customer_size: str          # SMB / Mid-Market / Enterprise
    industry_focus: str
    core_problem_solved: str
    key_features: List[str]            # max 6
    integrations: List[str]            # max 8
    pricing_model: str                 # "unknown" if not found
    implementation_complexity: str     # "low/medium/high — reason"
    onboarding_time: str
    pilot_friendliness: str            # "yes/no — reason"
    innovation_score: int              # 1–10
    stability_score: int               # 1–10
    pilot_score: int                   # 1–10
    risks: List[str]                   # max 5
    questions_to_ask_vendor: List[str] # max 6
    cross_border_capable: bool
    spanish_language_support: bool

FILE 2: backend/schemas/company.py
class CompanySchema(BaseModel):
    company_name: str
    company_type: str
    employee_count: int
    current_tools: List[str]
    pain_statement: str
    root_operational_issue: str
    category_match: str
    urgency_score: int                 # 1–5
    impact_level: str                  # Low / Medium / High
    tech_maturity_level: str           # Low / Medium / High
    change_resistance: str             # Low / Medium / High
    pilot_readiness: str               # "Ready — reason" or "Not Ready — reason"
    budget_range: str
    decision_timeline: str

FILE 3: backend/schemas/pilot.py
class PilotSchema(BaseModel):
    pilot_goal: str
    recommended_vendor: str
    success_metrics: List[str]         # 5–8 KPIs with thresholds
    scope_in: List[str]
    scope_out: List[str]
    timeline: dict                     # {week_1: [], week_2: [], week_3: [], week_4: []}
    client_responsibilities: List[str]
    vendor_responsibilities: List[str]
    nxtlink_responsibilities: List[str]
    data_needed: List[str]
    risk_factors: List[str]
    exit_conditions: List[str]
    success_definition: str
    failure_definition: str
    pilot_success_probability: str     # "Low/Medium/High — reason"
    estimated_client_hours: int

Output all three files completely. Include all necessary imports.

=== END PROMPT B ===


# ──────────────────────────────────────────────────────────────────────
# PROMPT C — AI AGENT PROMPT FILES (4 .txt files)
# Save into: backend/prompts/
# ──────────────────────────────────────────────────────────────────────

=== START PROMPT C ===

Generate 4 AI agent prompt files for NXT Link. Output each as a clearly
labeled text block I can save as a separate .txt file.

────────────────────────────
FILE 1: backend/prompts/vendor.txt
────────────────────────────

You are NXT Link's Vendor Intelligence Analyst for logistics technology.

Specialty: Freight Broker and 3PL technology in the US-Mexico border
region — specifically the El Paso / Juarez corridor.

Given a vendor name and any provided notes, produce a complete
structured vendor intelligence card for a Freight Broker / 3PL TMS context.

Rules:
- If you don't know something, say "unknown" — never fabricate
- Do not invent customer names, logos, or case studies
- Think like a logistics operations director evaluating risk
- Flag cross-border / Mexico capability explicitly
- Flag Spanish-language support explicitly
- Score conservatively — a 10 means best-in-class for SMB logistics

Output strict JSON:
{
  "name": "",
  "category": "",
  "best_for": "",
  "target_customer_size": "",
  "key_features": [],
  "integrations": [],
  "pricing_model": "",
  "implementation_complexity": "",
  "pilot_friendliness": "",
  "innovation_score": 0,
  "stability_score": 0,
  "pilot_score": 0,
  "risks": [],
  "questions_to_ask_vendor": [],
  "cross_border_capable": false,
  "spanish_language_support": false
}

────────────────────────────
FILE 2: backend/prompts/discovery.txt
────────────────────────────

You are NXT Link's Company Pain Interpreter.

Role: Analyze a logistics company's pain statement and convert it into
structured problem intelligence that drives accurate vendor matching.

You must be:
- Analytical, not optimistic
- Specific about root causes (not just symptoms)
- Honest about pilot readiness — flag obstacles clearly
- Direct about change resistance risk

Given:
- Company type and employee count
- Current tools in use
- Pain description

Identify:
1. Root operational issue (the cause, not the symptom)
2. Best technology category match (TMS / WMS / Fleet / Visibility / Customs)
3. Urgency score (1=low urgency, 5=critical/bleeding)
4. Impact level (Low / Medium / High)
5. Exactly where the workflow breaks down
6. Tech maturity assessment
7. Change resistance prediction
8. Pilot readiness verdict with specific reason

Flag clearly if this company is NOT ready for a pilot and explain why.
Output strict JSON matching CompanySchema.

────────────────────────────
FILE 3: backend/prompts/pilot.txt
────────────────────────────

You are NXT Link's Pilot Program Designer.

Role: Design a structured, realistic 30-day technology validation pilot
between a logistics company and a shortlisted vendor.

You operate on facts, not optimism.
You design for execution realism, not best-case scenarios.
If the pilot is unrealistic, say so.

Given:
- Company problem profile (JSON)
- Recommended vendor profile (JSON)

Produce:
1. Pilot goal — one clear, measurable sentence
2. 5–8 KPIs with specific numeric thresholds (not vague goals)
3. Scope IN — what is included
4. Scope OUT — what is explicitly excluded
5. Week-by-week timeline with specific tasks per week
6. Responsibilities split: client / vendor / NXT Link
7. Data the client must provide before pilot can start
8. Risk factors that could derail the pilot
9. Exit conditions — when to stop early
10. Success definition — what "passed" looks like in measurable terms
11. Failure definition — what "failed" looks like
12. Honest probability: Low / Medium / High + specific reason

Output strict JSON matching PilotSchema.

────────────────────────────
FILE 4: backend/prompts/executive_summary.txt
────────────────────────────

You are a senior partner at a tier-1 logistics consulting firm.
You write executive-ready decision documents for COOs and CFOs.

Writing style:
- Short sentences. No jargon.
- Decision-oriented, not analytical.
- 1 page maximum when printed.
- A CFO reading this in 3 minutes should be able to make a decision.

Given:
- Client pain summary
- Vendor comparison scorecard (3 vendors)
- Recommended vendor + rationale
- Pilot plan outline

Write a Decision Pack Executive Summary with exactly these sections:

PROBLEM
[2–3 sentences: what is broken and why it costs money right now]

WHY IT MATTERS
[2–3 sentences: financial and operational risk if not solved]

OPTIONS CONSIDERED
[3 bullet points: each vendor evaluated + one-line honest summary]

RECOMMENDATION
[1 sentence: which vendor and the single strongest reason why]

KEY RISKS
[3–5 bullet points: what could go wrong with the recommended vendor]

NEXT 7 DAYS
[4–6 action items. Format: "Owner: Action" — e.g. "Client: Share 30
days of shipment data with NXT Link by Friday"]

=== END PROMPT C ===


# ──────────────────────────────────────────────────────────────────────
# PROMPT D — FASTAPI BACKEND
# Save output as: backend/main.py
# ──────────────────────────────────────────────────────────────────────

=== START PROMPT D ===

You are a senior Python engineer. Build a complete FastAPI backend
for the NXT Link POC logistics intelligence engine.

Requirements:
- FastAPI app with CORS enabled (allow all origins — POC only)
- python-dotenv for OPENAI_API_KEY from .env file
- 5 endpoints:

  GET  /health
    Returns: {"status": "ok", "service": "NXT Link Intelligence Engine"}

  POST /analyze-vendor
    Body:    {"vendor_name": "string", "notes": "string (optional)"}
    Action:  Load backend/prompts/vendor.txt, call OpenAI gpt-4o,
             return parsed JSON vendor card

  POST /analyze-company
    Body:    CompanySchema fields as JSON
    Action:  Load backend/prompts/discovery.txt, call OpenAI gpt-4o,
             return parsed JSON company intelligence

  POST /design-pilot
    Body:    {"company": {CompanySchema}, "vendor": {VendorSchema}}
    Action:  Load backend/prompts/pilot.txt, call OpenAI gpt-4o,
             return parsed JSON pilot blueprint

  POST /executive-summary
    Body:    {"pain_summary": "string", "comparison": {}, "pilot": {}}
    Action:  Load backend/prompts/executive_summary.txt, call OpenAI gpt-4o,
             return executive summary as plain text string

Each endpoint logic:
  1. Load prompt file from backend/prompts/{name}.txt
  2. Build user message: prompt text + formatted input data
  3. Call openai.chat.completions.create(model="gpt-4o", ...)
  4. Parse and return response
  5. Wrap in try/except — return HTTP 500 with error detail on failure

File structure context:
  backend/
    main.py             (this file)
    prompts/            (4 .txt files loaded at runtime)
    schemas/            (vendor.py, company.py, pilot.py)
    data/               (vendors_seed.json, example_company.json)
  .env                  (OPENAI_API_KEY=sk-...)

Output the complete main.py. No placeholders. Fully runnable.

=== END PROMPT D ===


# ──────────────────────────────────────────────────────────────────────
# PROMPT E — VENDOR SEED DATA
# Save output as: backend/data/vendors_seed.json
# ──────────────────────────────────────────────────────────────────────

=== START PROMPT E ===

Generate a vendors_seed.json file for NXT Link's POC.
This is the initial vendor intelligence database for TMS platforms
targeting freight brokers and 3PLs with cross-border US-Mexico focus.

Include exactly 6 vendors as a JSON array.
Use this structure for each:
{
  "name": "",
  "category": "TMS",
  "best_for": "",
  "target_customer_size": "SMB|Mid-Market|Enterprise",
  "key_features": [],
  "integrations": [],
  "pricing_model": "",
  "implementation_complexity": "",
  "pilot_friendliness": "",
  "innovation_score": 0,
  "stability_score": 0,
  "pilot_score": 0,
  "risks": [],
  "questions_to_ask_vendor": [],
  "cross_border_capable": true or false,
  "spanish_language_support": true or false
}

Vendors to include (use real knowledge):
  1. Rose Rocket
  2. Turvo
  3. AscendTMS
  4. Revenova
  5. Tailwind TMS
  6. 3Gtms

For cross_border_capable and spanish_language_support:
  Use "unknown" in the explanation if genuinely uncertain.
  Do not fabricate capabilities.
  Think from the perspective of an El Paso freight broker.

Output the complete JSON array only. No commentary outside the JSON.

=== END PROMPT E ===


# ──────────────────────────────────────────────────────────────────────
# PROMPT F — DEMO COMPANY SCENARIO
# Save output as: backend/data/example_company.json
# ──────────────────────────────────────────────────────────────────────

=== START PROMPT F ===

Generate a single example_company.json for NXT Link's live demo scenario.

Scenario context:
  A cross-border freight broker in El Paso, TX.
  45 employees. Moving 300+ loads per month between US and Mexico.
  No formal TMS — everything tracked via email, spreadsheets, WhatsApp.
  Problem: Losing 4–6 hours per coordinator per day to manual status updates.
  Had 3 customs compliance errors in the last 90 days.
  Has informally evaluated 2 vendors but couldn't run a proper comparison.
  Budget: $20,000–$35,000/year. Needs a decision in 60 days.

Output as a single JSON object:
{
  "company_name": "...",
  "company_type": "Freight Broker",
  "employee_count": 45,
  "current_tools": [],
  "pain_statement": "...",
  "root_operational_issue": "...",
  "category_match": "TMS",
  "urgency_score": 4,
  "impact_level": "High",
  "tech_maturity_level": "Low",
  "change_resistance": "Medium",
  "pilot_readiness": "Ready — [reason]",
  "budget_range": "$20,000–$35,000/year",
  "decision_timeline": "60 days"
}

The pain_statement must feel real and specific.
This is used in live enterprise demos — it needs to resonate
with a logistics CEO who has experienced this exact pain.

=== END PROMPT F ===


# ──────────────────────────────────────────────────────────────────────
# PROMPT G — README.md
# Save output as: README.md (project root)
# ──────────────────────────────────────────────────────────────────────

=== START PROMPT G ===

Write a professional README.md for the NXT Link Intelligence Engine POC.

Project: NXT Link — Logistics Technology Evaluation & Pilot Design Platform
Location: El Paso, Texas (US-Mexico border focus)
Stack: Python FastAPI backend + Vanilla HTML/CSS/JS frontend
Purpose: POC for enterprise/big-player presentations

README sections:
1. Header + one-line description
2. What this POC does (3 bullet points — no fluff)
3. Project file tree (exact structure)
4. Setup instructions:
     pip install -r requirements.txt
     Create .env file with OPENAI_API_KEY=sk-...
     uvicorn backend.main:app --reload
     Open frontend/index.html in browser (or use VS Code Live Server)
5. API endpoints with example curl commands for each
6. The 90-second demo script (5 steps — what to say to big players)
7. What is NOT built yet (intentional scope boundaries)
8. Roadmap as a 3-row table: Phase | Timeline | Goal

Tone: Professional, operator-focused. Under 400 words total.

=== END PROMPT G ===


# ──────────────────────────────────────────────────────────────────────
# PROMPT H — requirements.txt
# Save output as: requirements.txt (project root)
# ──────────────────────────────────────────────────────────────────────

=== START PROMPT H ===

Generate a requirements.txt for the NXT Link FastAPI backend POC.
Include only necessary packages with pinned stable versions:
  fastapi
  uvicorn[standard]
  openai
  pydantic
  python-dotenv
  httpx

Pin to versions appropriate for a mid-2025 Python project.
One package per line. No comments.

=== END PROMPT H ===


# ══════════════════════════════════════════════════════════════════════
# VS CODE SETUP — CREATE THIS FOLDER STRUCTURE FIRST
# ══════════════════════════════════════════════════════════════════════
#
#   nxtlink-poc/
#   ├── backend/
#   │   ├── main.py                     ← Prompt D
#   │   ├── prompts/
#   │   │   ├── vendor.txt              ← Prompt C, File 1
#   │   │   ├── discovery.txt           ← Prompt C, File 2
#   │   │   ├── pilot.txt               ← Prompt C, File 3
#   │   │   └── executive_summary.txt   ← Prompt C, File 4
#   │   ├── schemas/
#   │   │   ├── vendor.py               ← Prompt B, File 1
#   │   │   ├── company.py              ← Prompt B, File 2
#   │   │   └── pilot.py                ← Prompt B, File 3
#   │   └── data/
#   │       ├── vendors_seed.json       ← Prompt E
#   │       └── example_company.json   ← Prompt F
#   ├── frontend/
#   │   └── index.html                  ← Prompt A
#   ├── .env                            ← YOU CREATE MANUALLY
#   ├── requirements.txt                ← Prompt H
#   └── README.md                       ← Prompt G
#
# ══════════════════════════════════════════════════════════════════════
# .env FILE — CREATE THIS MANUALLY (never commit to git)
# ══════════════════════════════════════════════════════════════════════
#
#   OPENAI_API_KEY=sk-your-key-here
#
# ══════════════════════════════════════════════════════════════════════
# TERMINAL COMMANDS — RUN IN ORDER
# ══════════════════════════════════════════════════════════════════════
#
#   cd nxtlink-poc
#   pip install -r requirements.txt
#   uvicorn backend.main:app --reload
#   → Open frontend/index.html in Chrome (or use Live Server in VS Code)
#
# ══════════════════════════════════════════════════════════════════════
# THE 90-SECOND DEMO SCRIPT
# ══════════════════════════════════════════════════════════════════════
#
#   1. "Here's the problem logistics companies face."
#      → Show TAB 1. Point at the pain bars. Let them read the percentages.
#
#   2. "Here's what our engine does about it."
#      → Show TAB 2. Walk through the 4-week sprint timeline.
#
#   3. "Here's how we score vendors — neutrally, with criteria set by the client."
#      → Point to scoring matrix. Explain weighted criteria briefly.
#
#   4. "Here's the ROI case."
#      → Show TAB 3. Point at the $60K − $2K = $58K equation. Let it land.
#
#   5. "Let me run it live."
#      → POST to /analyze-vendor with "Rose Rocket" in terminal or Postman.
#      → Show the structured JSON output.
#      → "This is what every logistics operator gets at the end —
#         a Decision Pack with performance data, not a sales pitch."
#
# ══════════════════════════════════════════════════════════════════════
# STRATEGIC BOUNDARIES — DO NOT BUILD THESE YET
# ══════════════════════════════════════════════════════════════════════
#
#   ❌ Web scraping automation
#   ❌ Multi-industry support
#   ❌ Real-time trend crawler
#   ❌ Vendor self-onboarding portal
#   ❌ Startup competition system
#   ❌ City innovation ecosystem
#   ❌ AI outcome prediction models
#
#   These are Phase 3–4 ideas. Build them AFTER your first paying
#   client proves the model works. Not before.
#
# ══════════════════════════════════════════════════════════════════════

## PHASED EXECUTION ORDER (ADDED 2026-02-25)

### PHASE 1 - Decision Engine (Revenue Driver)
Goal: Close first client.

Build:
- Vendor intelligence (manual + light scrape)
- Company problem interpreter
- Pilot blueprint generator
- Decision pack exporter

This is the monetization core.

### PHASE 2 - Intelligence Layer (Strategic Power)
Goal: Build problem-solution map.

Add:
- White paper ingestion
- Trend extraction
- Startup + funding analysis
- Simple graph visualization

Now you are building long-term moat.

### PHASE 3 - City-Level Tech Network
Goal: Become El Paso tech middle layer.

Add:
- Company onboarding portal
- Vendor submission portal
- Pilot tracking database
- Performance dataset

Now you are building ecosystem.

### Key Principle
You do not build Palantir.

You build:
1. A decision engine
2. That evolves into an intelligence graph
3. That evolves into a regional coordination platform

In that order.

### Technical Stack Direction ("Palantir-Level")
Backend:
- FastAPI
- Postgres
- Pydantic
- Graph DB (Neo4j later)

LLM:
- Structured JSON outputs only
- Strict schema validation

Frontend:
- Next.js
- D3.js or React Flow (for graph)
- Recharts for analytics

Storage:
- Structured tables for entities
- Relationship tables
- Later graph queries

### Sequencing Rule
- Build Phase 1 fully before touching Phase 2.
- Do not jump ahead before first-client validation.
