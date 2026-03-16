// ─── Industry Trajectory Timeline Data ────────────────────────────────────────
// Provides deep historical milestones (from ~1950) and future projections for each industry.
// Each entry includes year, event, description, companies, and a temporal status.

export type TrajectoryStatus = 'past' | 'present' | 'future';
export type TrajectoryDirection = 'accelerating' | 'steady' | 'decelerating';

export type TrajectoryMilestone = {
  year: number;
  title: string;
  description: string;
  companies: string[];
  status: TrajectoryStatus;
  isInflection?: boolean; // marks a key turning point
};

export type IndustryTrajectory = {
  slug: string;
  direction: TrajectoryDirection;
  milestones: TrajectoryMilestone[];
};

export const INDUSTRY_TRAJECTORIES: Record<string, IndustryTrajectory> = {
  'ai-ml': {
    slug: 'ai-ml',
    direction: 'accelerating',
    milestones: [
      { year: 1950, title: 'Turing Test Proposed', description: 'Alan Turing published "Computing Machinery and Intelligence," introducing the question "Can machines think?" and the Imitation Game.', companies: [], status: 'past', isInflection: true },
      { year: 1956, title: 'Dartmouth Conference — AI Founded', description: 'John McCarthy, Marvin Minsky, and colleagues coined "Artificial Intelligence" at the Dartmouth summer workshop.', companies: [], status: 'past', isInflection: true },
      { year: 1966, title: 'ELIZA — First Chatbot', description: 'MIT\'s Joseph Weizenbaum created ELIZA, demonstrating natural language processing and human-computer conversation.', companies: ['MIT'], status: 'past' },
      { year: 1974, title: 'First AI Winter', description: 'DARPA cut AI funding. The Lighthill Report criticized AI research as overpromised and underdelivered.', companies: [], status: 'past', isInflection: true },
      { year: 1986, title: 'Backpropagation Revival', description: 'Rumelhart, Hinton, and Williams published practical backpropagation, enabling multi-layer neural networks to learn.', companies: [], status: 'past', isInflection: true },
      { year: 1997, title: 'Deep Blue Defeats Kasparov', description: 'IBM\'s Deep Blue beat world chess champion Garry Kasparov, proving machines could outperform humans in complex reasoning tasks.', companies: ['IBM'], status: 'past', isInflection: true },
      { year: 2006, title: 'Deep Learning Era Begins', description: 'Geoffrey Hinton\'s team demonstrated deep belief networks. GPU computing made training large neural networks feasible.', companies: ['Google', 'NVIDIA'], status: 'past', isInflection: true },
      { year: 2012, title: 'AlexNet Shatters ImageNet', description: 'Deep convolutional network won ImageNet by a massive margin, igniting the modern deep learning revolution.', companies: ['University of Toronto'], status: 'past', isInflection: true },
      { year: 2017, title: 'Transformer Architecture Published', description: 'Google\'s "Attention Is All You Need" paper laid the foundation for modern LLMs and generative AI.', companies: ['Google Brain'], status: 'past', isInflection: true },
      { year: 2020, title: 'GPT-3 Demonstrates Scale', description: 'OpenAI released GPT-3 with 175B parameters, proving that scale unlocks emergent capabilities.', companies: ['OpenAI'], status: 'past', isInflection: true },
      { year: 2022, title: 'Generative AI Goes Mainstream', description: 'ChatGPT reached 100M users in 2 months. Stable Diffusion and Midjourney transformed creative workflows.', companies: ['OpenAI', 'Stability AI', 'Midjourney'], status: 'past', isInflection: true },
      { year: 2024, title: 'AI Agents and Reasoning Models', description: 'Chain-of-thought reasoning, tool use, and autonomous AI agents moved from research to production.', companies: ['Anthropic', 'OpenAI', 'Google DeepMind'], status: 'past' },
      { year: 2025, title: 'Autonomous AI Workflows', description: 'Multi-step AI agents handle complex procurement, analysis, and engineering tasks with minimal human oversight.', companies: ['Anthropic', 'Microsoft', 'Salesforce', 'Palantir'], status: 'present', isInflection: true },
      { year: 2027, title: 'AI-Native Software Default', description: 'New enterprise software is AI-first by design. Legacy systems without AI capabilities become obsolete.', companies: ['Anthropic', 'Microsoft', 'Salesforce'], status: 'future' },
      { year: 2030, title: 'AGI-Adjacent Systems', description: 'AI systems capable of scientific research, engineering design, and strategic planning approach human-level reasoning.', companies: ['Anthropic', 'OpenAI', 'Google DeepMind'], status: 'future', isInflection: true },
    ],
  },
  'cybersecurity': {
    slug: 'cybersecurity',
    direction: 'accelerating',
    milestones: [
      { year: 1971, title: 'Creeper — First Computer Virus', description: 'The Creeper worm spread across ARPANET, demonstrating that self-replicating programs could propagate across networks.', companies: ['BBN Technologies'], status: 'past', isInflection: true },
      { year: 1988, title: 'Morris Worm Shuts Down Internet', description: 'Robert Morris\'s worm infected 10% of all internet-connected computers. Led to creation of CERT and modern incident response.', companies: ['CERT/CC'], status: 'past', isInflection: true },
      { year: 1995, title: 'SSL Encryption Standardized', description: 'Netscape released SSL 2.0, enabling encrypted web commerce. Foundation of modern internet security.', companies: ['Netscape'], status: 'past', isInflection: true },
      { year: 2003, title: 'Enterprise Firewall Era', description: 'Network perimeter security became standard. Cisco, Check Point, and Juniper dominated enterprise security spending.', companies: ['Cisco', 'Check Point', 'Juniper'], status: 'past' },
      { year: 2010, title: 'Stuxnet — First Cyber Weapon', description: 'US-Israeli cyberweapon destroyed Iranian nuclear centrifuges. Proved that cyberattacks could cause physical destruction.', companies: ['NSA', 'Unit 8200'], status: 'past', isInflection: true },
      { year: 2013, title: 'Snowden Revelations', description: 'Edward Snowden exposed mass surveillance programs. Accelerated encryption adoption and privacy-first security design.', companies: ['NSA'], status: 'past', isInflection: true },
      { year: 2017, title: 'WannaCry Global Attack', description: 'Ransomware crippled 200K+ systems across 150 countries. Exposed critical infrastructure vulnerabilities worldwide.', companies: ['Microsoft'], status: 'past', isInflection: true },
      { year: 2020, title: 'SolarWinds Supply Chain Breach', description: 'Nation-state attack compromised 18,000+ organizations via software update. Transformed security architecture thinking.', companies: ['SolarWinds', 'FireEye', 'CrowdStrike'], status: 'past', isInflection: true },
      { year: 2022, title: 'Zero Trust Becomes Standard', description: 'Federal government mandated zero-trust architecture. Enterprises abandoned perimeter-based security models.', companies: ['Zscaler', 'Palo Alto Networks', 'Okta'], status: 'past' },
      { year: 2025, title: 'AI vs AI Cyber Warfare', description: 'AI-generated attacks meet AI-powered defenses. Automated red-teaming and continuous penetration testing become essential.', companies: ['CrowdStrike', 'Palo Alto Networks', 'Anthropic'], status: 'present', isInflection: true },
      { year: 2028, title: 'Autonomous Security Operations', description: 'AI-driven SOCs handle 95% of incidents without human intervention. Security analysts focus on strategy and policy.', companies: ['CrowdStrike', 'Microsoft', 'Palo Alto Networks'], status: 'future' },
      { year: 2030, title: 'Post-Quantum Security Standard', description: 'Quantum computers threaten current encryption. Organizations that migrated early gain competitive advantage.', companies: ['IBM', 'Google Quantum', 'IonQ'], status: 'future', isInflection: true },
    ],
  },
  'defense': {
    slug: 'defense',
    direction: 'accelerating',
    milestones: [
      { year: 1947, title: 'Department of Defense Created', description: 'National Security Act reorganized US military under the DoD. Created the CIA, NSC, and unified command structure.', companies: [], status: 'past', isInflection: true },
      { year: 1957, title: 'Sputnik & DARPA Founded', description: 'Soviet satellite launch shocked the US. ARPA (later DARPA) created to ensure US technological superiority.', companies: ['DARPA'], status: 'past', isInflection: true },
      { year: 1960, title: 'Satellite Reconnaissance Begins', description: 'Corona program delivered first satellite photos of Soviet territory. Transformed intelligence collection forever.', companies: ['Lockheed', 'CIA'], status: 'past', isInflection: true },
      { year: 1969, title: 'ARPANET — Internet Born', description: 'DARPA-funded network connected 4 universities. Foundation of the modern internet and digital warfare domain.', companies: ['BBN Technologies', 'DARPA'], status: 'past', isInflection: true },
      { year: 1991, title: 'Gulf War — Precision Strike Revolution', description: 'GPS-guided munitions and stealth aircraft demonstrated precision warfare. "Revolution in Military Affairs" began.', companies: ['Lockheed Martin', 'Raytheon', 'Northrop Grumman'], status: 'past', isInflection: true },
      { year: 2001, title: 'Global War on Terror Begins', description: 'Post-9/11 military transformation toward counterinsurgency, ISR dominance, and special operations.', companies: ['General Atomics', 'L3Harris', 'Palantir'], status: 'past', isInflection: true },
      { year: 2011, title: 'Predator Drone Era Peaks', description: 'Armed UAVs became the defining weapon of modern warfare. Over 400 strikes conducted. Changed rules of engagement.', companies: ['General Atomics', 'Northrop Grumman'], status: 'past' },
      { year: 2018, title: 'National Defense Strategy Shift', description: 'US pivoted from counterterrorism to great power competition with China and Russia. Triggered massive modernization.', companies: ['Lockheed Martin', 'Raytheon', 'Northrop Grumman'], status: 'past', isInflection: true },
      { year: 2022, title: 'Ukraine Drone Warfare Revolution', description: 'Small commercial drones proved decisive in modern warfare. Accelerated autonomous weapons development globally.', companies: ['AeroVironment', 'DJI', 'Baykar'], status: 'past', isInflection: true },
      { year: 2025, title: 'AI-Enabled Decision Advantage', description: 'Real-time AI battlefield awareness and decision support deployed across combatant commands. Sensor fusion at unprecedented scale.', companies: ['Palantir', 'Anduril', 'L3Harris'], status: 'present' },
      { year: 2026, title: 'Autonomous Swarm Operations', description: 'Coordinated drone swarms conduct surveillance, logistics, and defensive operations with minimal human oversight.', companies: ['Shield AI', 'Anduril', 'Skydio'], status: 'present', isInflection: true },
      { year: 2028, title: 'Directed Energy Weapons Deploy', description: 'Laser and high-powered microwave systems enter operational service for base defense and counter-drone missions.', companies: ['Raytheon', 'Lockheed Martin', 'Northrop Grumman'], status: 'future' },
      { year: 2030, title: 'Autonomous Combat Systems', description: 'AI-controlled unmanned systems conduct complex multi-domain operations with human-on-the-loop oversight.', companies: ['Anduril', 'Lockheed Martin', 'BAE Systems'], status: 'future', isInflection: true },
    ],
  },
  'border-tech': {
    slug: 'border-tech',
    direction: 'steady',
    milestones: [
      { year: 1952, title: 'Immigration & Nationality Act', description: 'Established modern US immigration framework. Created the structure that would eventually become ICE and CBP.', companies: [], status: 'past', isInflection: true },
      { year: 1965, title: 'Maquiladora Program Begins', description: 'Mexico\'s Border Industrialization Program created tax-free manufacturing zones along the US border, transforming El Paso-Juarez economy.', companies: [], status: 'past', isInflection: true },
      { year: 1986, title: 'Operation Hold the Line', description: 'El Paso Border Patrol Chief Silvestre Reyes deployed agents in a visible line along the border. First major deterrence strategy.', companies: [], status: 'past', isInflection: true },
      { year: 1994, title: 'NAFTA Opens Trade Corridors', description: 'North American Free Trade Agreement tripled US-Mexico trade. El Paso became a critical logistics gateway.', companies: [], status: 'past', isInflection: true },
      { year: 2003, title: 'CBP & DHS Created', description: 'Department of Homeland Security consolidated border agencies. Customs and Border Protection became largest federal law enforcement.', companies: ['Lockheed Martin', 'Boeing', 'Unisys'], status: 'past', isInflection: true },
      { year: 2011, title: 'SBInet Virtual Fence Failed', description: 'Boeing\'s $1B virtual border fence cancelled after sensor and integration failures. Reset border technology procurement strategy.', companies: ['Boeing'], status: 'past', isInflection: true },
      { year: 2017, title: 'CBP Biometric Entry/Exit', description: 'Facial recognition deployed at airports and land ports of entry for automated traveler identity verification.', companies: ['NEC', 'IDEMIA', 'Unisys'], status: 'past' },
      { year: 2020, title: 'Autonomous Surveillance Towers', description: 'Integrated fixed tower systems with radar, cameras, and AI deployed along southwest border for persistent surveillance.', companies: ['Anduril', 'Elbit Systems', 'General Dynamics'], status: 'past', isInflection: true },
      { year: 2025, title: 'Cross-Border Digital Trade Corridors', description: 'Blockchain-verified supply chain documentation enables pre-clearance and reduced wait times at El Paso crossings.', companies: ['IBM', 'Maersk TradeLens', 'Customs'], status: 'present' },
      { year: 2026, title: 'Integrated Border Intelligence', description: 'Unified sensor fusion platform combining ground sensors, drones, satellites, and signals intelligence for complete situational awareness.', companies: ['Anduril', 'Palantir', 'L3Harris'], status: 'present', isInflection: true },
      { year: 2028, title: 'Autonomous Port Operations', description: 'AI-managed cargo inspection, documentation verification, and traffic routing minimize human bottlenecks at ports of entry.', companies: ['Leidos', 'Anduril', 'SAIC'], status: 'future' },
    ],
  },
  'manufacturing': {
    slug: 'manufacturing',
    direction: 'accelerating',
    milestones: [
      { year: 1913, title: 'Ford Assembly Line', description: 'Henry Ford\'s moving assembly line reduced Model T build time from 12 hours to 93 minutes. Invented modern mass production.', companies: ['Ford'], status: 'past', isInflection: true },
      { year: 1950, title: 'Toyota Production System', description: 'Taiichi Ohno developed lean manufacturing, just-in-time production, and kaizen. Revolutionized global manufacturing efficiency.', companies: ['Toyota'], status: 'past', isInflection: true },
      { year: 1961, title: 'First Industrial Robot', description: 'Unimate robot installed at GM plant. Began the automation revolution in manufacturing.', companies: ['General Motors', 'Unimation'], status: 'past', isInflection: true },
      { year: 1975, title: 'CNC Machining Goes Mainstream', description: 'Computer numerical control transformed precision manufacturing. Enabled complex parts impossible to make by hand.', companies: ['Fanuc', 'Siemens'], status: 'past' },
      { year: 1988, title: 'Six Sigma Quality Revolution', description: 'Motorola developed Six Sigma methodology. GE and others adopted it, achieving 3.4 defects per million opportunities.', companies: ['Motorola', 'GE'], status: 'past', isInflection: true },
      { year: 2000, title: 'China Joins WTO', description: 'China\'s WTO entry triggered massive offshoring wave. US lost 5M+ manufacturing jobs over the next decade.', companies: [], status: 'past', isInflection: true },
      { year: 2011, title: 'Industry 4.0 Coined', description: 'Germany introduced the concept of smart factories connecting IoT, cloud, and analytics. Fourth industrial revolution begins.', companies: ['Siemens', 'Bosch', 'SAP'], status: 'past', isInflection: true },
      { year: 2020, title: 'Supply Chain Shock', description: 'COVID-19 exposed fragile global supply chains. Reshoring and nearshoring to Mexico/US border regions accelerated.', companies: ['Foxconn', 'Tesla', 'TSMC'], status: 'past', isInflection: true },
      { year: 2022, title: 'CHIPS Act & Semiconductor Reshoring', description: '$52B in US government investment to rebuild domestic semiconductor manufacturing capability.', companies: ['TSMC', 'Samsung', 'Intel', 'GlobalFoundries'], status: 'past', isInflection: true },
      { year: 2025, title: 'AI-Optimized Production', description: 'Generative AI designs manufacturing processes, optimizes yields, and predicts equipment failures before they occur.', companies: ['Siemens', 'NVIDIA Omniverse', 'Sight Machine'], status: 'present' },
      { year: 2026, title: 'El Paso Nearshoring Hub', description: 'El Paso-Juarez corridor becomes top-3 US-Mexico manufacturing gateway with advanced automation and binational logistics.', companies: ['Foxconn', 'BorgWarner', 'Schneider Electric'], status: 'present', isInflection: true },
      { year: 2028, title: 'Lights-Out Factories', description: 'Fully autonomous manufacturing facilities operate 24/7 with zero on-site human workers for standard production runs.', companies: ['Tesla', 'FANUC', 'Siemens'], status: 'future' },
      { year: 2030, title: 'Additive Manufacturing at Scale', description: '3D printing produces end-use parts at cost parity with injection molding for runs under 100K units.', companies: ['Desktop Metal', 'Markforged', 'Carbon'], status: 'future', isInflection: true },
    ],
  },
  'energy': {
    slug: 'energy',
    direction: 'accelerating',
    milestones: [
      { year: 1882, title: 'Edison Opens Pearl Street Station', description: 'Thomas Edison launched the first commercial power plant in NYC. Electrification of civilization begins.', companies: ['Edison Electric'], status: 'past', isInflection: true },
      { year: 1935, title: 'Hoover Dam Completed', description: 'Massive hydroelectric project powered the American Southwest. Demonstrated utility-scale renewable energy was viable.', companies: [], status: 'past', isInflection: true },
      { year: 1954, title: 'First Solar Cell at Bell Labs', description: 'Bell Labs demonstrated practical silicon solar cell with 6% efficiency. Planted the seed for solar revolution 50 years later.', companies: ['Bell Labs'], status: 'past', isInflection: true },
      { year: 1957, title: 'First Commercial Nuclear Plant', description: 'Shippingport reactor began generating electricity. Nuclear promised clean, limitless energy — until Three Mile Island.', companies: ['Westinghouse'], status: 'past', isInflection: true },
      { year: 1973, title: 'Oil Embargo Energy Crisis', description: 'OPEC embargo quadrupled oil prices. US created DOE and began investing in energy independence and alternatives.', companies: [], status: 'past', isInflection: true },
      { year: 1992, title: 'Wind Power Becomes Viable', description: 'Modern wind turbine designs achieved cost-competitive electricity in high-wind regions. West Texas emerged as a wind corridor.', companies: ['Vestas', 'GE Wind'], status: 'past' },
      { year: 2008, title: 'Shale Revolution — Fracking Boom', description: 'Hydraulic fracturing unlocked massive US oil and gas reserves. Made the US the world\'s largest energy producer.', companies: ['Halliburton', 'Pioneer Natural Resources'], status: 'past', isInflection: true },
      { year: 2018, title: 'Solar Crosses Grid Parity', description: 'Utility-scale solar became cheaper than new natural gas in most US markets. Triggered massive deployment.', companies: ['First Solar', 'NextEra', 'SunPower'], status: 'past', isInflection: true },
      { year: 2022, title: 'IRA Clean Energy Investment', description: 'Inflation Reduction Act committed $369B to clean energy. Largest climate investment in US history.', companies: ['NextEra', 'Enphase', 'First Solar'], status: 'past', isInflection: true },
      { year: 2024, title: 'AI Data Center Energy Crisis', description: 'AI compute demand drove massive electricity consumption growth. Nuclear and renewables competed for AI contracts.', companies: ['Amazon', 'Microsoft', 'Google', 'Constellation Energy'], status: 'past' },
      { year: 2025, title: 'West Texas Hydrogen Hub', description: 'Green hydrogen production facilities in West Texas leverage abundant wind and solar resources for industrial decarbonization.', companies: ['Air Liquide', 'Green Hydrogen Systems', 'Plug Power'], status: 'present' },
      { year: 2028, title: 'Fusion Energy First Pilot', description: 'First commercial fusion pilot plant delivers net positive energy. Could transform baseload power generation.', companies: ['Commonwealth Fusion', 'TAE Technologies', 'Helion'], status: 'future', isInflection: true },
      { year: 2030, title: 'Carbon-Free Grid Achievable', description: 'Combination of renewables, nuclear, storage, and fusion makes 100% clean electricity grid technically feasible.', companies: ['NextEra', 'Tesla', 'Constellation Energy'], status: 'future' },
    ],
  },
  'healthcare': {
    slug: 'healthcare',
    direction: 'accelerating',
    milestones: [
      { year: 1928, title: 'Penicillin Discovered', description: 'Alexander Fleming discovered the first antibiotic. Transformed medicine and saved hundreds of millions of lives.', companies: [], status: 'past', isInflection: true },
      { year: 1953, title: 'DNA Structure Revealed', description: 'Watson and Crick discovered the double helix. Opened the door to genetics, genomics, and precision medicine.', companies: [], status: 'past', isInflection: true },
      { year: 1967, title: 'First Heart Transplant', description: 'Dr. Christiaan Barnard performed the first human heart transplant. Launched the era of organ transplantation.', companies: [], status: 'past', isInflection: true },
      { year: 1971, title: 'CT Scanner Invented', description: 'Godfrey Hounsfield built the first CT scanner. Medical imaging transformed from X-rays to 3D visualization.', companies: ['EMI'], status: 'past', isInflection: true },
      { year: 1996, title: 'HIPAA & Health Data Standards', description: 'Health Insurance Portability and Accountability Act established data privacy rules and standards for electronic health records.', companies: [], status: 'past' },
      { year: 2003, title: 'Human Genome Project Completed', description: '13-year, $2.7B effort mapped 20,000+ human genes. Foundation for personalized medicine and gene therapy.', companies: ['Celera Genomics', 'NIH'], status: 'past', isInflection: true },
      { year: 2012, title: 'CRISPR Gene Editing Demonstrated', description: 'Doudna and Charpentier published CRISPR-Cas9 gene editing. Enabled precise, programmable modification of DNA.', companies: ['UC Berkeley', 'Broad Institute'], status: 'past', isInflection: true },
      { year: 2018, title: 'FDA Approves First AI Diagnostic', description: 'IDx-DR became first FDA-authorized AI system to make medical diagnoses without physician interpretation.', companies: ['IDx Technologies'], status: 'past', isInflection: true },
      { year: 2020, title: 'mRNA Vaccine Revolution', description: 'COVID-19 mRNA vaccines developed in under a year. Proved mRNA platform could rapidly address pandemics and beyond.', companies: ['Moderna', 'Pfizer', 'BioNTech'], status: 'past', isInflection: true },
      { year: 2022, title: 'AlphaFold Solves Protein Folding', description: 'DeepMind predicted structures of 200M+ proteins. Accelerated drug discovery timelines from years to months.', companies: ['Google DeepMind', 'Isomorphic Labs'], status: 'past', isInflection: true },
      { year: 2025, title: 'Precision Medicine at Scale', description: 'Genomic sequencing plus AI enables personalized treatment plans. Cost of whole genome sequencing falls below $100.', companies: ['Illumina', 'Tempus', 'Foundation Medicine'], status: 'present' },
      { year: 2028, title: 'AI Drug Discovery Acceleration', description: 'AI-designed drugs enter Phase III trials at 3x historical rate. Reduces average drug development cost by 60%.', companies: ['Insilico Medicine', 'Recursion', 'Absci'], status: 'future', isInflection: true },
      { year: 2030, title: 'Digital Twin Medicine', description: 'Patient-specific digital twins simulate treatment outcomes before administration. Personalized dosing and therapy optimization.', companies: ['Siemens Healthineers', 'NVIDIA Clara', 'Dassault'], status: 'future' },
    ],
  },
  'logistics': {
    slug: 'logistics',
    direction: 'steady',
    milestones: [
      { year: 1956, title: 'Shipping Container Invented', description: 'Malcolm McLean introduced the intermodal shipping container. Reduced cargo handling costs by 97% and enabled global trade.', companies: ['Sea-Land'], status: 'past', isInflection: true },
      { year: 1962, title: 'Walmart\'s Distribution Revolution', description: 'Sam Walton built the first hub-and-spoke distribution network. Proved logistics could be a competitive moat.', companies: ['Walmart'], status: 'past', isInflection: true },
      { year: 1973, title: 'Barcode Scanning Adopted', description: 'UPC barcode system standardized. Automated inventory tracking and transformed retail logistics operations.', companies: ['IBM', 'NCR'], status: 'past', isInflection: true },
      { year: 1982, title: 'Toyota JIT Goes Global', description: 'Just-in-time manufacturing spread from Japan to the world. Minimized inventory costs but created supply chain fragility.', companies: ['Toyota'], status: 'past' },
      { year: 1995, title: 'Amazon Redefines Fulfillment', description: 'Amazon launched with a warehouse in Seattle. Would eventually build the most advanced logistics network in history.', companies: ['Amazon'], status: 'past', isInflection: true },
      { year: 2004, title: 'RFID Mandates Begin', description: 'Walmart and DOD mandated RFID tags on pallets. Enabled real-time supply chain visibility at scale.', companies: ['Walmart', 'DOD', 'Zebra Technologies'], status: 'past' },
      { year: 2013, title: 'Amazon Same-Day Delivery', description: 'Amazon Prime raised consumer expectations to same-day and next-day delivery. Forced entire industry to restructure.', companies: ['Amazon', 'FedEx', 'UPS'], status: 'past', isInflection: true },
      { year: 2018, title: 'Amazon Robotics Warehouse Scale', description: 'Amazon deployed 100K+ robots across fulfillment centers. Set the standard for automated warehousing operations.', companies: ['Amazon Robotics', 'Kiva Systems'], status: 'past' },
      { year: 2020, title: 'E-Commerce Logistics Surge', description: 'COVID drove 44% e-commerce growth in one year. Last-mile delivery infrastructure became critical bottleneck.', companies: ['Amazon', 'FedEx', 'UPS', 'Flexport'], status: 'past', isInflection: true },
      { year: 2024, title: 'Autonomous Trucking Corridors', description: 'Self-driving trucks operate regular routes on I-10 and I-35. El Paso becomes key autonomous freight hub.', companies: ['Aurora', 'TuSimple', 'Kodiak Robotics'], status: 'past', isInflection: true },
      { year: 2025, title: 'AI-Optimized Cross-Border Logistics', description: 'ML models predict customs delays, optimize routing, and pre-clear shipments across US-Mexico border crossings.', companies: ['Flexport', 'C.H. Robinson', 'Maersk'], status: 'present' },
      { year: 2028, title: 'Autonomous Supply Chains', description: 'End-to-end AI-managed logistics from factory to doorstep. Zero-human warehouses handle 90% of standard operations.', companies: ['Amazon Robotics', 'AutoStore', 'Covariant'], status: 'future', isInflection: true },
      { year: 2030, title: 'Hyperloop Freight Networks', description: 'High-speed tube transport connects major logistics hubs. El Paso-Dallas corridor under development.', companies: ['Virgin Hyperloop', 'Hyperloop TT'], status: 'future' },
    ],
  },
};

/**
 * Get trajectory timeline for an industry slug.
 * Returns data for known industries; for unknown slugs, returns a generic trajectory.
 */
export function getIndustryTrajectory(slug: string): IndustryTrajectory {
  if (INDUSTRY_TRAJECTORIES[slug]) {
    return INDUSTRY_TRAJECTORIES[slug];
  }
  // Generic fallback for custom/unknown industries
  return {
    slug,
    direction: 'steady',
    milestones: [
      { year: 1950, title: 'Foundation Era', description: 'Post-war innovation boom laid the groundwork. Key research institutions and government programs established the field.', companies: [], status: 'past', isInflection: true },
      { year: 1970, title: 'Industrial Scale-Up', description: 'Technologies matured from research to commercial deployment. First major corporations entered the market.', companies: [], status: 'past' },
      { year: 1990, title: 'Digital Transformation Begins', description: 'Computer automation and early internet connectivity transformed operations and enabled global coordination.', companies: [], status: 'past', isInflection: true },
      { year: 2000, title: 'Dot-Com & Globalization', description: 'Internet-enabled business models and global supply chains reshaped the competitive landscape.', companies: [], status: 'past' },
      { year: 2010, title: 'Mobile & Cloud Era', description: 'Smartphones, cloud computing, and SaaS platforms democratized access and lowered barriers to entry.', companies: [], status: 'past', isInflection: true },
      { year: 2020, title: 'Pandemic Acceleration', description: 'COVID-19 compressed years of digital adoption into months. Remote work and automation became essential.', companies: [], status: 'past', isInflection: true },
      { year: 2025, title: 'AI Integration Phase', description: 'Generative AI and autonomous agents reshape workflows, decision-making, and value creation across the industry.', companies: [], status: 'present' },
      { year: 2030, title: 'Autonomous Operations', description: 'AI-driven automation handles the majority of routine operations. Human focus shifts to strategy and creativity.', companies: [], status: 'future', isInflection: true },
    ],
  };
}

/**
 * Get trajectory direction color.
 */
export function getDirectionColor(direction: TrajectoryDirection): string {
  switch (direction) {
    case 'accelerating': return '#00ff88';
    case 'steady': return '#ffb800';
    case 'decelerating': return '#ff3b30';
  }
}

/**
 * Get trajectory direction arrow symbol.
 */
export function getDirectionArrow(direction: TrajectoryDirection): string {
  switch (direction) {
    case 'accelerating': return '↑';
    case 'steady': return '→';
    case 'decelerating': return '↓';
  }
}

// ─── Industry metadata for trajectory-tracked industries ─────────────────────

export const INDUSTRIES_META: Record<string, { label: string; color: string }> = {
  'ai-ml':          { label: 'AI / ML',        color: '#60a5fa' },
  'cybersecurity':  { label: 'Cybersecurity',   color: '#00d4ff' },
  'defense':        { label: 'Defense',         color: '#ff6400' },
  'border-tech':    { label: 'Border Tech',     color: '#f97316' },
  'manufacturing':  { label: 'Manufacturing',   color: '#00d4ff' },
  'energy':         { label: 'Energy',          color: '#ffd700' },
  'healthcare':     { label: 'Healthcare',      color: '#00ff88' },
  'logistics':      { label: 'Logistics',       color: '#ffb800' },
};

export type FlatMilestone = TrajectoryMilestone & {
  industrySlug: string;
  industryLabel: string;
  industryColor: string;
  direction: TrajectoryDirection;
};

/**
 * Returns ALL milestones across ALL industries, each annotated with its
 * industry slug, label, color, and trajectory direction.
 */
export function getAllTrajectoryMilestones(): FlatMilestone[] {
  const result: FlatMilestone[] = [];
  for (const [slug, traj] of Object.entries(INDUSTRY_TRAJECTORIES)) {
    const meta = INDUSTRIES_META[slug] ?? { label: slug, color: '#ffffff' };
    for (const m of traj.milestones) {
      result.push({
        ...m,
        industrySlug: slug,
        industryLabel: meta.label,
        industryColor: meta.color,
        direction: traj.direction,
      });
    }
  }
  result.sort((a, b) => a.year - b.year);
  return result;
}
