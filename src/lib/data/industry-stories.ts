// Industry stories — simple storytelling data for each industry
// Powers the "What's happening" overview and tech journey timeline

import type { IndustrySlug } from '@/lib/data/technology-catalog';

export type IndustryStory = {
  slug: IndustrySlug;
  headline: string;
  summary: string;
  bullets: string[];
  problems: string[];
  outlook: string;
  journey: { decade: string; title: string; description: string }[];
  techMap: { name: string; children: string[] }[];
};

export const INDUSTRY_STORIES: Record<IndustrySlug, IndustryStory> = {
  'ai-ml': {
    slug: 'ai-ml',
    headline: 'AI is transforming every industry at once',
    summary: 'Artificial intelligence and machine learning have moved from research labs into production systems across defense, healthcare, logistics, and manufacturing. Large language models, computer vision, and edge AI are being deployed at scale, while MLOps platforms manage model lifecycles. El Paso is positioned at the intersection of defense AI (Fort Bliss), border intelligence, and emerging enterprise applications.',
    problems: ['Shortage of ML engineers and data scientists', 'Model bias and fairness in government applications', 'High compute costs for training and inference', 'Data quality and labeling bottlenecks', 'Regulatory uncertainty around AI in critical systems', 'Integration with legacy enterprise software'],
    outlook: 'The market is moving toward smaller, more efficient models that run on edge devices, reducing cloud dependency. Autonomous agents capable of multi-step reasoning are emerging as the next wave. Defense and government adoption is accelerating, with Fort Bliss and border agencies actively piloting AI systems. Expect consolidation among AI startups and increasing demand for AI governance tools.',
    bullets: [
      'Large language models are being deployed across government and defense',
      'Edge AI runs directly on devices without needing the cloud',
      'Computer vision automates inspection, surveillance, and quality control',
      'MLOps platforms manage AI models like software — versioned, monitored, updated',
    ],
    journey: [
      { decade: '1990s', title: 'Expert Systems', description: 'Rule-based programs that mimicked human decisions in narrow domains' },
      { decade: '2000s', title: 'Machine Learning', description: 'Algorithms that learned from data instead of following rules' },
      { decade: '2010s', title: 'Deep Learning', description: 'Neural networks cracked image recognition, speech, and translation' },
      { decade: '2020s', title: 'Generative AI', description: 'Foundation models create text, images, and code from natural language' },
      { decade: '2030s', title: 'Autonomous Agents', description: 'AI systems that plan, reason, and act independently' },
    ],
    techMap: [
      { name: 'AI / ML', children: ['Computer Vision', 'NLP', 'Generative AI', 'Edge AI', 'MLOps', 'Anomaly Detection', 'Reinforcement Learning'] },
    ],
  },

  'cybersecurity': {
    slug: 'cybersecurity',
    headline: 'Cyber threats are evolving faster than defenses',
    summary: 'Cybersecurity is experiencing rapid transformation as AI-powered threats outpace traditional defenses. Zero Trust architectures are replacing perimeter-based security, while operational technology (OT) security for industrial systems becomes critical. The El Paso region faces unique threats at the intersection of military networks, border infrastructure, and cross-border commerce.',
    problems: ['Ransomware targeting critical infrastructure', 'IT/OT convergence creating new attack surfaces', 'Shortage of qualified cybersecurity professionals', 'Nation-state threats to defense and border systems', 'Supply chain compromise and third-party risk', 'Legacy systems that cannot be easily patched'],
    outlook: 'AI-native security platforms will increasingly automate threat detection and response, reducing dependence on human analysts. Zero Trust adoption will accelerate across government agencies. The convergence of IT and OT security creates significant opportunity for vendors who can bridge both worlds. Military installations and border infrastructure will drive sustained demand in the El Paso region.',
    bullets: [
      'Zero Trust is replacing perimeter security — verify everything, trust nothing',
      'AI-powered threats require AI-powered defenses',
      'Industrial systems (power plants, water) are now prime targets',
      'DevSecOps bakes security into software from day one',
    ],
    journey: [
      { decade: '1990s', title: 'Firewalls & Antivirus', description: 'Basic perimeter defenses kept networks safe from early threats' },
      { decade: '2000s', title: 'SIEM & IDS', description: 'Security monitoring systems watched network traffic for suspicious patterns' },
      { decade: '2010s', title: 'Cloud Security', description: 'Security moved to the cloud as infrastructure shifted off-premises' },
      { decade: '2020s', title: 'Zero Trust', description: 'Every user and device must prove identity — no implicit trust' },
      { decade: '2030s', title: 'AI-Native Security', description: 'Autonomous security systems detect and respond faster than humans' },
    ],
    techMap: [
      { name: 'Cybersecurity', children: ['Zero Trust', 'SIEM', 'EDR', 'Threat Intelligence', 'ICS/OT Security', 'DevSecOps'] },
    ],
  },

  'defense': {
    slug: 'defense',
    headline: 'Modern defense runs on software and sensors',
    summary: 'The defense sector is undergoing its largest transformation since the digital revolution, driven by autonomous systems, hypersonic weapons, electronic warfare, and AI-enabled command networks. Fort Bliss in El Paso is one of the largest military installations in the US, making the region a critical hub for defense technology procurement, testing, and deployment.',
    problems: ['Integrating autonomous systems with existing force structures', 'Countering hypersonic threats with current air defense', 'Securing military networks against sophisticated cyber attacks', 'Modernizing aging weapons platforms cost-effectively', 'Recruiting tech talent to compete with private sector', 'Managing multi-domain operations across land, air, space, and cyber'],
    outlook: 'Defense spending remains strong with emphasis shifting toward autonomous combat vehicles, AI-powered C4ISR, and electronic warfare capabilities. Fort Bliss will continue to drive local demand for defense IT, logistics, and training systems. SBIR/STTR programs are creating entry points for smaller tech vendors. Expect growth in counter-drone systems, directed energy weapons, and military AI.',
    bullets: [
      'Autonomous systems are replacing crewed vehicles in contested areas',
      'Hypersonic weapons travel at Mach 5+ — too fast for current defenses',
      'Electronic warfare dominates the electromagnetic spectrum',
      'C4ISR integrates all sensors and weapons into one command network',
    ],
    journey: [
      { decade: '1990s', title: 'Precision Guided Munitions', description: 'GPS-guided weapons changed warfare with pinpoint accuracy' },
      { decade: '2000s', title: 'Network-Centric Warfare', description: 'Connected forces shared data across battlefield networks' },
      { decade: '2010s', title: 'Drone Revolution', description: 'Unmanned systems proved themselves in ISR and strike missions' },
      { decade: '2020s', title: 'AI-Enabled Warfare', description: 'Machine learning accelerates targeting, logistics, and decision-making' },
      { decade: '2030s', title: 'Autonomous Combat', description: 'Robotic combat vehicles and AI wingmen fight alongside soldiers' },
    ],
    techMap: [
      { name: 'Defense', children: ['ISR', 'Electronic Warfare', 'Autonomous Systems', 'C4ISR', 'Hypersonics', 'Directed Energy'] },
    ],
  },

  'border-tech': {
    slug: 'border-tech',
    headline: 'Borders are becoming digital checkpoints',
    summary: 'Border technology is one of the fastest-growing segments in El Paso, driven by the need for faster trade processing, enhanced security, and seamless cross-border commerce. Biometrics, AI-powered cargo scanning, and IoT tracking are replacing manual inspections. The region processes over $100B in annual cross-border trade, making it a prime market for border technology solutions.',
    problems: ['Long wait times at ports of entry hurting trade', 'Detecting fentanyl and contraband in commercial shipments', 'Processing high volumes of pedestrian and vehicle traffic', 'Balancing security with trade facilitation', 'Interoperability between US and Mexican systems', 'Aging border infrastructure needing modernization'],
    outlook: 'Investment in border technology will intensify as both security concerns and trade volumes grow. AI-powered pre-clearance systems will dramatically reduce wait times for trusted shippers. Biometric entry/exit tracking will become universal. The El Paso-Juarez region will remain the primary testing ground for new border technologies, with CBP and GSA as anchor customers.',
    bullets: [
      'Biometric systems identify travelers with face, fingerprint, and iris scans',
      'AI cargo scanning detects contraband without opening containers',
      'RFID and IoT track goods from factory to final delivery',
      'Trade compliance software automates customs paperwork',
    ],
    journey: [
      { decade: '1990s', title: 'Manual Inspection', description: 'Paper documents and physical searches at every crossing' },
      { decade: '2000s', title: 'Digital Customs', description: 'Electronic filing systems replaced paper manifests' },
      { decade: '2010s', title: 'Automated Scanning', description: 'X-ray and gamma-ray machines scanned cargo without opening it' },
      { decade: '2020s', title: 'AI-Powered Borders', description: 'Biometrics, predictive analytics, and smart surveillance' },
      { decade: '2030s', title: 'Seamless Trade', description: 'AI pre-clears trusted shipments — near-zero wait times' },
    ],
    techMap: [
      { name: 'Border Tech', children: ['Biometrics', 'RFID Tracking', 'Cargo Scanning', 'Surveillance Systems', 'Trade Compliance'] },
    ],
  },

  'manufacturing': {
    slug: 'manufacturing',
    headline: 'Factories are becoming intelligent and self-optimizing',
    summary: 'Manufacturing is being reshaped by Industry 4.0 technologies — collaborative robots, digital twins, additive manufacturing, and predictive maintenance. The push to reshore production to the US is creating new opportunities in El Paso, where proximity to Mexico enables hybrid manufacturing models. Smart factories that self-optimize using AI and IoT sensors are replacing traditional production lines.',
    problems: ['Labor shortages in skilled manufacturing roles', 'Supply chain disruptions and material cost volatility', 'High upfront cost of automation equipment', 'Integrating legacy equipment with smart factory systems', 'Quality control consistency across production lines', 'Energy costs and sustainability requirements'],
    outlook: 'Reshoring momentum will continue to benefit border regions like El Paso, where companies can combine US engineering with Mexican manufacturing labor. Expect rapid adoption of cobots in mid-size facilities, growth in additive manufacturing for spare parts, and increasing demand for digital twin platforms. The transition to lights-out manufacturing will accelerate in high-value, low-mix production.',
    bullets: [
      'Cobots work alongside humans — no safety cages needed',
      'Digital twins simulate entire factories before making changes',
      '3D printing produces spare parts on demand, anywhere',
      'Predictive maintenance stops breakdowns before they happen',
    ],
    journey: [
      { decade: '1990s', title: 'CNC Machining', description: 'Computer-controlled machines brought precision to production' },
      { decade: '2000s', title: 'Lean Manufacturing', description: 'Toyota-style efficiency eliminated waste across supply chains' },
      { decade: '2010s', title: 'Industry 4.0', description: 'IoT sensors connected every machine to a central nervous system' },
      { decade: '2020s', title: 'Smart Factories', description: 'AI optimizes production in real time — self-adjusting lines' },
      { decade: '2030s', title: 'Lights-Out Manufacturing', description: 'Fully autonomous factories that run without human operators' },
    ],
    techMap: [
      { name: 'Manufacturing', children: ['Industry 4.0', 'Additive Manufacturing', 'Digital Twin', 'Predictive Maintenance', 'Cobots'] },
    ],
  },

  'energy': {
    slug: 'energy',
    headline: 'The grid is getting smarter and greener',
    summary: 'The energy sector is in the middle of a generational shift toward renewable sources, battery storage, and AI-managed grids. El Paso receives 297 sunny days per year, making it one of the best locations for solar energy in the US. Military microgrids at Fort Bliss provide energy resilience, while utility-scale solar farms are expanding across the region.',
    problems: ['Grid reliability during peak demand and extreme weather', 'Integrating intermittent renewable sources into the grid', 'Aging grid infrastructure needing modernization', 'High cost of battery storage at utility scale', 'Permitting and land use for new solar installations', 'Workforce transition from fossil fuel to renewable jobs'],
    outlook: 'Solar-plus-storage will dominate new energy investment in the Southwest. AI grid management will become standard as renewable penetration increases. Military microgrids will expand as energy resilience becomes a national security priority. The El Paso region will attract battery manufacturing and grid technology companies seeking proximity to solar resources and military customers.',
    bullets: [
      'El Paso gets 297 sunny days/year — ideal for solar',
      'Battery storage smooths out renewable energy dips',
      'Military microgrids keep bases running during outages',
      'AI manages grid demand in real time as solar fluctuates',
    ],
    journey: [
      { decade: '1990s', title: 'Grid Deregulation', description: 'Electricity markets opened to competition in many states' },
      { decade: '2000s', title: 'Renewable Push', description: 'Wind and solar farms began scaling up across the country' },
      { decade: '2010s', title: 'Smart Meters', description: 'Advanced metering gave utilities and customers real-time data' },
      { decade: '2020s', title: 'Battery + Solar', description: 'Storage paired with solar makes renewable energy reliable' },
      { decade: '2030s', title: 'Autonomous Grid', description: 'AI-managed grids that self-heal and optimize in real time' },
    ],
    techMap: [
      { name: 'Energy', children: ['Smart Grid', 'Utility Solar', 'Battery Storage', 'Microgrids', 'AI Grid Operations'] },
    ],
  },

  'healthcare': {
    slug: 'healthcare',
    headline: 'Healthcare is moving from hospitals to homes',
    summary: 'Healthcare technology is undergoing rapid transformation as telemedicine, AI diagnostics, remote patient monitoring, and interoperable health records reshape how care is delivered. El Paso serves a large underserved population along the US-Mexico border, creating strong demand for accessible, technology-enabled healthcare solutions. The region is home to medical centers, military health facilities, and a growing biotech research corridor.',
    problems: ['Healthcare access in rural and underserved border communities', 'Interoperability between disparate EHR systems', 'Physician shortages especially in specialist roles', 'Rising cost of care and hospital operations', 'Mental health services at scale', 'Medical device cybersecurity and patient data privacy'],
    outlook: 'Telemedicine will become the default for routine care, with in-person visits reserved for complex cases. AI-powered diagnostics will detect diseases earlier and more accurately. Remote monitoring devices will shift chronic disease management to the home. The El Paso border region will see investment in bilingual telehealth platforms and cross-border health data exchange.',
    bullets: [
      'Telemedicine connects rural patients to specialists anywhere',
      'AI reads X-rays and MRIs faster than radiologists',
      'Wearable devices monitor patients 24/7 at home',
      'Electronic health records are finally connecting across systems',
    ],
    journey: [
      { decade: '1990s', title: 'Paper Records', description: 'Patient charts lived in filing cabinets — no sharing between providers' },
      { decade: '2000s', title: 'Electronic Records', description: 'EHR systems digitized patient data but created data silos' },
      { decade: '2010s', title: 'Telemedicine', description: 'Video visits made healthcare accessible to rural and remote patients' },
      { decade: '2020s', title: 'AI Diagnostics', description: 'Machine learning detects diseases earlier than human clinicians' },
      { decade: '2030s', title: 'Predictive Health', description: 'AI predicts illness before symptoms appear — prevention over treatment' },
    ],
    techMap: [
      { name: 'Healthcare', children: ['Telemedicine', 'EHR Systems', 'Medical Imaging AI', 'Remote Monitoring', 'Clinical Trials Tech'] },
    ],
  },

  'logistics': {
    slug: 'logistics',
    headline: 'Supply chains are becoming autonomous and visible',
    summary: 'Logistics and supply chain management are being transformed by warehouse automation, AI-powered route optimization, real-time visibility platforms, and digital freight networks. El Paso is a critical logistics hub — one of the largest inland ports in the US, processing billions in cross-border trade annually. The region is home to major distribution centers, trucking fleets, and warehousing operations serving the US-Mexico trade corridor.',
    problems: ['Driver and warehouse labor shortages', 'Cross-border shipping delays and customs complexity', 'Last-mile delivery cost in dispersed markets', 'Inventory visibility across multi-tier supply chains', 'Fuel cost volatility and sustainability mandates', 'Cargo theft and supply chain security'],
    outlook: 'Autonomous trucking will begin displacing long-haul drivers on major corridors, while warehouse robotics adoption accelerates among mid-size operators. Digital freight platforms will consolidate the fragmented brokerage market. El Paso will benefit from nearshoring trends as companies move supply chains closer to the US, driving demand for cross-border logistics technology and warehousing capacity.',
    bullets: [
      'Warehouse robots replace manual picking — faster, fewer errors',
      'AI routes deliveries around traffic, weather, and border wait times',
      'End-to-end visibility tracks every package from factory to doorstep',
      'Digital freight platforms replace phone calls and fax machines',
    ],
    journey: [
      { decade: '1990s', title: 'Barcode Scanners', description: 'Simple scanning replaced manual inventory counting' },
      { decade: '2000s', title: 'Warehouse Software', description: 'WMS systems organized storage, picking, and shipping digitally' },
      { decade: '2010s', title: 'Robots Introduced', description: 'Amazon Kiva robots proved warehouse automation works at scale' },
      { decade: '2020s', title: 'AI Automation', description: 'Machine learning optimizes routes, demand, and warehouse operations' },
      { decade: '2030s', title: 'Autonomous Logistics', description: 'Self-driving trucks and drone delivery complete the automation chain' },
    ],
    techMap: [
      { name: 'Logistics', children: ['Route Optimization', 'Warehouse Automation', 'Fleet Management', 'Last-Mile Delivery', 'Supply Chain Visibility', 'Digital Freight'] },
    ],
  },
};
