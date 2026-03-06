// src/lib/data/conference-profiles.ts
// NXT//LINK Conference Profile Data — 50 real-world conferences
//
// ConferenceProfile type is defined in @/lib/intelligence/conference-scorer
// and re-exported here for convenience.

export type { ConferenceProfile, ConferenceSpeaker } from '@/lib/intelligence/conference-scorer';

import type { ConferenceProfile } from '@/lib/intelligence/conference-scorer';

export const CONFERENCE_PROFILES: ConferenceProfile[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFENSE (10)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'conf-ausa',
    name: 'AUSA Annual Meeting & Exposition',
    industry: 'Defense',
    location: 'Washington, DC, USA',
    monthTypically: 10,
    exhibitorCount: 700,
    speakerCount: 200,
    exhibitors: [
      'Lockheed Martin', 'Raytheon', 'Northrop Grumman', 'General Dynamics',
      'L3Harris', 'BAE Systems', 'Boeing', 'Palantir', 'Anduril',
      'Elbit Systems', 'Leonardo DRS', 'Textron Systems', 'Oshkosh Defense',
      'Leidos', 'SAIC', 'CACI International',
    ],
    sponsors: [
      'Lockheed Martin', 'General Dynamics', 'BAE Systems', 'Raytheon',
      'Northrop Grumman', 'L3Harris', 'Boeing',
    ],
    speakers: [
      { name: 'Gen. Randy George', org: 'US Army', title: 'Chief of Staff of the Army' },
      { name: 'Christine Wormuth', org: 'US Army', title: 'Secretary of the Army' },
      { name: 'Gen. James Rainey', org: 'Army Futures Command', title: 'Commanding General' },
      { name: 'Lt. Gen. Robert Rasch', org: 'PEO Missiles & Space', title: 'Program Executive Officer' },
      { name: 'Craig Spisak', org: 'Army Materiel Command', title: 'Deputy Commanding General' },
    ],
    productsShowcased: [
      'IVAS Goggle', 'IBCS Air Defense', 'Stryker SHORAD', 'AMPV',
      'LTAMDS Radar', 'RCV Robotic Combat Vehicle', 'Palantir TITAN',
    ],
    technologies: [
      'tech-c4isr', 'tech-autonomous-systems', 'tech-electronic-warfare',
      'tech-hypersonics', 'tech-directed-energy', 'tech-edge-ai', 'tech-isr',
    ],
    website: 'https://www.ausa.org/events/annual',
  },

  {
    id: 'conf-dsei',
    name: 'DSEI (Defence & Security Equipment International)',
    industry: 'Defense',
    location: 'London, England, UK',
    monthTypically: 9,
    exhibitorCount: 1600,
    speakerCount: 350,
    exhibitors: [
      'BAE Systems', 'Thales', 'Leonardo', 'Rheinmetall', 'MBDA',
      'Raytheon', 'Lockheed Martin', 'L3Harris', 'Boeing', 'Saab',
      'General Dynamics UK', 'Babcock International', 'QinetiQ',
      'Elbit Systems', 'Northrop Grumman',
    ],
    sponsors: [
      'BAE Systems', 'Boeing', 'Thales', 'Leonardo',
      'Raytheon', 'Rheinmetall',
    ],
    speakers: [
      { name: 'Adm. Sir Tony Radakin', org: 'UK Ministry of Defence', title: 'Chief of Defence Staff' },
      { name: 'John Healey', org: 'UK Government', title: 'Secretary of State for Defence' },
      { name: 'Gen. Christopher Cavoli', org: 'NATO SACEUR', title: 'Supreme Allied Commander Europe' },
      { name: 'Charles Woodburn', org: 'BAE Systems', title: 'CEO' },
    ],
    productsShowcased: [
      'Tempest/GCAP Fighter', 'Challenger 3 MBT', 'Type 26 Frigate',
      'Boxer MIV', 'Protector RPA', 'ECRS Mk2 Radar',
    ],
    technologies: [
      'tech-c4isr', 'tech-autonomous-systems', 'tech-electronic-warfare',
      'tech-isr', 'tech-hypersonics', 'tech-directed-energy',
    ],
    website: 'https://www.dsei.co.uk/',
  },

  {
    id: 'conf-sofic',
    name: 'SOFIC (Special Operations Forces Industry Conference)',
    industry: 'Defense',
    location: 'Tampa, FL, USA',
    monthTypically: 5,
    exhibitorCount: 450,
    speakerCount: 120,
    exhibitors: [
      'L3Harris', 'Raytheon', 'General Dynamics', 'FLIR Systems',
      'Anduril', 'Palantir', 'AeroVironment', 'Textron Systems',
      'Northrop Grumman', 'Boeing', 'Collins Aerospace', 'Sierra Nevada',
    ],
    sponsors: [
      'L3Harris', 'Raytheon', 'FLIR Systems', 'General Dynamics',
    ],
    speakers: [
      { name: 'Gen. Bryan Fenton', org: 'USSOCOM', title: 'Commander' },
      { name: 'Christopher Maier', org: 'DoD', title: 'ASD for Special Operations' },
      { name: 'Lt. Gen. Jonathan Braga', org: 'USASOC', title: 'Commanding General' },
    ],
    productsShowcased: [
      'Ghost 4 sUAS', 'Switchblade 600', 'ATAK Software', 'Jump 20 UAS',
      'PRC-163 Radio', 'ENVG-B Night Vision',
    ],
    technologies: [
      'tech-isr', 'tech-edge-ai', 'tech-c4isr', 'tech-autonomous-systems',
      'tech-electronic-warfare',
    ],
    website: 'https://www.sofic.org/',
  },

  {
    id: 'conf-sea-air-space',
    name: 'Sea-Air-Space',
    industry: 'Defense',
    location: 'National Harbor, MD, USA',
    monthTypically: 4,
    exhibitorCount: 350,
    speakerCount: 180,
    exhibitors: [
      'Huntington Ingalls', 'General Dynamics', 'Raytheon', 'Lockheed Martin',
      'Boeing', 'Northrop Grumman', 'L3Harris', 'BAE Systems',
      'Austal USA', 'Leidos', 'HII', 'Rolls-Royce',
    ],
    sponsors: [
      'Huntington Ingalls', 'Lockheed Martin', 'General Dynamics',
      'Northrop Grumman', 'Boeing',
    ],
    speakers: [
      { name: 'Adm. Lisa Franchetti', org: 'US Navy', title: 'Chief of Naval Operations' },
      { name: 'Gen. Eric Smith', org: 'US Marine Corps', title: 'Commandant' },
      { name: 'Carlos Del Toro', org: 'US Navy', title: 'Secretary of the Navy' },
    ],
    productsShowcased: [
      'Columbia-Class Submarine', 'DDG(X) Destroyer', 'MQ-25 Stingray',
      'CH-53K King Stallion', 'CEC Cooperative Engagement Capability',
    ],
    technologies: [
      'tech-c4isr', 'tech-autonomous-systems', 'tech-isr',
      'tech-hypersonics', 'tech-electronic-warfare',
    ],
    website: 'https://seaairspace.org/',
  },

  {
    id: 'conf-idex',
    name: 'IDEX (International Defence Exhibition)',
    industry: 'Defense',
    location: 'Abu Dhabi, UAE',
    monthTypically: 2,
    exhibitorCount: 1350,
    speakerCount: 250,
    exhibitors: [
      'Lockheed Martin', 'Boeing', 'Raytheon', 'BAE Systems', 'EDGE Group',
      'Rheinmetall', 'Leonardo', 'Thales', 'Saab', 'Hanwha Defense',
      'Turkish Aerospace', 'Elbit Systems', 'MBDA', 'KNDS',
    ],
    sponsors: [
      'EDGE Group', 'Lockheed Martin', 'Boeing', 'Raytheon',
      'Tawazun Economic Council',
    ],
    speakers: [
      { name: 'Faisal Al Bannai', org: 'EDGE Group', title: 'Managing Director & CEO' },
      { name: 'Jim Taiclet', org: 'Lockheed Martin', title: 'Chairman & CEO' },
      { name: 'Wes Bush', org: 'Northrop Grumman', title: 'Former Chairman' },
    ],
    productsShowcased: [
      'F-35 Lightning II', 'THAAD System', 'Patriot PAC-3 MSE',
      'Hunter 2-S UGV', 'Caracal CAR 816',
    ],
    technologies: [
      'tech-c4isr', 'tech-autonomous-systems', 'tech-directed-energy',
      'tech-isr', 'tech-hypersonics',
    ],
    website: 'https://www.idexuae.ae/',
  },

  {
    id: 'conf-aero-india',
    name: 'Aero India',
    industry: 'Defense',
    location: 'Bengaluru, Karnataka, India',
    monthTypically: 2,
    exhibitorCount: 800,
    speakerCount: 150,
    exhibitors: [
      'Hindustan Aeronautics Limited', 'Boeing', 'Lockheed Martin', 'Dassault',
      'Saab', 'Airbus Defence', 'Raytheon', 'BAE Systems', 'Thales',
      'Bharat Electronics', 'Adani Defence',
    ],
    sponsors: [
      'Hindustan Aeronautics Limited', 'Boeing', 'Lockheed Martin',
    ],
    speakers: [
      { name: 'Rajnath Singh', org: 'Government of India', title: 'Defence Minister' },
      { name: 'CB Ananthakrishnan', org: 'HAL', title: 'CMD' },
    ],
    productsShowcased: [
      'Tejas LCA Mk2', 'BrahMos Cruise Missile', 'AMCA Stealth Fighter',
      'LCH Prachand', 'Akash NG SAM',
    ],
    technologies: [
      'tech-c4isr', 'tech-isr', 'tech-autonomous-systems',
      'tech-electronic-warfare', 'tech-hypersonics',
    ],
    website: 'https://www.aeroindia.gov.in/',
  },

  {
    id: 'conf-shot-show',
    name: 'SHOT Show',
    industry: 'Defense',
    location: 'Las Vegas, NV, USA',
    monthTypically: 1,
    exhibitorCount: 2500,
    speakerCount: 80,
    exhibitors: [
      'Smith & Wesson', 'Sig Sauer', 'Vista Outdoor', 'Beretta',
      'FN Herstal', 'Aimpoint', 'Leupold', 'Safariland', 'Hornady',
      'Magpul', 'FLIR Systems', 'L3Harris',
    ],
    sponsors: [
      'NSSF', 'Sig Sauer', 'Vista Outdoor', 'FN Herstal',
    ],
    speakers: [
      { name: 'Joe Bartozzi', org: 'NSSF', title: 'President & CEO' },
      { name: 'Ron Cohen', org: 'Sig Sauer', title: 'President & CEO' },
    ],
    productsShowcased: [
      'SIG MCX Spear', 'Vortex XM157 NGSW Optic', 'True Velocity 6.8x51mm',
      'FN EVOLYS LMG', 'FLIR Breach PTQ136',
    ],
    technologies: [
      'tech-computer-vision', 'tech-edge-ai', 'tech-isr',
    ],
    website: 'https://shotshow.org/',
  },

  {
    id: 'conf-eurosatory',
    name: 'Eurosatory',
    industry: 'Defense',
    location: 'Paris, Ile-de-France, France',
    monthTypically: 6,
    exhibitorCount: 1800,
    speakerCount: 300,
    exhibitors: [
      'Nexter/KNDS', 'Thales', 'Dassault', 'MBDA', 'Rheinmetall',
      'Leonardo', 'BAE Systems', 'General Dynamics European Land Systems',
      'Lockheed Martin', 'Raytheon', 'Elbit Systems', 'Saab', 'Hanwha',
    ],
    sponsors: [
      'KNDS', 'Thales', 'MBDA', 'Rheinmetall', 'Safran',
    ],
    speakers: [
      { name: 'Sebastien Lecornu', org: 'French Government', title: 'Minister of the Armed Forces' },
      { name: 'Gen. Pierre Schill', org: 'French Army', title: 'Chief of Staff' },
      { name: 'Armin Papperger', org: 'Rheinmetall', title: 'CEO' },
    ],
    productsShowcased: [
      'EMBT Main Ground Combat System', 'Leopard 2A8', 'CAESAR NG',
      'Jaguar EBRC', 'Milrem THeMIS UGV', 'Nerva Robot',
    ],
    technologies: [
      'tech-c4isr', 'tech-autonomous-systems', 'tech-electronic-warfare',
      'tech-directed-energy', 'tech-isr',
    ],
    website: 'https://www.eurosatory.com/',
  },

  {
    id: 'conf-smd-symposium',
    name: 'Space & Missile Defense Symposium',
    industry: 'Defense',
    location: 'Huntsville, AL, USA',
    monthTypically: 8,
    exhibitorCount: 250,
    speakerCount: 100,
    exhibitors: [
      'Lockheed Martin', 'Northrop Grumman', 'Raytheon', 'Boeing',
      'L3Harris', 'Leidos', 'SAIC', 'SpaceX',
    ],
    sponsors: [
      'Lockheed Martin', 'Raytheon', 'Northrop Grumman', 'Boeing',
    ],
    speakers: [
      { name: 'Lt. Gen. Sean Gainey', org: 'SMDC', title: 'Commanding General' },
      { name: 'Frank St. John', org: 'Lockheed Martin', title: 'COO' },
      { name: 'Wes Kremer', org: 'Raytheon', title: 'President, Raytheon' },
    ],
    productsShowcased: [
      'Next-Gen Interceptor', 'Hypersonic GPI', 'THAAD ER',
      'Space Tracking Layer', 'LRHW Dark Eagle',
    ],
    technologies: [
      'tech-hypersonics', 'tech-directed-energy', 'tech-c4isr',
      'tech-isr', 'tech-autonomous-systems',
    ],
    website: 'https://smdsymposium.org/',
  },

  {
    id: 'conf-modern-day-marine',
    name: 'Modern Day Marine',
    industry: 'Defense',
    location: 'Washington, DC, USA',
    monthTypically: 6,
    exhibitorCount: 375,
    speakerCount: 90,
    exhibitors: [
      'BAE Systems', 'General Dynamics', 'Oshkosh Defense', 'Textron Systems',
      'L3Harris', 'Raytheon', 'Boeing', 'AeroVironment', 'Anduril',
      'Northrop Grumman',
    ],
    sponsors: [
      'BAE Systems', 'General Dynamics', 'L3Harris', 'Raytheon',
    ],
    speakers: [
      { name: 'Gen. Eric Smith', org: 'USMC', title: 'Commandant of the Marine Corps' },
      { name: 'Lt. Gen. Karsten Heckl', org: 'USMC', title: 'Deputy Commandant for CD&I' },
    ],
    productsShowcased: [
      'ACV Amphibious Combat Vehicle', 'NMESIS Anti-Ship', 'MADIS Counter-UAS',
      'Switchblade 600', 'G/ATOR Radar',
    ],
    technologies: [
      'tech-c4isr', 'tech-autonomous-systems', 'tech-electronic-warfare',
      'tech-edge-ai', 'tech-isr',
    ],
    website: 'https://www.moderndaymarine.com/',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CYBERSECURITY (5)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'conf-rsa',
    name: 'RSA Conference',
    industry: 'Cybersecurity',
    location: 'San Francisco, CA, USA',
    monthTypically: 5,
    exhibitorCount: 650,
    speakerCount: 500,
    exhibitors: [
      'CrowdStrike', 'Palo Alto Networks', 'Fortinet', 'Zscaler',
      'Microsoft', 'Google', 'IBM', 'Cisco', 'Splunk',
      'SentinelOne', 'Wiz', 'Abnormal Security', 'Cloudflare',
    ],
    sponsors: [
      'CrowdStrike', 'Palo Alto Networks', 'Microsoft', 'Google',
      'Cisco', 'Fortinet',
    ],
    speakers: [
      { name: 'Jen Easterly', org: 'CISA', title: 'Director' },
      { name: 'George Kurtz', org: 'CrowdStrike', title: 'CEO' },
      { name: 'Nikesh Arora', org: 'Palo Alto Networks', title: 'CEO' },
      { name: 'Amit Yoran', org: 'Tenable', title: 'CEO' },
      { name: 'Vasu Jakkal', org: 'Microsoft', title: 'CVP Security' },
    ],
    productsShowcased: [
      'CrowdStrike Charlotte AI', 'Palo Alto XSIAM 2.0', 'Wiz Cloud Security',
      'Google Mandiant Hunt', 'Zscaler Zero Trust Exchange',
      'Microsoft Security Copilot', 'Fortinet FortiSASE',
    ],
    technologies: [
      'tech-zero-trust', 'tech-siem', 'tech-edr', 'tech-threat-intel',
      'tech-devsecops', 'tech-generative-ai',
    ],
    website: 'https://www.rsaconference.com/',
  },

  {
    id: 'conf-black-hat',
    name: 'Black Hat USA',
    industry: 'Cybersecurity',
    location: 'Las Vegas, NV, USA',
    monthTypically: 8,
    exhibitorCount: 300,
    speakerCount: 200,
    exhibitors: [
      'CrowdStrike', 'Palo Alto Networks', 'Mandiant', 'Rapid7',
      'Tenable', 'Snyk', 'SentinelOne', 'Fortinet', 'Zscaler',
      'Cloudflare', 'Splunk',
    ],
    sponsors: [
      'CrowdStrike', 'Google', 'Palo Alto Networks', 'Microsoft',
    ],
    speakers: [
      { name: 'Jeff Moss', org: 'Black Hat / DEF CON', title: 'Founder' },
      { name: 'Charlie Miller', org: 'Cruise / Autonomous Security', title: 'Principal Security Architect' },
      { name: 'Katie Moussouris', org: 'Luta Security', title: 'CEO' },
      { name: 'Dmitri Alperovitch', org: 'Silverado Policy Accelerator', title: 'Co-Founder' },
    ],
    productsShowcased: [
      'Burp Suite Pro', 'Ghidra Extensions', 'CrowdStrike Falcon',
      'Mandiant Advantage', 'Snyk Code Security',
    ],
    technologies: [
      'tech-zero-trust', 'tech-edr', 'tech-threat-intel', 'tech-devsecops',
      'tech-ics-ot-security',
    ],
    website: 'https://www.blackhat.com/',
  },

  {
    id: 'conf-def-con',
    name: 'DEF CON',
    industry: 'Cybersecurity',
    location: 'Las Vegas, NV, USA',
    monthTypically: 8,
    exhibitorCount: 50,
    speakerCount: 250,
    exhibitors: [
      'No Starch Press', 'Hak5', 'Flipper Devices',
    ],
    sponsors: [
      'Google', 'Microsoft', 'DARPA',
    ],
    speakers: [
      { name: 'Jeff Moss', org: 'DEF CON', title: 'Founder' },
      { name: 'Bruce Schneier', org: 'Harvard Kennedy School', title: 'Fellow' },
      { name: 'Mudge (Peiter Zatko)', org: 'Independent', title: 'Security Researcher' },
    ],
    productsShowcased: [
      'AI Red Team Village', 'IoT Village Exploits', 'Car Hacking Village',
      'Voting Village', 'Flipper Zero Mods',
    ],
    technologies: [
      'tech-zero-trust', 'tech-edr', 'tech-threat-intel',
      'tech-ics-ot-security', 'tech-generative-ai',
    ],
    website: 'https://defcon.org/',
  },

  {
    id: 'conf-cyberwarcon',
    name: 'CyberWarCon',
    industry: 'Cybersecurity',
    location: 'Arlington, VA, USA',
    monthTypically: 11,
    exhibitorCount: 30,
    speakerCount: 60,
    exhibitors: [
      'Microsoft', 'Google Mandiant', 'CrowdStrike', 'Recorded Future',
    ],
    sponsors: [
      'Microsoft', 'Google', 'CrowdStrike', 'Recorded Future',
    ],
    speakers: [
      { name: 'Tom Burt', org: 'Microsoft', title: 'CVP Customer Security & Trust' },
      { name: 'Sandra Joyce', org: 'Google Mandiant', title: 'VP Mandiant Intelligence' },
      { name: 'John Hultquist', org: 'Mandiant', title: 'VP Threat Intelligence' },
      { name: 'Dmitri Alperovitch', org: 'Silverado Policy Accelerator', title: 'Co-Founder' },
    ],
    productsShowcased: [
      'Microsoft Threat Analytics', 'Mandiant APT Research',
      'CrowdStrike Adversary Reports',
    ],
    technologies: [
      'tech-threat-intel', 'tech-siem', 'tech-zero-trust', 'tech-edr',
    ],
    website: 'https://www.cyberwarcon.com/',
  },

  {
    id: 'conf-sp4',
    name: 'IEEE S&P (Oakland)',
    industry: 'Cybersecurity',
    location: 'San Francisco, CA, USA',
    monthTypically: 5,
    exhibitorCount: 20,
    speakerCount: 150,
    exhibitors: [
      'Microsoft Research', 'Google Security', 'IBM Research',
    ],
    sponsors: [
      'Microsoft', 'Google', 'IBM', 'NSF',
    ],
    speakers: [
      { name: 'Dawn Song', org: 'UC Berkeley', title: 'Professor of EECS' },
      { name: 'David Wagner', org: 'UC Berkeley', title: 'Professor of EECS' },
      { name: 'Srdjan Capkun', org: 'ETH Zurich', title: 'Professor' },
    ],
    productsShowcased: [
      'Formal Verification Tools', 'Side-Channel Attack Research',
      'Post-Quantum Cryptography Papers',
    ],
    technologies: [
      'tech-zero-trust', 'tech-devsecops', 'tech-threat-intel',
    ],
    website: 'https://www.ieee-security.org/TC/SP/',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI / ML (6)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'conf-neurips',
    name: 'NeurIPS (Conference on Neural Information Processing Systems)',
    industry: 'AI/ML',
    location: 'Vancouver, BC, Canada',
    monthTypically: 12,
    exhibitorCount: 200,
    speakerCount: 400,
    exhibitors: [
      'Google', 'Meta', 'Microsoft', 'NVIDIA', 'Amazon', 'Apple',
      'IBM', 'Databricks', 'OpenAI', 'Anthropic', 'Hugging Face',
    ],
    sponsors: [
      'Google', 'Meta', 'Microsoft', 'NVIDIA', 'Apple', 'Amazon',
    ],
    speakers: [
      { name: 'Yann LeCun', org: 'Meta', title: 'VP & Chief AI Scientist' },
      { name: 'Yoshua Bengio', org: 'Mila / Universite de Montreal', title: 'Scientific Director' },
      { name: 'Fei-Fei Li', org: 'Stanford', title: 'Professor of Computer Science' },
      { name: 'Dario Amodei', org: 'Anthropic', title: 'CEO' },
      { name: 'Ilya Sutskever', org: 'Safe Superintelligence Inc', title: 'Co-Founder' },
    ],
    productsShowcased: [
      'Transformer Architectures', 'Diffusion Models', 'RLHF Methods',
      'Mixture of Experts', 'Multimodal LLMs', 'World Models',
    ],
    technologies: [
      'tech-generative-ai', 'tech-nlp', 'tech-computer-vision',
      'tech-reinforcement-learning', 'tech-mlops',
    ],
    website: 'https://neurips.cc/',
  },

  {
    id: 'conf-cvpr',
    name: 'CVPR (Computer Vision and Pattern Recognition)',
    industry: 'AI/ML',
    location: 'Seattle, WA, USA',
    monthTypically: 6,
    exhibitorCount: 150,
    speakerCount: 350,
    exhibitors: [
      'NVIDIA', 'Google', 'Meta', 'Microsoft', 'Amazon', 'Apple',
      'Intel', 'Qualcomm', 'Samsung', 'Adobe',
    ],
    sponsors: [
      'NVIDIA', 'Google', 'Meta', 'Microsoft', 'Apple',
    ],
    speakers: [
      { name: 'Fei-Fei Li', org: 'Stanford', title: 'Professor of Computer Science' },
      { name: 'Jitendra Malik', org: 'UC Berkeley', title: 'Professor of EECS' },
      { name: 'Kaiming He', org: 'MIT', title: 'Associate Professor' },
      { name: 'Sanja Fidler', org: 'NVIDIA / University of Toronto', title: 'VP AI Research' },
    ],
    productsShowcased: [
      'NeRF / 3D Gaussian Splatting', 'Vision Transformers', 'Segment Anything Model',
      'Video Generation Models', 'Autonomous Driving Perception',
    ],
    technologies: [
      'tech-computer-vision', 'tech-generative-ai', 'tech-edge-ai',
      'tech-mlops', 'tech-anomaly-detection',
    ],
    website: 'https://cvpr.thecvf.com/',
  },

  {
    id: 'conf-gtc',
    name: 'NVIDIA GTC',
    industry: 'AI/ML',
    location: 'San Jose, CA, USA',
    monthTypically: 3,
    exhibitorCount: 400,
    speakerCount: 600,
    exhibitors: [
      'NVIDIA', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Dell',
      'HPE', 'Lenovo', 'Databricks', 'Snowflake', 'Oracle',
    ],
    sponsors: [
      'NVIDIA', 'Dell', 'HPE', 'AWS', 'Google Cloud',
    ],
    speakers: [
      { name: 'Jensen Huang', org: 'NVIDIA', title: 'Founder & CEO' },
      { name: 'Mark Zuckerberg', org: 'Meta', title: 'CEO' },
      { name: 'Ilya Sutskever', org: 'Safe Superintelligence Inc', title: 'Co-Founder' },
      { name: 'Demis Hassabis', org: 'Google DeepMind', title: 'CEO' },
      { name: 'Lisa Su', org: 'AMD', title: 'CEO' },
    ],
    productsShowcased: [
      'Blackwell B200 GPU', 'NVIDIA NIM Microservices', 'DGX SuperPOD',
      'Omniverse Digital Twins', 'Isaac Robotics Platform', 'CUDA 13',
    ],
    technologies: [
      'tech-generative-ai', 'tech-computer-vision', 'tech-edge-ai',
      'tech-mlops', 'tech-reinforcement-learning', 'tech-digital-twin',
    ],
    website: 'https://www.nvidia.com/gtc/',
  },

  {
    id: 'conf-ai-summit-ny',
    name: 'The AI Summit New York',
    industry: 'AI/ML',
    location: 'New York, NY, USA',
    monthTypically: 12,
    exhibitorCount: 120,
    speakerCount: 150,
    exhibitors: [
      'IBM', 'Microsoft', 'Google', 'Amazon', 'Databricks',
      'Snowflake', 'DataRobot', 'H2O.ai', 'C3.ai', 'Palantir',
    ],
    sponsors: [
      'IBM', 'Microsoft', 'Google', 'Amazon', 'Databricks',
    ],
    speakers: [
      { name: 'Arvind Krishna', org: 'IBM', title: 'Chairman & CEO' },
      { name: 'Rob Thomas', org: 'IBM', title: 'SVP Software & Chief Commercial Officer' },
      { name: 'Ali Ghodsi', org: 'Databricks', title: 'CEO' },
    ],
    productsShowcased: [
      'IBM watsonx', 'Databricks Lakehouse AI', 'Snowflake Cortex',
      'C3 Generative AI', 'Palantir AIP',
    ],
    technologies: [
      'tech-generative-ai', 'tech-nlp', 'tech-mlops',
      'tech-anomaly-detection', 'tech-edge-ai',
    ],
    website: 'https://theaisummit.com/',
  },

  {
    id: 'conf-icml',
    name: 'ICML (International Conference on Machine Learning)',
    industry: 'AI/ML',
    location: 'Honolulu, HI, USA',
    monthTypically: 7,
    exhibitorCount: 120,
    speakerCount: 350,
    exhibitors: [
      'Google', 'Meta', 'Microsoft', 'NVIDIA', 'Apple', 'Amazon',
      'DeepMind', 'OpenAI', 'Anthropic',
    ],
    sponsors: [
      'Google', 'Meta', 'Apple', 'NVIDIA', 'Microsoft',
    ],
    speakers: [
      { name: 'Geoffrey Hinton', org: 'University of Toronto', title: 'Professor Emeritus' },
      { name: 'Andrew Ng', org: 'Stanford / DeepLearning.AI', title: 'Adjunct Professor' },
      { name: 'Percy Liang', org: 'Stanford', title: 'Associate Professor' },
    ],
    productsShowcased: [
      'Scaling Laws Research', 'Alignment Methods', 'Efficient Transformers',
      'Neural Architecture Search', 'Mechanistic Interpretability',
    ],
    technologies: [
      'tech-generative-ai', 'tech-reinforcement-learning', 'tech-nlp',
      'tech-computer-vision', 'tech-mlops',
    ],
    website: 'https://icml.cc/',
  },

  {
    id: 'conf-google-io',
    name: 'Google I/O',
    industry: 'AI/ML',
    location: 'Mountain View, CA, USA',
    monthTypically: 5,
    exhibitorCount: 80,
    speakerCount: 200,
    exhibitors: [
      'Google', 'Android OEMs', 'Firebase Partners',
    ],
    sponsors: [
      'Google',
    ],
    speakers: [
      { name: 'Sundar Pichai', org: 'Google', title: 'CEO' },
      { name: 'Demis Hassabis', org: 'Google DeepMind', title: 'CEO' },
      { name: 'Thomas Kurian', org: 'Google Cloud', title: 'CEO' },
      { name: 'Jeff Dean', org: 'Google', title: 'Chief Scientist' },
    ],
    productsShowcased: [
      'Gemini Ultra', 'Gemma Open Models', 'Vertex AI', 'Google Cloud AI Platform',
      'Android AI Features', 'NotebookLM',
    ],
    technologies: [
      'tech-generative-ai', 'tech-nlp', 'tech-computer-vision',
      'tech-mlops', 'tech-edge-ai',
    ],
    website: 'https://io.google/',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTHCARE (4)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'conf-himss',
    name: 'HIMSS Global Health Conference',
    industry: 'Healthcare',
    location: 'Orlando, FL, USA',
    monthTypically: 3,
    exhibitorCount: 1200,
    speakerCount: 300,
    exhibitors: [
      'Microsoft', 'Google', 'Amazon', 'Oracle Health', 'Epic Systems',
      'Medtronic', 'Abbott', 'Philips', 'Siemens Healthineers', 'GE HealthCare',
      'Cerner (Oracle)', 'InterSystems', 'Nuance (Microsoft)',
    ],
    sponsors: [
      'Microsoft', 'Google', 'Oracle Health', 'Amazon',
      'Philips', 'Siemens Healthineers',
    ],
    speakers: [
      { name: 'Hal Wolf', org: 'HIMSS', title: 'President & CEO' },
      { name: 'David Feinberg', org: 'Oracle Health', title: 'Chairman' },
      { name: 'Judy Faulkner', org: 'Epic Systems', title: 'CEO' },
      { name: 'Peter Shen', org: 'Microsoft', title: 'VP Healthcare Industry' },
    ],
    productsShowcased: [
      'Epic Cosmos', 'Oracle Health Clinical AI', 'Microsoft DAX Copilot',
      'Google MedPaLM', 'Nuance DAX Express', 'Philips HealthSuite',
    ],
    technologies: [
      'tech-ehr', 'tech-telemedicine', 'tech-medical-imaging-ai',
      'tech-remote-patient-monitoring', 'tech-generative-ai', 'tech-nlp',
    ],
    website: 'https://www.himss.org/global-conference',
  },

  {
    id: 'conf-bio',
    name: 'BIO International Convention',
    industry: 'Healthcare',
    location: 'San Diego, CA, USA',
    monthTypically: 6,
    exhibitorCount: 1800,
    speakerCount: 350,
    exhibitors: [
      'Pfizer', 'Johnson Johnson', 'Roche', 'Novartis', 'AstraZeneca',
      'Merck', 'Amgen', 'Gilead', 'Regeneron', 'Moderna',
      'BioNTech', 'Illumina', 'Thermo Fisher',
    ],
    sponsors: [
      'Pfizer', 'Johnson Johnson', 'Roche', 'Novartis',
      'AstraZeneca', 'Merck',
    ],
    speakers: [
      { name: 'Albert Bourla', org: 'Pfizer', title: 'CEO' },
      { name: 'Stephane Bancel', org: 'Moderna', title: 'CEO' },
      { name: 'Rachel King', org: 'BIO', title: 'CEO' },
      { name: 'Francis Collins', org: 'NIH', title: 'Former Director' },
    ],
    productsShowcased: [
      'mRNA Therapeutics', 'CRISPR Gene Editing', 'ADC Oncology',
      'AI Drug Discovery', 'Cell & Gene Therapy',
    ],
    technologies: [
      'tech-clinical-trials-ai', 'tech-generative-ai', 'tech-nlp',
      'tech-medical-imaging-ai',
    ],
    website: 'https://www.bio.org/events/bio-international-convention',
  },

  {
    id: 'conf-hlth',
    name: 'HLTH Conference',
    industry: 'Healthcare',
    location: 'Las Vegas, NV, USA',
    monthTypically: 10,
    exhibitorCount: 700,
    speakerCount: 500,
    exhibitors: [
      'Google', 'Amazon', 'Microsoft', 'Teladoc Health', 'Hims & Hers',
      'Ro', 'Sword Health', 'Olive AI', 'Veracyte', 'Butterfly Network',
    ],
    sponsors: [
      'Google', 'Amazon', 'Microsoft', 'CVS Health', 'Humana',
    ],
    speakers: [
      { name: 'Karen DeSalvo', org: 'Google Health', title: 'Chief Health Officer' },
      { name: 'Vin Gupta', org: 'Amazon', title: 'Chief Medical Officer, Amazon Pharmacy' },
      { name: 'Toby Cosgrove', org: 'Cleveland Clinic', title: 'Former CEO' },
    ],
    productsShowcased: [
      'Google AI Health Screening', 'Amazon One Medical', 'Teladoc Virtual Care',
      'Butterfly iQ+ Ultrasound', 'Sword Digital MSK Therapy',
    ],
    technologies: [
      'tech-telemedicine', 'tech-remote-patient-monitoring', 'tech-generative-ai',
      'tech-medical-imaging-ai', 'tech-ehr',
    ],
    website: 'https://www.hlth.com/',
  },

  {
    id: 'conf-aaos',
    name: 'AAOS (American Academy of Orthopaedic Surgeons) Annual Meeting',
    industry: 'Healthcare',
    location: 'San Francisco, CA, USA',
    monthTypically: 3,
    exhibitorCount: 600,
    speakerCount: 400,
    exhibitors: [
      'Stryker', 'Zimmer Biomet', 'Medtronic', 'Johnson Johnson DePuy',
      'Smith & Nephew', 'Arthrex', 'NuVasive', 'Globus Medical',
    ],
    sponsors: [
      'Stryker', 'Zimmer Biomet', 'Medtronic', 'Johnson Johnson',
    ],
    speakers: [
      { name: 'Kevin Bozic', org: 'UT Austin', title: 'Chair, Department of Surgery' },
      { name: 'Stuart Weinstein', org: 'University of Iowa', title: 'Professor Emeritus' },
    ],
    productsShowcased: [
      'Mako Robotic Surgery System', 'ROSA Knee System', 'Mazor X Stealth',
      'VELYS Robotic-Assisted Solution',
    ],
    technologies: [
      'tech-medical-imaging-ai', 'tech-ehr', 'tech-telemedicine',
      'tech-remote-patient-monitoring',
    ],
    website: 'https://www.aaos.org/annual/',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUFACTURING (5)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'conf-imts',
    name: 'IMTS (International Manufacturing Technology Show)',
    industry: 'Manufacturing',
    location: 'Chicago, IL, USA',
    monthTypically: 9,
    exhibitorCount: 2500,
    speakerCount: 200,
    exhibitors: [
      'Siemens', 'ABB', 'Fanuc', 'DMG Mori', 'Mazak', 'Haas Automation',
      'Rockwell Automation', 'Mitsubishi', 'Hexagon', 'Zeiss',
      'Trumpf', 'KUKA', 'Universal Robots', 'Stratasys', '3D Systems',
    ],
    sponsors: [
      'Siemens', 'Fanuc', 'DMG Mori', 'Rockwell Automation',
    ],
    speakers: [
      { name: 'Peter Leibinger', org: 'Trumpf', title: 'CTO' },
      { name: 'Barbara Humpton', org: 'Siemens', title: 'President & CEO Siemens USA' },
      { name: 'Mike Cicco', org: 'Fanuc America', title: 'President & CEO' },
    ],
    productsShowcased: [
      'Fanuc CRX Cobot', 'Siemens Xcelerator', 'DMG Mori CELOS',
      'Haas UMC-1500SS', 'Stratasys H350 SAF', 'Hexagon Smart Factory',
    ],
    technologies: [
      'tech-industry40', 'tech-additive-manufacturing', 'tech-cobotics',
      'tech-predictive-maintenance', 'tech-digital-twin',
    ],
    website: 'https://www.imts.com/',
  },

  {
    id: 'conf-automate',
    name: 'Automate (A3 Robotics & Vision Show)',
    industry: 'Manufacturing',
    location: 'Chicago, IL, USA',
    monthTypically: 5,
    exhibitorCount: 750,
    speakerCount: 150,
    exhibitors: [
      'Fanuc', 'KUKA', 'ABB', 'Universal Robots', 'Boston Dynamics',
      'Rockwell Automation', 'Siemens', 'Cognex', 'Keyence', 'Epson Robots',
      'Yaskawa Motoman', 'Omron', 'Beckhoff',
    ],
    sponsors: [
      'Fanuc', 'ABB', 'Universal Robots', 'Rockwell Automation',
    ],
    speakers: [
      { name: 'Jeff Burnstein', org: 'A3 (Association for Advancing Automation)', title: 'President' },
      { name: 'Robert Huschka', org: 'Universal Robots', title: 'VP Strategy' },
      { name: 'Marc Segura', org: 'ABB Robotics', title: 'Division President' },
    ],
    productsShowcased: [
      'UR30 Cobot', 'KUKA LBR iisy', 'Boston Dynamics Stretch',
      'Fanuc CRX-25iA', 'Cognex ViDi AI Vision', 'ABB GoFa CRB 15000',
    ],
    technologies: [
      'tech-cobotics', 'tech-industry40', 'tech-computer-vision',
      'tech-predictive-maintenance', 'tech-edge-ai',
    ],
    website: 'https://www.automateshow.com/',
  },

  {
    id: 'conf-modex',
    name: 'MODEX',
    industry: 'Manufacturing',
    location: 'Atlanta, GA, USA',
    monthTypically: 3,
    exhibitorCount: 1000,
    speakerCount: 150,
    exhibitors: [
      'Honeywell', 'Dematic', 'Locus Robotics', 'AutoStore', 'Zebra Technologies',
      'Crown Equipment', 'Raymond', 'Kardex', 'Bastian Solutions',
      'KUKA', 'Rockwell Automation',
    ],
    sponsors: [
      'Honeywell', 'Dematic', 'Zebra Technologies', 'Locus Robotics',
    ],
    speakers: [
      { name: 'John Paxton', org: 'MHI', title: 'CEO' },
      { name: 'Rick Faulk', org: 'Locus Robotics', title: 'CEO' },
      { name: 'Karl Siebrecht', org: 'Flexe', title: 'CEO' },
    ],
    productsShowcased: [
      'Locus Origin AMR', 'AutoStore Grid System', 'Dematic Multishuttle',
      'Zebra Fixed Industrial Scanners', 'Honeywell Intelligrated',
    ],
    technologies: [
      'tech-warehouse-automation', 'tech-cobotics', 'tech-industry40',
      'tech-rfid-tracking', 'tech-route-optimization',
    ],
    website: 'https://www.modexshow.com/',
  },

  {
    id: 'conf-hannover-messe',
    name: 'Hannover Messe',
    industry: 'Manufacturing',
    location: 'Hannover, Lower Saxony, Germany',
    monthTypically: 4,
    exhibitorCount: 4000,
    speakerCount: 500,
    exhibitors: [
      'Siemens', 'ABB', 'Bosch Rexroth', 'Festo', 'Beckhoff',
      'Schneider Electric', 'Rockwell Automation', 'SAP', 'Microsoft',
      'Amazon', 'Google', 'Mitsubishi Electric', 'Phoenix Contact',
    ],
    sponsors: [
      'Siemens', 'SAP', 'Microsoft', 'ABB', 'Bosch',
    ],
    speakers: [
      { name: 'Roland Busch', org: 'Siemens', title: 'CEO' },
      { name: 'Bjorn Rosengren', org: 'ABB', title: 'CEO' },
      { name: 'Christian Klein', org: 'SAP', title: 'CEO' },
      { name: 'Satya Nadella', org: 'Microsoft', title: 'CEO' },
    ],
    productsShowcased: [
      'Siemens Industrial Copilot', 'ABB Ability Platform', 'Bosch ctrlX AUTOMATION',
      'Festo Bionics', 'SAP Digital Manufacturing Cloud',
    ],
    technologies: [
      'tech-industry40', 'tech-digital-twin', 'tech-cobotics',
      'tech-predictive-maintenance', 'tech-smart-grid', 'tech-generative-ai',
    ],
    website: 'https://www.hannovermesse.de/',
  },

  {
    id: 'conf-fabtech',
    name: 'FABTECH',
    industry: 'Manufacturing',
    location: 'Chicago, IL, USA',
    monthTypically: 9,
    exhibitorCount: 1500,
    speakerCount: 120,
    exhibitors: [
      'Lincoln Electric', 'Miller Electric', 'ESAB', 'Trumpf', 'Amada',
      'Hypertherm', 'Fronius', 'Mazak', 'Bystronic', 'ABB',
      'Fanuc', 'KUKA', 'Universal Robots',
    ],
    sponsors: [
      'Lincoln Electric', 'Trumpf', 'Amada', 'ESAB',
    ],
    speakers: [
      { name: 'Christopher Mapes', org: 'Lincoln Electric', title: 'Chairman & CEO' },
      { name: 'Ed Dineen', org: 'ESAB', title: 'President & CEO' },
    ],
    productsShowcased: [
      'Lincoln POWER MIG 360MP', 'Trumpf TruLaser 5030', 'Mazak OPTIPLEX NEO',
      'ESAB Warrior Edge', 'Amada ENSIS Fiber Laser',
    ],
    technologies: [
      'tech-industry40', 'tech-additive-manufacturing', 'tech-cobotics',
      'tech-predictive-maintenance',
    ],
    website: 'https://www.fabtechexpo.com/',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGY (4)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'conf-ceraweek',
    name: 'CERAWeek by S&P Global',
    industry: 'Energy',
    location: 'Houston, TX, USA',
    monthTypically: 3,
    exhibitorCount: 400,
    speakerCount: 600,
    exhibitors: [
      'ExxonMobil', 'Chevron', 'Shell', 'BP', 'TotalEnergies',
      'NextEra Energy', 'First Solar', 'Enphase', 'Schlumberger',
      'Baker Hughes', 'Halliburton', 'Honeywell',
    ],
    sponsors: [
      'ExxonMobil', 'Chevron', 'Shell', 'BP', 'TotalEnergies',
      'NextEra Energy',
    ],
    speakers: [
      { name: 'Darren Woods', org: 'ExxonMobil', title: 'CEO' },
      { name: 'Mike Wirth', org: 'Chevron', title: 'CEO' },
      { name: 'Jennifer Granholm', org: 'DOE', title: 'Secretary of Energy' },
      { name: 'Fatih Birol', org: 'IEA', title: 'Executive Director' },
      { name: 'Daniel Yergin', org: 'S&P Global', title: 'Vice Chairman' },
    ],
    productsShowcased: [
      'Carbon Capture & Sequestration', 'Hydrogen Electrolyzer Tech',
      'Grid-Scale Battery Storage', 'Digital Oilfield AI',
      'Advanced Geothermal Systems',
    ],
    technologies: [
      'tech-smart-grid', 'tech-utility-scale-solar', 'tech-battery-storage',
      'tech-grid-ai', 'tech-microgrid',
    ],
    website: 'https://ceraweek.com/',
  },

  {
    id: 'conf-re-plus',
    name: 'RE+ (formerly Solar Power International)',
    industry: 'Energy',
    location: 'Anaheim, CA, USA',
    monthTypically: 9,
    exhibitorCount: 1000,
    speakerCount: 250,
    exhibitors: [
      'First Solar', 'NextEra Energy', 'SunPower', 'Enphase Energy',
      'SolarEdge', 'JA Solar', 'Trina Solar', 'LONGi', 'Tesla Energy',
      'Fluence', 'Stem', 'BYD', 'Generac',
    ],
    sponsors: [
      'First Solar', 'NextEra Energy', 'Enphase Energy', 'SolarEdge',
      'Tesla Energy',
    ],
    speakers: [
      { name: 'Mark Widmar', org: 'First Solar', title: 'CEO' },
      { name: 'Badri Kothandaraman', org: 'Enphase Energy', title: 'CEO' },
      { name: 'Abigail Ross Hopper', org: 'SEIA', title: 'President & CEO' },
    ],
    productsShowcased: [
      'First Solar Series 7 Module', 'Tesla Megapack', 'Enphase IQ8 Microinverter',
      'SolarEdge Home Battery', 'Fluence Gridstack', 'LONGi Hi-MO 7',
    ],
    technologies: [
      'tech-utility-scale-solar', 'tech-battery-storage', 'tech-smart-grid',
      'tech-microgrid', 'tech-grid-ai',
    ],
    website: 'https://www.re-plus.com/',
  },

  {
    id: 'conf-distributech',
    name: 'DistribuTECH International',
    industry: 'Energy',
    location: 'Orlando, FL, USA',
    monthTypically: 2,
    exhibitorCount: 500,
    speakerCount: 200,
    exhibitors: [
      'Siemens', 'Schneider Electric', 'ABB', 'GE Vernova', 'Itron',
      'Honeywell', 'Oracle Utilities', 'Landis+Gyr', 'Eaton',
      'SEL (Schweitzer Engineering)', 'Sensus',
    ],
    sponsors: [
      'Siemens', 'GE Vernova', 'Schneider Electric', 'ABB', 'Itron',
    ],
    speakers: [
      { name: 'Scott Strazik', org: 'GE Vernova', title: 'CEO' },
      { name: 'Peter Herweck', org: 'Schneider Electric', title: 'CEO' },
      { name: 'Tom Kuhn', org: 'Edison Electric Institute', title: 'President' },
    ],
    productsShowcased: [
      'GE Vernova GridOS', 'Siemens Spectrum Power', 'Schneider Electric ADMS',
      'Itron Riva Edge Intelligence', 'ABB Ability EDCS',
    ],
    technologies: [
      'tech-smart-grid', 'tech-grid-ai', 'tech-battery-storage',
      'tech-ics-ot-security', 'tech-microgrid',
    ],
    website: 'https://www.distributech.com/',
  },

  {
    id: 'conf-windpower',
    name: 'CLEANPOWER (formerly WINDPOWER)',
    industry: 'Energy',
    location: 'Minneapolis, MN, USA',
    monthTypically: 5,
    exhibitorCount: 450,
    speakerCount: 180,
    exhibitors: [
      'GE Vernova', 'Vestas', 'Siemens Gamesa', 'Goldwind',
      'Nordex', 'Envision', 'TPI Composites', 'NextEra Energy',
      'Avangrid', 'Pattern Energy',
    ],
    sponsors: [
      'GE Vernova', 'Vestas', 'NextEra Energy', 'Siemens Gamesa',
    ],
    speakers: [
      { name: 'Jason Grumet', org: 'ACP (American Clean Power)', title: 'CEO' },
      { name: 'Henrik Andersen', org: 'Vestas', title: 'CEO' },
    ],
    productsShowcased: [
      'GE Vernova Haliade-X 15 MW', 'Vestas V236-15.0 MW', 'Siemens Gamesa SG 14-236 DD',
      'Offshore Floating Wind Platforms',
    ],
    technologies: [
      'tech-smart-grid', 'tech-battery-storage', 'tech-grid-ai',
      'tech-predictive-maintenance', 'tech-digital-twin',
    ],
    website: 'https://cleanpower.org/',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGISTICS (4)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'conf-promat',
    name: 'ProMat',
    industry: 'Logistics',
    location: 'Chicago, IL, USA',
    monthTypically: 3,
    exhibitorCount: 1000,
    speakerCount: 150,
    exhibitors: [
      'Honeywell', 'Dematic', 'Locus Robotics', 'AutoStore', 'Zebra Technologies',
      'Toyota Material Handling', 'Crown Equipment', 'Kardex', 'Bastian Solutions',
      'Geek+', '6 River Systems', 'Fetch Robotics',
    ],
    sponsors: [
      'Honeywell', 'Dematic', 'Zebra Technologies', 'Locus Robotics',
    ],
    speakers: [
      { name: 'John Paxton', org: 'MHI', title: 'CEO' },
      { name: 'Rick Faulk', org: 'Locus Robotics', title: 'CEO' },
      { name: 'Mats Hovmöller', org: 'AutoStore', title: 'CEO' },
    ],
    productsShowcased: [
      'Locus Origin AMR', 'AutoStore Black Line', 'Dematic Multishuttle',
      'Zebra MC9400 Scanner', 'Honeywell Intelligrated Modular',
    ],
    technologies: [
      'tech-warehouse-automation', 'tech-route-optimization',
      'tech-fleet-management', 'tech-rfid-tracking', 'tech-supply-chain-visibility',
    ],
    website: 'https://www.promatshow.com/',
  },

  {
    id: 'conf-cscmp-edge',
    name: 'CSCMP EDGE',
    industry: 'Logistics',
    location: 'Nashville, TN, USA',
    monthTypically: 9,
    exhibitorCount: 300,
    speakerCount: 200,
    exhibitors: [
      'FedEx', 'UPS', 'DHL', 'Maersk', 'Flexport', 'XPO Logistics',
      'C.H. Robinson', 'Blue Yonder', 'Oracle SCM', 'SAP',
      'project44', 'FourKites',
    ],
    sponsors: [
      'FedEx', 'Maersk', 'Flexport', 'Blue Yonder', 'Oracle',
    ],
    speakers: [
      { name: 'Raj Subramaniam', org: 'FedEx', title: 'CEO' },
      { name: 'Ryan Petersen', org: 'Flexport', title: 'CEO' },
      { name: 'Vincent Clerc', org: 'Maersk', title: 'CEO' },
    ],
    productsShowcased: [
      'FedEx SenseAware', 'Flexport Platform', 'FourKites Visibility',
      'Blue Yonder Luminate', 'Oracle SCM Cloud',
    ],
    technologies: [
      'tech-supply-chain-visibility', 'tech-route-optimization',
      'tech-fleet-management', 'tech-digital-freight', 'tech-last-mile',
    ],
    website: 'https://cscmpedge.org/',
  },

  {
    id: 'conf-manifest',
    name: 'Manifest: The Future of Logistics',
    industry: 'Logistics',
    location: 'Las Vegas, NV, USA',
    monthTypically: 2,
    exhibitorCount: 250,
    speakerCount: 300,
    exhibitors: [
      'Flexport', 'FourKites', 'project44', 'Uber Freight', 'Convoy',
      'ShipBob', 'Shippo', 'Nuvocargo', 'Samsara', 'KeepTruckin',
    ],
    sponsors: [
      'Flexport', 'FourKites', 'Samsara', 'project44',
    ],
    speakers: [
      { name: 'Ryan Petersen', org: 'Flexport', title: 'CEO' },
      { name: 'Mathew Elenjickal', org: 'FourKites', title: 'CEO' },
      { name: 'Sanjiv Sidhu', org: 'o9 Solutions', title: 'Chairman & CEO' },
    ],
    productsShowcased: [
      'Flexport Supply Chain OS', 'Samsara Connected Ops Cloud',
      'FourKites Dynamic Yard', 'Nuvocargo Cross-Border Platform',
    ],
    technologies: [
      'tech-supply-chain-visibility', 'tech-digital-freight',
      'tech-fleet-management', 'tech-route-optimization', 'tech-last-mile',
    ],
    website: 'https://www.manife.st/',
  },

  {
    id: 'conf-parcel-forum',
    name: 'Parcel Forum',
    industry: 'Logistics',
    location: 'Dallas, TX, USA',
    monthTypically: 10,
    exhibitorCount: 150,
    speakerCount: 80,
    exhibitors: [
      'FedEx', 'UPS', 'DHL', 'USPS', 'Pitney Bowes', 'Stamps.com',
      'ShipStation', 'EasyPost', 'Lob',
    ],
    sponsors: [
      'FedEx', 'UPS', 'Pitney Bowes', 'ShipStation',
    ],
    speakers: [
      { name: 'John Haber', org: 'Spend Management Experts', title: 'CEO' },
      { name: 'Brie Carere', org: 'FedEx', title: 'EVP & Chief Customer Officer' },
    ],
    productsShowcased: [
      'FedEx Intelligent Delivery', 'UPS DAP', 'Pitney Bowes SendPro',
      'ShipStation Automation Rules',
    ],
    technologies: [
      'tech-last-mile', 'tech-route-optimization', 'tech-fleet-management',
      'tech-supply-chain-visibility',
    ],
    website: 'https://www.parcelforum.com/',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTERPRISE / CLOUD (6)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'conf-reinvent',
    name: 'AWS re:Invent',
    industry: 'Enterprise',
    location: 'Las Vegas, NV, USA',
    monthTypically: 12,
    exhibitorCount: 500,
    speakerCount: 800,
    exhibitors: [
      'Amazon', 'Datadog', 'Snowflake', 'MongoDB', 'HashiCorp',
      'Confluent', 'Databricks', 'Palo Alto Networks', 'CrowdStrike',
      'Splunk', 'New Relic', 'Elastic',
    ],
    sponsors: [
      'Amazon', 'Datadog', 'Snowflake', 'MongoDB', 'Databricks',
    ],
    speakers: [
      { name: 'Matt Garman', org: 'Amazon', title: 'CEO, AWS' },
      { name: 'Werner Vogels', org: 'Amazon', title: 'CTO' },
      { name: 'Swami Sivasubramanian', org: 'AWS', title: 'VP AI & Data' },
    ],
    productsShowcased: [
      'Amazon Bedrock', 'AWS Trainium2', 'Amazon Q Developer',
      'AWS Graviton4', 'Amazon SageMaker HyperPod', 'AWS Clean Rooms',
    ],
    technologies: [
      'tech-generative-ai', 'tech-mlops', 'tech-zero-trust',
      'tech-devsecops', 'tech-edge-ai',
    ],
    website: 'https://reinvent.awsevents.com/',
  },

  {
    id: 'conf-google-cloud-next',
    name: 'Google Cloud Next',
    industry: 'Enterprise',
    location: 'Las Vegas, NV, USA',
    monthTypically: 4,
    exhibitorCount: 350,
    speakerCount: 500,
    exhibitors: [
      'Google', 'Salesforce', 'SAP', 'MongoDB', 'Elastic',
      'Confluent', 'Datadog', 'Palo Alto Networks', 'Informatica',
    ],
    sponsors: [
      'Google', 'Salesforce', 'SAP', 'Accenture', 'Deloitte',
    ],
    speakers: [
      { name: 'Thomas Kurian', org: 'Google Cloud', title: 'CEO' },
      { name: 'Sundar Pichai', org: 'Google', title: 'CEO' },
      { name: 'Urs Hölzle', org: 'Google', title: 'SVP Technical Infrastructure' },
    ],
    productsShowcased: [
      'Gemini for Google Cloud', 'Vertex AI', 'BigQuery Continuous Queries',
      'Google Distributed Cloud', 'Duet AI', 'Mandiant Hunt',
    ],
    technologies: [
      'tech-generative-ai', 'tech-mlops', 'tech-zero-trust',
      'tech-devsecops', 'tech-nlp',
    ],
    website: 'https://cloud.withgoogle.com/next',
  },

  {
    id: 'conf-dreamforce',
    name: 'Salesforce Dreamforce',
    industry: 'Enterprise',
    location: 'San Francisco, CA, USA',
    monthTypically: 9,
    exhibitorCount: 400,
    speakerCount: 600,
    exhibitors: [
      'Salesforce', 'Accenture', 'Deloitte', 'IBM', 'AWS',
      'Google', 'Snowflake', 'Tableau', 'MuleSoft', 'Slack',
    ],
    sponsors: [
      'Salesforce', 'Accenture', 'Deloitte', 'IBM', 'Google',
    ],
    speakers: [
      { name: 'Marc Benioff', org: 'Salesforce', title: 'Chairman & CEO' },
      { name: 'Parker Harris', org: 'Salesforce', title: 'Co-Founder & CTO' },
      { name: 'Clara Shih', org: 'Salesforce AI', title: 'CEO' },
    ],
    productsShowcased: [
      'Salesforce Einstein Copilot', 'Data Cloud', 'Slack AI',
      'Tableau GPT', 'MuleSoft AI Agent', 'Flow Orchestration',
    ],
    technologies: [
      'tech-generative-ai', 'tech-nlp', 'tech-mlops',
      'tech-devsecops',
    ],
    website: 'https://www.salesforce.com/dreamforce/',
  },

  {
    id: 'conf-ces',
    name: 'CES (Consumer Electronics Show)',
    industry: 'Enterprise',
    location: 'Las Vegas, NV, USA',
    monthTypically: 1,
    exhibitorCount: 4000,
    speakerCount: 350,
    exhibitors: [
      'Samsung', 'LG', 'Sony', 'Intel', 'AMD', 'Qualcomm', 'NVIDIA',
      'Google', 'Amazon', 'Microsoft', 'BMW', 'Mercedes-Benz', 'John Deere',
      'Bosch', 'Panasonic', 'TCL', 'Hisense', 'Ring',
    ],
    sponsors: [
      'Samsung', 'Intel', 'Qualcomm', 'LG', 'Sony', 'Google',
    ],
    speakers: [
      { name: 'Lisa Su', org: 'AMD', title: 'CEO' },
      { name: 'Jensen Huang', org: 'NVIDIA', title: 'CEO' },
      { name: 'Gary Shapiro', org: 'CTA', title: 'President & CEO' },
      { name: 'Cristiano Amon', org: 'Qualcomm', title: 'CEO' },
    ],
    productsShowcased: [
      'NVIDIA RTX 5090', 'AMD Ryzen AI', 'Qualcomm Snapdragon X Elite',
      'Samsung Galaxy AI', 'LG Transparent OLED', 'Ring Always Home Cam',
    ],
    technologies: [
      'tech-generative-ai', 'tech-edge-ai', 'tech-computer-vision',
      'tech-smart-grid', 'tech-telemedicine', 'tech-autonomous-systems',
    ],
    website: 'https://www.ces.tech/',
  },

  {
    id: 'conf-microsoft-ignite',
    name: 'Microsoft Ignite',
    industry: 'Enterprise',
    location: 'Seattle, WA, USA',
    monthTypically: 11,
    exhibitorCount: 300,
    speakerCount: 500,
    exhibitors: [
      'Microsoft', 'Dell', 'HPE', 'Lenovo', 'Intel', 'AMD',
      'Accenture', 'Deloitte', 'PwC', 'KPMG',
    ],
    sponsors: [
      'Microsoft', 'Dell', 'Intel', 'Accenture',
    ],
    speakers: [
      { name: 'Satya Nadella', org: 'Microsoft', title: 'Chairman & CEO' },
      { name: 'Kevin Scott', org: 'Microsoft', title: 'CTO' },
      { name: 'Judson Althoff', org: 'Microsoft', title: 'EVP & Chief Commercial Officer' },
    ],
    productsShowcased: [
      'Microsoft 365 Copilot', 'Azure OpenAI Service', 'Microsoft Fabric',
      'Azure AI Studio', 'Windows Copilot Runtime', 'Microsoft Security Copilot',
    ],
    technologies: [
      'tech-generative-ai', 'tech-mlops', 'tech-zero-trust',
      'tech-devsecops', 'tech-nlp', 'tech-siem',
    ],
    website: 'https://ignite.microsoft.com/',
  },

  {
    id: 'conf-kubecon',
    name: 'KubeCon + CloudNativeCon North America',
    industry: 'Enterprise',
    location: 'Chicago, IL, USA',
    monthTypically: 11,
    exhibitorCount: 350,
    speakerCount: 400,
    exhibitors: [
      'Google', 'Microsoft', 'Amazon', 'Red Hat', 'VMware',
      'HashiCorp', 'Datadog', 'Sysdig', 'Aqua Security', 'Isovalent',
      'Solo.io', 'Buoyant', 'Grafana Labs',
    ],
    sponsors: [
      'Google', 'Microsoft', 'Amazon', 'Red Hat', 'VMware',
    ],
    speakers: [
      { name: 'Priyanka Sharma', org: 'CNCF', title: 'Executive Director' },
      { name: 'Kelsey Hightower', org: 'Google', title: 'Developer Advocate (Emeritus)' },
      { name: 'Tim Hockin', org: 'Google', title: 'Principal Engineer, Kubernetes' },
    ],
    productsShowcased: [
      'Kubernetes 1.30+', 'Istio Ambient Mesh', 'Cilium Service Mesh',
      'Backstage Platform', 'Argo Workflows', 'Crossplane Compositions',
    ],
    technologies: [
      'tech-devsecops', 'tech-mlops', 'tech-zero-trust',
      'tech-generative-ai',
    ],
    website: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BORDER / GOVERNMENT (6)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'conf-border-security-expo',
    name: 'Border Security Expo',
    industry: 'Border Tech',
    location: 'San Antonio, TX, USA',
    monthTypically: 3,
    exhibitorCount: 180,
    speakerCount: 80,
    exhibitors: [
      'Elbit Systems of America', 'L3Harris', 'General Dynamics', 'Leidos',
      'FLIR Systems', 'Motorola Solutions', 'Anduril', 'Palantir',
      'Sierra Nevada', 'Raytheon',
    ],
    sponsors: [
      'Elbit Systems of America', 'L3Harris', 'General Dynamics',
      'Motorola Solutions', 'Anduril',
    ],
    speakers: [
      { name: 'Troy Miller', org: 'CBP', title: 'Acting Commissioner' },
      { name: 'Robert Silvers', org: 'DHS', title: 'Under Secretary for Policy' },
      { name: 'Raul Ortiz', org: 'US Border Patrol', title: 'Chief' },
    ],
    productsShowcased: [
      'Elbit IFT Surveillance Towers', 'Anduril Lattice AI', 'FLIR Ranger HDC MR',
      'Palantir Gotham for CBP', 'Motorola CommandCentral',
    ],
    technologies: [
      'tech-surveillance-systems', 'tech-biometrics', 'tech-computer-vision',
      'tech-cargo-scanning', 'tech-rfid-tracking', 'tech-edge-ai',
    ],
    website: 'https://www.bordersecurityexpo.com/',
  },

  {
    id: 'conf-asis-gsx',
    name: 'ASIS GSX (Global Security Exchange)',
    industry: 'Border Tech',
    location: 'Dallas, TX, USA',
    monthTypically: 9,
    exhibitorCount: 550,
    speakerCount: 200,
    exhibitors: [
      'Motorola Solutions', 'Axis Communications', 'Genetec', 'Honeywell',
      'HID Global', 'LenelS2', 'Hikvision', 'Verkada', 'Avigilon',
      'March Networks', 'Milestone Systems',
    ],
    sponsors: [
      'Motorola Solutions', 'Genetec', 'Honeywell', 'Axis Communications',
    ],
    speakers: [
      { name: 'John Fortune', org: 'ASIS International', title: 'CEO' },
      { name: 'Paul de Souza', org: 'CSFI', title: 'Founder' },
      { name: 'Nicole Schwartz', org: 'DHS CISA', title: 'Deputy Director for Stakeholder Engagement' },
    ],
    productsShowcased: [
      'Genetec Security Center', 'Motorola Video Manager', 'Verkada Command',
      'HID Mobile Access', 'Axis ARTPEC-8 Cameras',
    ],
    technologies: [
      'tech-surveillance-systems', 'tech-biometrics', 'tech-computer-vision',
      'tech-ics-ot-security', 'tech-zero-trust',
    ],
    website: 'https://www.gsx.org/',
  },

  {
    id: 'conf-auvsi-xponential',
    name: 'AUVSI XPONENTIAL',
    industry: 'Border Tech',
    location: 'San Diego, CA, USA',
    monthTypically: 5,
    exhibitorCount: 700,
    speakerCount: 250,
    exhibitors: [
      'AeroVironment', 'General Atomics', 'Northrop Grumman', 'L3Harris',
      'Joby Aviation', 'Skydio', 'Shield AI', 'Textron Systems',
      'Boeing Insitu', 'DJI', 'Teledyne FLIR', 'Raytheon',
    ],
    sponsors: [
      'AeroVironment', 'General Atomics', 'Northrop Grumman',
      'L3Harris', 'Shield AI',
    ],
    speakers: [
      { name: 'Michael Robbins', org: 'AUVSI', title: 'CEO' },
      { name: 'Brandon Tseng', org: 'Shield AI', title: 'Co-Founder & President' },
      { name: 'Adam Bry', org: 'Skydio', title: 'CEO' },
      { name: 'Lisa Disbrow', org: 'AUVSI', title: 'EVP, Policy' },
    ],
    productsShowcased: [
      'Switchblade 600', 'MQ-9B SkyGuardian', 'Skydio X10',
      'Shield AI V-BAT', 'AeroVironment JUMP 20',
    ],
    technologies: [
      'tech-autonomous-systems', 'tech-isr', 'tech-edge-ai',
      'tech-computer-vision', 'tech-c4isr',
    ],
    website: 'https://www.xponential.org/',
  },

  {
    id: 'conf-milipol',
    name: 'Milipol Paris',
    industry: 'Border Tech',
    location: 'Paris, Ile-de-France, France',
    monthTypically: 11,
    exhibitorCount: 1000,
    speakerCount: 150,
    exhibitors: [
      'Thales', 'Airbus Defence', 'Safran', 'Idemia', 'Motorola Solutions',
      'Axis Communications', 'Smiths Detection', 'FLIR Systems', 'Atos',
      'Leonardo', 'Rohde & Schwarz',
    ],
    sponsors: [
      'Thales', 'Airbus Defence', 'Safran', 'Idemia',
    ],
    speakers: [
      { name: 'Patrice Caine', org: 'Thales', title: 'Former Chairman & CEO' },
      { name: 'Yann Jounot', org: 'Milipol', title: 'President' },
    ],
    productsShowcased: [
      'Thales Cogent Biometrics', 'Idemia MorphoWave', 'Smiths Detection HI-SCAN',
      'Safran MKW Optronics', 'Atos Evidian Identity',
    ],
    technologies: [
      'tech-biometrics', 'tech-surveillance-systems', 'tech-cargo-scanning',
      'tech-computer-vision', 'tech-ics-ot-security',
    ],
    website: 'https://www.milipol.com/',
  },

  {
    id: 'conf-isc-west',
    name: 'ISC West',
    industry: 'Border Tech',
    location: 'Las Vegas, NV, USA',
    monthTypically: 4,
    exhibitorCount: 1000,
    speakerCount: 120,
    exhibitors: [
      'Honeywell', 'Bosch Security', 'Axis Communications', 'Genetec',
      'Verkada', 'Avigilon', 'HID Global', 'LenelS2', 'Dahua',
      'Hanwha Vision', 'Milestone Systems', 'Brivo',
    ],
    sponsors: [
      'Honeywell', 'Bosch Security', 'Genetec', 'Axis Communications',
    ],
    speakers: [
      { name: 'Don Erickson', org: 'SIA (Security Industry Association)', title: 'CEO' },
      { name: 'Scott Schafer', org: 'Genetec', title: 'CEO' },
    ],
    productsShowcased: [
      'Verkada AI Cameras', 'Genetec Clearance', 'Bosch Camera Trainer',
      'HID Signo Reader', 'Brivo Access AI', 'Axis Body Worn Cameras',
    ],
    technologies: [
      'tech-surveillance-systems', 'tech-biometrics', 'tech-computer-vision',
      'tech-ics-ot-security',
    ],
    website: 'https://www.discoverisc.com/',
  },

  {
    id: 'conf-us-cbp-trade-summit',
    name: 'CBP Trade Summit',
    industry: 'Border Tech',
    location: 'Anaheim, CA, USA',
    monthTypically: 7,
    exhibitorCount: 80,
    speakerCount: 60,
    exhibitors: [
      'Descartes Systems', 'Livingston International', 'Expeditors',
      'C.H. Robinson', 'Nuvocargo', 'KGH Customs',
    ],
    sponsors: [
      'Descartes Systems', 'Livingston International', 'Expeditors',
    ],
    speakers: [
      { name: 'Troy Miller', org: 'CBP', title: 'Acting Commissioner' },
      { name: 'AnnMarie Highsmith', org: 'CBP', title: 'Exec. Asst. Commissioner, Trade' },
    ],
    productsShowcased: [
      'ACE Portal Enhancements', 'USMCA Origin Platforms',
      'Descartes CustomsInfo', 'Livingston Trade Compliance',
    ],
    technologies: [
      'tech-trade-compliance-software', 'tech-rfid-tracking',
      'tech-cargo-scanning', 'tech-supply-chain-visibility',
    ],
    website: 'https://www.cbp.gov/trade',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Exports: lookup maps & helper functions
// ═══════════════════════════════════════════════════════════════════════════

/** Fast O(1) conference lookup by ID */
export const CONFERENCE_BY_ID = new Map(
  CONFERENCE_PROFILES.map(c => [c.id, c])
);

/** Get all conferences matching an industry string (case-insensitive) */
export function getConferencesByIndustry(industry: string): ConferenceProfile[] {
  const lower = industry.toLowerCase();
  return CONFERENCE_PROFILES.filter(c => c.industry.toLowerCase() === lower);
}

/** Get top conferences sorted by exhibitor count (proxy for importance). Default 10. */
export function getTopConferences(limit = 10): ConferenceProfile[] {
  return [...CONFERENCE_PROFILES]
    .sort((a, b) => b.exhibitorCount - a.exhibitorCount)
    .slice(0, limit);
}

/** Get conferences that feature a specific technology ID */
export function getConferencesByTech(techId: string): ConferenceProfile[] {
  return CONFERENCE_PROFILES.filter(c => c.technologies.includes(techId));
}
