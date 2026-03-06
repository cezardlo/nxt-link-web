// Industry stories — simple storytelling data for each industry
// Powers the "What's happening" overview and tech journey timeline

import type { IndustrySlug } from '@/lib/data/technology-catalog';

export type IndustryStory = {
  slug: IndustrySlug;
  headline: string;
  bullets: string[];
  journey: { decade: string; title: string; description: string }[];
  techMap: { name: string; children: string[] }[];
};

export const INDUSTRY_STORIES: Record<IndustrySlug, IndustryStory> = {
  'ai-ml': {
    slug: 'ai-ml',
    headline: 'AI is transforming every industry at once',
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
