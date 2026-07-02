// The seven event-concept templates. Each prefills the concept builder;
// admins edit everything before an event goes active. Speakers/vendors are
// ROLE descriptions, never invented names — real people and companies get
// filled in during planning.
//
// Worker-friendly rule baked into every template: events showcase technology
// that supports productivity, safety, quality, visibility, training, and
// maintenance while supporting the existing workforce — never "replace
// workers" positioning.

export interface EventConceptTemplate {
  key: string;
  title: string;
  audience: string;
  theme: string;
  speakers: string[]; // role descriptions to recruit
  vendors: string[]; // vendor categories to recruit
  demos: string[];
  venue: string;
  sponsors: string[];
  value_statement: string;
  anti_sales_safeguards: string;
  follow_up_plan: string;
  revenue_model: string;
}

export const EVENT_CONCEPT_TEMPLATES: EventConceptTemplate[] = [
  {
    key: 'warehouse-tech-showcase',
    title: 'Warehouse Technology Showcase',
    audience:
      'El Paso warehouse operators, 3PLs, and distribution-center managers; operations, inventory, and IT leads.',
    theme:
      'Practical warehouse technology working in facilities like yours: inventory tracking, barcode/RFID, visibility dashboards, and worker-support tools.',
    speakers: [
      'A local warehouse operations leader sharing a real implementation story',
      'A hands-on integrator explaining what implementations actually take',
      'A floor supervisor on how the tools changed daily work (worker perspective)',
    ],
    vendors: [
      'Barcode / RFID systems',
      'Inventory tracking / WMS',
      'Visibility dashboards',
      'Safety and training tech',
    ],
    demos: [
      'Live barcode receiving flow on a mock dock table',
      'Inventory accuracy dashboard fed by a live scan',
      'Wearable or handheld tools workers actually use',
    ],
    venue: 'A working warehouse or a venue with dock-like demo space in El Paso.',
    sponsors: ['A vendor category sponsor per demo station', 'A local logistics association'],
    value_statement:
      'Attendees leave knowing which specific tools fit their facility, what they cost to run, and what implementation really involves — from peers, not pitch decks.',
    anti_sales_safeguards:
      'Talks are case studies, not product pitches; every demo must show a real workflow; no badge scanning without consent; vendor follow-up only for attendees who opt in.',
    follow_up_plan:
      'Within one week: thank-you note with demo recap links, opt-in vendor introductions, and an offer for a free facility walkthrough for interested attendees.',
    revenue_model: 'Vendor demo-station fees + one headline sponsor; attendees free.',
  },
  {
    key: 'juarez-manufacturing-tech-day',
    title: 'Juárez Manufacturing Tech Day',
    audience:
      'Ciudad Juárez manufacturers and maquiladora plant managers, quality leads, production engineers; bilingual (ES primary).',
    theme:
      'Tecnología práctica para plantas de manufactura: calidad, instrucciones de trabajo digitales, mantenimiento y tableros de producción — apoyando a la fuerza laboral existente.',
    speakers: [
      'A plant manager sharing a quality-inspection or digital work-instruction rollout',
      'A maintenance leader on downtime tracking results',
      'A workforce-development voice on training workers into new tools',
    ],
    vendors: [
      'Quality inspection tools',
      'Digital work instructions',
      'Maintenance tracking (CMMS)',
      'Production dashboards',
    ],
    demos: [
      'Digital work instruction station (ES/EN toggle)',
      'Quality inspection with photo capture and defect tagging',
      'Maintenance ticket flow from the floor to the dashboard',
    ],
    venue: 'A maquiladora training room or an industrial-park event space in Juárez.',
    sponsors: ['An industrial park or manufacturers association', 'A demo-station vendor sponsor'],
    value_statement:
      'Plants see, in Spanish, tools that reduce defects and downtime while making operators’ jobs easier — with honest cost and effort numbers.',
    anti_sales_safeguards:
      'All content bilingual with ES first; case studies over pitches; no attendee lists sold; introductions only when the plant asks for one.',
    follow_up_plan:
      'Bilingual recap with each demo’s one-page summary; opt-in vendor matching; offer of a free 30-minute needs conversation.',
    revenue_model: 'Vendor demo fees + association co-host; attendees free.',
  },
  {
    key: 'cross-border-innovation-forum',
    title: 'Cross-Border Industrial Innovation Forum',
    audience:
      'Leaders from both sides of the border: logistics companies, customs brokers, manufacturers, warehouses, economic-development groups, investors.',
    theme:
      'The El Paso–Juárez region as one industrial system: cross-border visibility, trade compliance tech, and shared workforce development.',
    speakers: [
      'A binational logistics operator on cross-border visibility wins',
      'A customs/trade-compliance expert on process + technology',
      'An economic-development voice on the regional technology corridor',
    ],
    vendors: [
      'Cross-border logistics visibility',
      'Customs / trade compliance software',
      'Freight and transportation tech',
      'IoT tracking for cross-border moves',
    ],
    demos: [
      'Live shipment tracking across the border crossing',
      'Customs document automation walkthrough',
    ],
    venue: 'A binational venue or rotating El Paso / Juárez location with hybrid streaming.',
    sponsors: ['Economic-development partners', 'A logistics or trade association', 'A headline vendor'],
    value_statement:
      'The only room where both sides of the border compare notes on what actually works for cross-border operations — and leave with concrete contacts.',
    anti_sales_safeguards:
      'Panel-first format; vendors speak only inside problem-focused panels; curated B2B meetings are double-opt-in.',
    follow_up_plan:
      'Shared attendee-approved contact sheet, panel recordings, and scheduled follow-up B2B meeting slots within two weeks.',
    revenue_model: 'Sponsorships + paid B2B matchmaking tables; standard seats low-cost.',
  },
  {
    key: 'smart-warehouse-maquila-expo',
    title: 'Smart Warehouse & Maquiladora Solutions Expo',
    audience:
      'Larger mixed audience: warehouse + manufacturing operators across the region, from supervisors to owners; vendors with booths.',
    theme:
      'A full expo floor of worker-supportive warehouse and manufacturing solutions — software, hardware, equipment, services — organized by the problem they solve.',
    speakers: [
      'Keynote: a regional operator’s multi-year modernization story',
      'Problem-track hosts (inventory, quality, safety, maintenance, logistics)',
    ],
    vendors: [
      'All directory categories, organized by problem solved rather than product type',
    ],
    demos: [
      'Problem-track demo stages (20-minute rotating slots)',
      'A "worker experience" corridor showing tools from the operator’s point of view',
    ],
    venue: 'Convention-scale venue in El Paso with shuttle support from Juárez.',
    sponsors: ['Track sponsors per problem area', 'Lanyard/registration sponsor', 'Regional partners'],
    value_statement:
      'One day to compare every relevant solution side by side, organized by the problem you’re trying to solve, with staff who can answer in English or Spanish.',
    anti_sales_safeguards:
      'Booths grouped by problem, not vendor size; demo slots must show real workflows; attendee contact info shared only on badge-scan consent.',
    follow_up_plan:
      'Post-expo "which problems did you flag?" survey drives curated vendor intro packets; pilot-program sign-up desk results routed within one week.',
    revenue_model: 'Booth packages + track sponsorships + premium matchmaking; attendee tickets low-cost.',
  },
  {
    key: 'worker-support-demo-day',
    title: 'Worker-Support Technology Demo Day',
    audience:
      'Operations leaders AND floor workers/supervisors together; workforce boards, training orgs.',
    theme:
      'Technology that makes industrial jobs safer, easier to learn, and better — demonstrated by and for the people who use it. Explicitly not an automation-to-cut-headcount event.',
    speakers: [
      'Workers who use the tools daily (paired with their supervisors)',
      'A training/workforce-development leader',
      'A safety leader on measurable incident reductions',
    ],
    vendors: [
      'Training systems',
      'Safety solutions',
      'Wearables / ergonomic support',
      'Digital work instructions',
    ],
    demos: [
      'Try-it-yourself stations where attendees do the task with and without the tool',
      'Training-mode walkthroughs in ES and EN',
    ],
    venue: 'Training center or community-college industrial lab, either side of the border.',
    sponsors: ['Workforce boards', 'Training organizations', 'A safety-focused vendor sponsor'],
    value_statement:
      'Proof, hands-on, that the right technology supports workers instead of replacing them — and a shortlist of tools worth piloting.',
    anti_sales_safeguards:
      'Every demo must be operable by a first-time user in under five minutes; messaging reviewed against the worker-support rule; no headcount-reduction claims allowed on the floor.',
    follow_up_plan:
      'Pilot-interest list routed to vendors ONLY with attendee consent; training-org partnerships offered to interested companies.',
    revenue_model: 'Vendor station fees; grant/partner co-funding; attendees free.',
  },
  {
    key: 'supply-chain-visibility-roundtable',
    title: 'Supply Chain Visibility Roundtable',
    audience:
      'A small curated group (15–25) of supply-chain, logistics, and inventory leaders with a real visibility problem.',
    theme:
      'Closed-door working session: where shipments, inventory, and orders go dark today, and what tooling actually fixes it.',
    speakers: [
      'A facilitator who keeps it problem-first',
      'One practitioner with a before/after visibility story',
    ],
    vendors: [
      'At most two visibility vendors, present only for the demo segment',
    ],
    demos: ['A single deep-dive demo chosen by pre-event attendee vote'],
    venue: 'Boardroom setting; rotates among member companies.',
    sponsors: ['One discreet sponsor underwriting lunch, no speaking slot'],
    value_statement:
      'Frank peer conversation under Chatham House Rule; attendees leave with a map of what peers use and what it really cost.',
    anti_sales_safeguards:
      'Chatham House Rule; vendors present only during the voted demo segment; no recordings; no attendee list distribution.',
    follow_up_plan:
      'Anonymous summary of problems raised; individual opt-in follow-ups; next roundtable date set on the spot.',
    revenue_model: 'Lunch sponsor only — this format builds trust, not revenue.',
  },
  {
    key: 'quality-safety-productivity-forum',
    title: 'Quality / Safety / Productivity Tech Forum',
    audience:
      'Quality managers, EHS/safety leads, and continuous-improvement engineers from both sides of the border.',
    theme:
      'Measurable wins: inspection tech, safety systems, and productivity dashboards with the numbers behind them.',
    speakers: [
      'A quality manager presenting defect-rate results with the tool stack behind them',
      'A safety lead on incident-tracking implementation',
      'A CI engineer on dashboard adoption by line teams',
    ],
    vendors: [
      'Quality inspection tools',
      'Safety systems',
      'Productivity/OEE dashboards',
      'Sensor/IoT monitoring',
    ],
    demos: [
      'Inspection station with live defect tagging',
      'Incident report to corrective-action flow',
      'A line dashboard built live from sample data',
    ],
    venue: 'Technical-college lab or industrial training center; hybrid option for plant teams.',
    sponsors: ['A certification/training body', 'Demo-station vendor sponsors'],
    value_statement:
      'Every session ends with the metric it moved, the effort it took, and what the team would do differently — decision-ready information.',
    anti_sales_safeguards:
      'Presentations must include real metrics and effort/cost honesty; vendor slides capped; Q&A prioritizes practitioners.',
    follow_up_plan:
      'Metrics one-pagers per session; opt-in vendor intros; invitation into the next quarter’s roundtable for engaged attendees.',
    revenue_model: 'Modest tickets + demo-station fees + training-body sponsorship.',
  },
];

export function getTemplate(key: string): EventConceptTemplate | undefined {
  return EVENT_CONCEPT_TEMPLATES.find((t) => t.key === key);
}
