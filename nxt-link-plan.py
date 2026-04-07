import urllib.request
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

# ── Fonts ──────────────────────────────────────────────────────────────────────
FONT_DIR = Path("/tmp/fonts")
FONT_DIR.mkdir(exist_ok=True)

def dl(url, path):
    if not path.exists():
        urllib.request.urlretrieve(url, path)

dl("https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf", FONT_DIR/"Inter.ttf")
dl("https://github.com/google/fonts/raw/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf", FONT_DIR/"DMSans.ttf")
dl("https://github.com/google/fonts/raw/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf", FONT_DIR/"SpaceGrotesk.ttf")

pdfmetrics.registerFont(TTFont("Inter",        str(FONT_DIR/"Inter.ttf")))
pdfmetrics.registerFont(TTFont("DMSans",       str(FONT_DIR/"DMSans.ttf")))
pdfmetrics.registerFont(TTFont("SpaceGrotesk", str(FONT_DIR/"SpaceGrotesk.ttf")))

# ── Colors ─────────────────────────────────────────────────────────────────────
BG      = HexColor("#0A0A0A")
CARD    = HexColor("#111111")
BORDER  = HexColor("#222222")
TEXT    = HexColor("#E8E8E6")
MUTED   = HexColor("#666664")
TEAL    = HexColor("#4F98A3")
GOLD    = HexColor("#E8AF34")
GREEN   = HexColor("#6DAA45")
RED     = HexColor("#DD6974")
VIOLET  = HexColor("#8B7CF8")
WHITE   = HexColor("#FFFFFF")

W, H = letter
ss = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, parent=ss.get(kw.pop("parent","Normal"), ss["Normal"]), **kw)

TITLE   = S("T",  fontName="SpaceGrotesk", fontSize=30, leading=36, textColor=WHITE, spaceAfter=6)
SUB     = S("Su", fontName="Inter",        fontSize=12, leading=18, textColor=MUTED,  spaceAfter=20)
H1      = S("H1", fontName="SpaceGrotesk", fontSize=17, leading=22, textColor=WHITE, spaceBefore=24, spaceAfter=8)
H2      = S("H2", fontName="DMSans",       fontSize=11, leading=14, textColor=TEAL,  spaceBefore=14, spaceAfter=6)
BODY    = S("B",  fontName="Inter",        fontSize=9.5, leading=15, textColor=TEXT,  spaceAfter=6)
SMALL   = S("Sm", fontName="Inter",        fontSize=8,  leading=12, textColor=MUTED, spaceAfter=4)
MONO    = S("M",  fontName="Courier",      fontSize=8,  leading=12, textColor=TEAL)
BULLET  = S("Bu", fontName="Inter",        fontSize=9.5, leading=14, textColor=TEXT,  leftIndent=12, spaceAfter=4)

def rule(c=BORDER, t=0.4): return HRFlowable(width="100%", thickness=t, color=c, spaceAfter=10, spaceBefore=4)
def sp(n=0.12): return Spacer(1, n*inch)
def P(txt, style=None): return Paragraph(txt, style or BODY)
def Bu(txt): return Paragraph(f"<bullet>&bull;</bullet> {txt}", BULLET)

def tbl(data, widths, hbg=TEAL, hfg=BG, rows=(CARD, HexColor("#0D0D0D"))):
    t = Table(data, colWidths=widths)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,0),  hbg),
        ("TEXTCOLOR",     (0,0),(-1,0),  hfg),
        ("FONTNAME",      (0,0),(-1,0),  "SpaceGrotesk"),
        ("FONTSIZE",      (0,0),(-1,0),  8.5),
        ("FONTNAME",      (0,1),(-1,-1), "Inter"),
        ("FONTSIZE",      (0,1),(-1,-1), 9),
        ("TEXTCOLOR",     (0,1),(-1,-1), TEXT),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), rows),
        ("ALIGN",         (0,0),(-1,-1), "LEFT"),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
        ("LEFTPADDING",   (0,0),(-1,-1), 9),
        ("RIGHTPADDING",  (0,0),(-1,-1), 9),
        ("GRID",          (0,0),(-1,-1), 0.3, BORDER),
    ]))
    return t

def page_bg(c, doc):
    c.saveState()
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("Inter", 7)
    c.drawString(0.7*inch, 0.38*inch, "NXT LINK — Product Plan v1.0 — April 2026")
    c.drawRightString(W-0.7*inch, 0.38*inch, f"Page {doc.page}")
    c.restoreState()

def cover(c, doc):
    c.saveState()
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(0, H-4, W, 4, fill=1, stroke=0)
    c.setFillColor(BORDER)
    c.rect(0, 0, W, 0.55*inch, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("Inter", 7)
    c.drawString(0.7*inch, 0.2*inch, "Confidential — NXT LINK / Next Link Solutions LLC — El Paso, Texas")
    c.restoreState()

# ── BUILD ──────────────────────────────────────────────────────────────────────
OUT = "/home/user/workspace/NXT-LINK-Product-Plan.pdf"
doc = SimpleDocTemplate(OUT, pagesize=letter,
    title="NXT LINK — Product Plan",
    author="Perplexity Computer",
    topMargin=0.7*inch, bottomMargin=0.7*inch,
    leftMargin=0.7*inch, rightMargin=0.7*inch)

story = []

# ══════════════════════════════════════════════════════════════
# COVER
# ══════════════════════════════════════════════════════════════
story += [
    sp(1.6),
    P("NXT // LINK", S("tag", fontName="SpaceGrotesk", fontSize=10, textColor=TEAL, spaceAfter=6)),
    P("Product Plan", TITLE),
    P("Simple. Optimized. Built for El Paso.", SUB),
    rule(TEAL, 1),
    sp(0.2),
]

cover_tbl = Table([[
    P("MISSION", S("cm1", fontName="SpaceGrotesk", fontSize=9, textColor=TEAL, spaceAfter=4)),
    P("STACK",   S("cm2", fontName="SpaceGrotesk", fontSize=9, textColor=GOLD, spaceAfter=4)),
],[
    P("Be El Paso's eyes on the world of technology — showing local operators "
      "what tech exists, what companies sell it, what conferences are happening, "
      "and what's coming before anyone else in the city knows.",
      S("cb1", fontName="Inter", fontSize=9, textColor=TEXT, leading=14)),
    P("Next.js 14 · TypeScript · Tailwind · Supabase (free) · Clearbit logos (free) · "
      "Google News RSS (free) · SAM.gov (free) · arXiv filtered out",
      S("cb2", fontName="Inter", fontSize=9, textColor=TEXT, leading=14)),
]], colWidths=[3.3*inch, 3.3*inch])
cover_tbl.setStyle(TableStyle([
    ("BACKGROUND",    (0,0),(0,-1), HexColor("#0C1819")),
    ("BACKGROUND",    (1,0),(1,-1), HexColor("#13110A")),
    ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ("TOPPADDING",    (0,0),(-1,-1), 12),
    ("BOTTOMPADDING", (0,0),(-1,-1), 12),
    ("LEFTPADDING",   (0,0),(-1,-1), 14),
    ("GRID",          (0,0),(-1,-1), 0.3, BORDER),
]))
story += [cover_tbl, sp(0.3),
    P("April 2026  ·  El Paso, Texas",
      S("meta", fontName="Inter", fontSize=8.5, textColor=MUTED))]
story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# PAGE 2 — THE 3 THINGS NXT LINK DOES
# ══════════════════════════════════════════════════════════════
story += [
    P("What NXT LINK Does", H1), rule(),
    P("Three jobs. Nothing more.", S("focus", fontName="DMSans", fontSize=11, textColor=GOLD, spaceAfter=12)),
]

three = tbl([
    ["#", "Job", "What the user experiences"],
    ["1", "Shows what's happening in the world",
     "Daily brief — plain English — 5 things that happened globally that matter to El Paso today."],
    ["2", "Shows what tech and companies exist",
     "Browse 442 vendors + 1,041 products like Amazon. Logos, stories, what they sell, IKER score."],
    ["3", "Shows what conferences are happening",
     "1,040 conferences tracked. Who exhibited, what they sell, contact them directly."],
], [0.3*inch, 1.6*inch, 4.6*inch], hbg=HexColor("#0C1819"), hfg=TEAL)
story += [three, sp(0.2)]

story += [P("Everything else supports these three jobs.", SMALL), sp()]

# ══════════════════════════════════════════════════════════════
# PAGE 3 — THE 4 CORE PAGES
# ══════════════════════════════════════════════════════════════
story += [
    P("The 4 Pages That Matter", H1), rule(),
    P("Every other page is detail. These 4 are the product.", BODY), sp(0.1),
]

pages = tbl([
    ["Page", "URL", "One job", "Status"],
    ["Home / Command", "/",          "Top 3 things to act on + Ask anything",          "Working"],
    ["Daily Brief",    "/briefing",  "Plain English morning read for El Paso",          "Working — needs more sectors"],
    ["Discover",       "/discover",  "Amazon-style directory: companies + products + conferences", "Building now"],
    ["Signal Feed",    "/intel",     "Global tech feed: all sectors, all countries",    "Fixed today"],
], [0.95*inch, 0.75*inch, 3.2*inch, 1.15*inch])
story += [pages, sp()]

story += [
    P("Pages to simplify or remove", H2),
    Bu("/solve — merge into home page search bar"),
    Bu("/command — redirect to /map (already done)"),
    Bu("/signals — duplicate of /intel, remove"),
    Bu("/iker — empty stub, remove or build properly"),
    Bu("/test-api — internal only, restrict access"),
    sp(0.1),
]
story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# PAGE 4 — THE DISCOVER PAGE (NEW)
# ══════════════════════════════════════════════════════════════
story += [
    P("The Discover Page — Build Plan", H1), rule(),
    P("This is the page El Paso has never had. Browse every tech company, product, "
      "and conference the way you browse Amazon.", BODY),
    sp(0.1),
]

story += [P("What it contains", H2)]
discover = tbl([
    ["Section", "Data source", "What user sees"],
    ["Companies",     "vendors table (442)",     "Logo + name + what they sell + IKER score + latest signal"],
    ["Products",      "products table (1,041)",  "Product name + category + description + which company sells it"],
    ["Conferences",   "conferences table (1,040)","Conference name + location + exhibitors + what was shown"],
    ["Exhibitors",    "exhibitors table (236)",   "Companies that showed up + what they presented"],
], [1.1*inch, 1.8*inch, 3.6*inch])
story += [discover, sp(0.15)]

story += [P("Filters (simple)", H2),
    Bu("By sector: Defense · Logistics · AI/ML · Border Tech · Manufacturing · Energy · Cybersecurity · Space"),
    Bu("By type: Companies · Products · Conferences"),
    Bu("Search: one bar, searches everything"),
    sp(0.1),
]

story += [P("Company card — what it shows", H2)]
card = tbl([
    ["Element", "Source", "Example"],
    ["Logo",         "logo.clearbit.com (free)", "jacobs.com → Jacobs logo auto-loaded"],
    ["Name",         "vendors.company_name",     "Jacobs Solutions"],
    ["What they do", "vendors.description",      "Infrastructure, border, Fort Bliss contracts"],
    ["IKER Score",   "vendors.iker_score",        "100 — shown as green badge"],
    ["Sector",       "vendors.sector",            "Infrastructure & Defense"],
    ["Latest signal","intel_signals.title",       "Jacobs wins $2.1B border infrastructure contract"],
    ["Why El Paso",  "Claude-written copy",       "Already holds DHS/CBP border contracts — direct local relevance"],
], [1.0*inch, 1.5*inch, 4.0*inch])
story += [card, sp()]
story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# PAGE 5 — CONFERENCE TRACKING
# ══════════════════════════════════════════════════════════════
story += [
    P("Conference Tracking — How It Works", H1), rule(),
    P("NXT LINK scrapes conference websites to find who exhibited, what they sell, "
      "and who El Paso operators should talk to.", BODY), sp(0.1),
]

story += [P("What already exists (don't rebuild)", H2)]
exists = tbl([
    ["What", "Status", "Where in code"],
    ["1,040 conferences in DB",          "Live",    "conferences table"],
    ["Exhibitor scraper agent",          "Built",   "src/lib/agents/agents/exhibitor-scraper-agent.ts"],
    ["Conference exhibitor detector",    "Built",   "src/lib/agents/agents/conference-exhibitor-detector.ts"],
    ["236 exhibitors in DB",             "Live",    "exhibitors table"],
    ["Conference intel agent",           "Built",   "src/lib/agents/agents/conference-intel-agent.ts"],
    ["/conferences page",                "Live",    "src/app/conferences/page.tsx"],
    ["Conference → vendor links",        "Live",    "conference_vendor_links table (236 rows)"],
], [1.6*inch, 0.7*inch, 4.2*inch])
story += [exists, sp(0.15)]

story += [P("What needs to be built / fixed", H2)]
missing = tbl([
    ["What", "Why", "Who builds it"],
    ["Wire exhibitors into Discover page",
     "Users can't see which companies attended which conferences",
     "Computer"],
    ["Trigger conference scraper on schedule",
     "Agent exists but runs manually — needs daily cron",
     "Computer"],
    ["Conference detail page shows exhibitors",
     "/conference/[id] needs exhibitor grid with logos + what they sell",
     "Computer + Claude"],
    ["Connect company → conferences attended",
     "Vendor card should show 'Attended 3 conferences this year'",
     "Claude (API) + Computer (UI)"],
    ["Extract 'what was announced' from each conference",
     "conference_intel agent exists — needs UI surface",
     "Claude"],
], [1.6*inch, 2.2*inch, 2.0*inch], hbg=GOLD, hfg=BG)
story += [missing, sp()]
story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# PAGE 6 — THE BRAIN (HOW DOTS GET CONNECTED)
# ══════════════════════════════════════════════════════════════
story += [
    P("The Brain — Connecting the Dots", H1), rule(),
    P("NXT LINK already has the engines. They just aren't turned on for users to see.", BODY), sp(0.1),
]

story += [P("Engines built — not yet visible", H2)]
brain = tbl([
    ["Engine", "What it does", "Status"],
    ["convergence-engine",      "Detects when patents + funding + contracts spike in same sector",   "Built — not wired to any page"],
    ["connection-engine",       "Maps signal → tech → products → vendors you can call",             "Built — only used in /solve"],
    ["neural-map",              "Builds node/edge map of how industries and companies connect",      "Built — not shown"],
    ["predictive-engine",       "Predicts what happens next based on signal patterns",               "Built — not shown"],
    ["narrative-engine",        "Writes the story connecting multiple signals",                      "Built — not shown"],
    ["signal-connections",      "Finds all related signals to any given signal",                     "Built — API exists, no UI"],
    ["causal-engine",           "CAUSE → EFFECT → CONSEQUENCE → ACTION",                            "Working — only 6 templates"],
], [1.5*inch, 3.0*inch, 2.0*inch])
story += [brain, sp(0.15)]

story += [
    P("What to wire (in order)", H2),
    Bu("1. Sector momentum board on Home — which sectors are rising/falling this week (convergence engine)"),
    Bu("2. 'What changed' on every signal card — click any signal, see 5 related signals (signal-connections engine)"),
    Bu("3. 'Here's what happens next' on Briefing — predictive engine output surfaced in plain English"),
    Bu("4. Expand causal chain templates from 6 → 50 (Claude writes these)"),
    Bu("5. Wire narrative engine to briefing — replace canned text with real generated stories"),
    sp(0.1),
]
story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# PAGE 7 — FIX LIST + BUILD ORDER
# ══════════════════════════════════════════════════════════════
story += [
    P("What's Broken + Build Order", H1), rule(),
    P("Fixes first. New features second. Brain third.", BODY), sp(0.1),
]

story += [P("Fixes — do right now (Perplexity Computer)", H2)]
fixes = tbl([
    ["Fix", "Problem", "Time"],
    ["Signal page",        "Shows 0 signals — fixed today",                           "Done"],
    ["arXiv filter",       "28% of signals are academic papers — filtered at query",   "Done"],
    ["Explore graph",      "Knowledge graph renders as black canvas",                  "Next"],
    ["Nav consistency",    "3 competing nav systems showing different pages",           "1 hour"],
    ["Industry taxonomy",  "ai-ml / artificial intelligence / tech = 3 separate buckets","1 hour"],
    ["Briefing sectors",   "Only manufacturing + logistics — missing 6 sectors",       "Claude"],
    ["Button colors",      "Purple search button — should be teal everywhere",          "30 min"],
    ["Industries skeletons","Bottom of /industry page never loads",                    "30 min"],
], [1.4*inch, 3.0*inch, 0.9*inch])
story += [fixes, sp(0.15)]

story += [P("Build order — what gets built and when", H2)]
order = tbl([
    ["Sprint", "What", "Who"],
    ["Now",    "Fix Explore graph + nav + colors + skeleton loaders",            "Computer"],
    ["Now",    "Write 10 new causal chain templates for all 8 sectors",          "Claude"],
    ["Now",    "Write briefing agent v2 — all 8 sectors",                        "Claude"],
    ["Week 1", "Build /discover page — company directory with logos",            "Computer + Claude"],
    ["Week 1", "Wire conference exhibitors into /discover",                      "Computer"],
    ["Week 1", "Add 'Why El Paso' copy to top 50 companies",                     "Claude"],
    ["Week 2", "Sector momentum board on Home page",                             "Computer"],
    ["Week 2", "Signal connection view — click signal, see related web",         "Computer"],
    ["Week 2", "Conference detail pages with exhibitor grid",                    "Computer + Claude"],
    ["Week 3", "Wire predictive engine to Briefing",                             "Computer + Claude"],
    ["Week 3", "Ask anything bar with real knowledge graph answers",             "Computer + Claude"],
    ["Week 4", "Global heat map — where is tech hot by country",                 "Computer"],
], [0.7*inch, 3.5*inch, 2.3*inch])
story += [order, sp()]
story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# PAGE 8 — WHO DOES WHAT (COMPUTER VS CLAUDE)
# ══════════════════════════════════════════════════════════════
story += [
    P("Who Does What", H1), rule(),
    P("Two AIs. One mission. Clear division.", BODY), sp(0.1),
]

division = tbl([
    ["Task type", "Perplexity Computer", "Claude"],
    ["Fixing broken pages",         "YES — builds and deploys",          "No"],
    ["Building new UI pages",       "YES — writes React + API routes",   "Writes logic files"],
    ["Pushing to GitHub",           "YES — direct access",               "No"],
    ["Querying Supabase live",      "YES — direct access",               "No — needs paste"],
    ["Searching the web now",       "YES — real time",                   "No"],
    ["Writing intelligence agents", "Basic",                             "YES — expert level"],
    ["Writing causal templates",    "No",                                "YES — writes 10+ at once"],
    ["Writing company stories",     "No",                                "YES — quality copy"],
    ["Reading entire white papers", "Partial",                           "YES — 200K context"],
    ["Connecting dots across data", "Good",                              "YES — best available"],
    ["Generating briefing narratives","No",                              "YES — strong writer"],
    ["Expanding sector summaries",  "No",                                "YES — writes all 8"],
], [1.7*inch, 2.3*inch, 2.5*inch])
story += [division, sp(0.2)]

story += [
    P("The handoff loop", H2),
    Bu("1. Computer pulls live data from Supabase"),
    Bu("2. Computer drops data into _collab/inbox/for-claude/"),
    Bu("3. Claude reads it, writes agents/analysis/copy"),
    Bu("4. Claude drops files into _collab/inbox/for-computer/"),
    Bu("5. Computer deploys to GitHub → Vercel auto-builds"),
    Bu("6. Both update _collab/sessions/ with what was done"),
    sp(0.15),
]

story += [rule(TEAL, 0.8),
    P("Built by Perplexity Computer  ·  April 2026  ·  NXT LINK / Next Link Solutions LLC — El Paso, Texas",
      S("foot", fontName="Inter", fontSize=7.5, textColor=MUTED))]

# ── Compile ────────────────────────────────────────────────────────────────────
doc.build(story, onFirstPage=cover, onLaterPages=page_bg)
print("Done:", OUT)
