import { INDUSTRIES, type IndustrySlug } from './technology-catalog';

const RAW_SECTOR_TO_INDUSTRY: Record<string, IndustrySlug> = {
  // Logistics
  'Logistics': 'logistics',
  'Logistics & Transport': 'logistics',
  'Logistics & 3PL': 'logistics',
  '3PL & Logistics Services': 'logistics',
  'Maritime & Shipping': 'logistics',
  'Maritime Transport': 'logistics',
  'Marine Transport': 'logistics',
  'Ocean & Maritime': 'logistics',
  'Air Transport': 'logistics',
  'Intermodal & Rail': 'logistics',
  'Intermodal Transport': 'logistics',
  'Road Transport Services': 'logistics',
  'Road and Rail Transport': 'logistics',
  'Trucking': 'logistics',
  'Trucking Carrier': 'logistics',
  'Trucking Services': 'logistics',
  'Trucking Technology': 'logistics',
  'Trucking OEM': 'logistics',
  'Truck OEM': 'logistics',
  'Trailer OEM': 'logistics',
  'Fleet & Trucking Tech': 'logistics',
  'Auto / Fleet': 'logistics',
  'Fleet/IoT Platform': 'logistics',
  'Freight Brokerage': 'logistics',
  'Freight Forwarder': 'logistics',
  'Freight Technology': 'logistics',
  'Digital Freight': 'logistics',
  'Fulfillment & Logistics': 'logistics',
  'Reverse Logistics': 'logistics',
  'Automotive Logistics': 'logistics',
  'Cross-Border Logistics': 'logistics',
  'Cross-Border Express': 'logistics',
  'Drone & UAV Logistics': 'logistics',
  'Chemical & Energy Logistics': 'logistics',
  'Food & Produce Logistics': 'logistics',
  'Cold Chain': 'logistics',
  'Pharma Logistics': 'logistics',
  'Pharma Supply Chain': 'logistics',
  'Defense Logistics': 'logistics',
  'Defense & Government Logistics': 'logistics',
  'Carrier': 'logistics',
  'Shipbrokers': 'logistics',
  'Cargo Security': 'logistics',
  'Breakbulk & Project Cargo': 'logistics',
  'Ports & Terminals': 'logistics',
  'Dock & Yard Management': 'logistics',
  'Storage & Racking': 'logistics',
  'Warehousing': 'logistics',
  'Warehouse Automation': 'logistics',
  'Forklifts & Material Handling': 'logistics',
  'Supply Chain & Material Handling': 'logistics',
  'Supply Chain Software': 'logistics',
  'Supply Chain Technology': 'logistics',
  'Supply Chain Visibility': 'logistics',
  'Supply Chain AI': 'logistics',
  'Supply Chain Intelligence': 'logistics',
  'Supply Chain Planning': 'logistics',
  'Supply Chain Platform': 'logistics',
  'Supply Chain Risk Insurance': 'logistics',
  'Retail Supply Chain': 'logistics',
  'Risk & Disruption Intelligence': 'logistics',
  'Risk Intelligence': 'logistics',
  'Risk Management': 'logistics',
  'Visibility & Tracking': 'logistics',
  'Intralogistics': 'logistics',
  'Procurement': 'logistics',
  'Procurement & Sourcing': 'logistics',
  'Transportation Management': 'logistics',
  'Transportation Analytics': 'logistics',
  'Route Optimization': 'logistics',
  'Standards & Barcoding': 'logistics',
  'Barcode & Vision Systems': 'logistics',
  'Sensors & IoT': 'logistics',
  'IoT': 'logistics',
  'IoT Connectivity': 'logistics',
  'Connectivity & IoT': 'logistics',
  'Connected Worker': 'logistics',
  'Quality & Traceability': 'logistics',
  'Process Intelligence': 'logistics',
  'Customs Technology': 'logistics',
  'Trade Consulting': 'logistics',
  'Unified SCM Platform': 'logistics',
  'ERP/Supply Chain Cloud': 'logistics',
  'ERP/SCM': 'logistics',
  'Industrial ERP': 'logistics',
  'Industry Related Services': 'logistics',
  'Retail & eCommerce': 'logistics',
  'Retail Technology': 'logistics',
  'Consumer Goods': 'logistics',
  'Food': 'logistics',
  'Fresh Produce & Food': 'logistics',
  'FinTech': 'logistics',
  'Fintech & Insurance': 'logistics',
  'Latin America Payments': 'logistics',
  'Payments Technology': 'logistics',

  // Manufacturing
  'Manufacturing Technology': 'manufacturing',
  'Manufacturing': 'manufacturing',
  'Advanced Manufacturing': 'manufacturing',
  'Smart Manufacturing': 'manufacturing',
  'Precision Manufacturing': 'manufacturing',
  'Additive Manufacturing': 'manufacturing',
  'Metal 3D Printing': 'manufacturing',
  'Manufacturing Robotics': 'manufacturing',
  'Manufacturing Analytics': 'manufacturing',
  'Manufacturing Operations': 'manufacturing',
  'Manufacturing Platform': 'manufacturing',
  'Manufacturing Services': 'manufacturing',
  'Nearshore Manufacturing': 'manufacturing',
  'Nearshore Mfg Services': 'manufacturing',
  'Electronics Manufacturing': 'manufacturing',
  'EV Manufacturing': 'manufacturing',
  'Appliance Manufacturing': 'manufacturing',
  'Textile Technology': 'manufacturing',
  'Robotics': 'manufacturing',
  'Robotics & Automation': 'manufacturing',
  'Robotics-as-a-Service': 'manufacturing',
  'Robotics/Automation': 'manufacturing',
  'Robotics and Automation 2026': 'manufacturing',
  'Industrial Automation': 'manufacturing',
  'Humanoid Robotics': 'manufacturing',
  'Adaptive Robotics': 'manufacturing',
  'Collaborative Robotics': 'manufacturing',
  'Autonomous Mobile Robots': 'manufacturing',
  'Warehouse Robotics': 'manufacturing',
  'Warehouse AI Robotics': 'manufacturing',
  'Drones & Autonomous': 'manufacturing',
  'Autonomous Vehicles': 'manufacturing',
  'CNC/Robotics': 'manufacturing',
  'Fabrication': 'manufacturing',
  'Industrial': 'manufacturing',
  'Industrial AI/Predictive Maintenance': 'manufacturing',
  'Heavy Equipment': 'manufacturing',
  'Equipment Provider': 'manufacturing',
  'Engineering': 'manufacturing',
  'Auto Components': 'manufacturing',
  'Automotive Supplier': 'manufacturing',
  'Automotive': 'manufacturing',
  'Aerospace': 'manufacturing',
  'Aerospace/Automation': 'manufacturing',
  'Auto/Industrial': 'manufacturing',
  'Safety & Ergonomics': 'manufacturing',
  'Packaging': 'manufacturing',
  'Semiconductor & High-Tech': 'manufacturing',
  'Semiconductors': 'manufacturing',
  'Consumer Electronics': 'manufacturing',
  'Telecom Equipment': 'manufacturing',
  'Electronics/EV': 'manufacturing',

  // Defense
  'Defense': 'defense',
  'Defense IT': 'defense',
  'Defense Electronics': 'defense',
  'Defense Analytics': 'defense',
  'Defense Manufacturing': 'defense',
  'Defense & Intelligence': 'defense',
  'Aerospace/Defense': 'defense',
  'Infrastructure & Defense': 'defense',
  'Intelligence & Cyber': 'defense',

  // Border Tech
  'Border & Trade': 'border-tech',
  'Border Tech': 'border-tech',
  'Cross-Border Technology': 'border-tech',
  'Cross-Border Payments': 'border-tech',
  'Cross-Border Fintech': 'border-tech',

  // AI/ML
  'AI & Computing': 'ai-ml',
  'AI / ML': 'ai-ml',
  'AI Data Centers': 'ai-ml',
  'GPU Cloud for AI': 'ai-ml',
  'Cloud/AI Infrastructure': 'ai-ml',
  'Cloud Computing': 'ai-ml',
  'Cloud Infrastructure': 'ai-ml',
  'Hyperscale Infrastructure': 'ai-ml',
  'Edge Data Centers': 'ai-ml',
  'Mixed Colocation': 'ai-ml',
  'Data Center REIT': 'ai-ml',
  'Data Center Campuses': 'ai-ml',
  'Data Analytics Platform': 'ai-ml',
  'Analytics': 'ai-ml',
  'Backbone Connectivity': 'ai-ml',
  'CDN + Edge Delivery': 'ai-ml',
  'Network Infrastructure': 'ai-ml',
  'Infrastructure & Data Centers': 'ai-ml',
  'Fiber Infrastructure': 'ai-ml',
  'Fiber/Bandwidth Infrastructure': 'ai-ml',
  'Fiber ISP': 'ai-ml',
  'Enterprise Fiber': 'ai-ml',
  'Enterprise Wi-Fi/5G': 'ai-ml',
  'Enterprise IT': 'ai-ml',
  'Startup & AI': 'ai-ml',

  // Cybersecurity
  'Cybersecurity': 'cybersecurity',
  'Fraud Detection': 'cybersecurity',

  // Energy
  'Energy': 'energy',
  'Batteries & Power': 'energy',
  'Sustainability': 'energy',
  'Sustainability & Policy': 'energy',
  'Water Tech': 'energy',
  'HVAC': 'energy',
  'Electric Vehicles': 'energy',
  'Clean Transportation': 'energy',
  'Clean Fleet Vehicles': 'energy',

  // Healthcare
  'Health Tech': 'healthcare',
  'Medical Devices': 'healthcare',
  'Healthcare/Medtech': 'healthcare',
};

export function mapToCanonicalIndustry(rawSector: string | null | undefined): IndustrySlug | null {
  if (!rawSector) return null;
  if (RAW_SECTOR_TO_INDUSTRY[rawSector]) return RAW_SECTOR_TO_INDUSTRY[rawSector];

  const lower = rawSector.toLowerCase();
  if (lower.includes('logistic') || lower.includes('supply chain') || lower.includes('freight')
    || lower.includes('shipping') || lower.includes('warehouse') || lower.includes('transport')
    || lower.includes('cargo') || lower.includes('procurement') || lower.includes('trucking')
    || lower.includes('fleet') || lower.includes('rail') || lower.includes('maritime')
    || lower.includes('cold chain') || lower.includes('intermodal') || lower.includes('3pl')) {
    return 'logistics';
  }
  if (lower.includes('manufactur') || lower.includes('robot') || lower.includes('automation')
    || lower.includes('industrial') || lower.includes('fabrication') || lower.includes('aerospace')
    || lower.includes('automotive') || lower.includes('semiconductor') || lower.includes('electronics')) {
    return 'manufacturing';
  }
  if (lower.includes('defense') || lower.includes('defence') || lower.includes('military')) {
    return 'defense';
  }
  if (lower.includes('border') || lower.includes('cross-border') || lower.includes('customs')) {
    return 'border-tech';
  }
  if (lower.includes('ai ') || lower.startsWith('ai/') || lower.includes(' ai') || lower.includes('cloud')
    || lower.includes('data center') || lower.includes('analytics') || lower.includes('infrastructure')
    || lower.includes('fiber') || lower.includes('network')) {
    return 'ai-ml';
  }
  if (lower.includes('cyber') || lower.includes('security') || lower.includes('fraud')) {
    return 'cybersecurity';
  }
  if (lower.includes('energy') || lower.includes('battery') || lower.includes('solar')
    || lower.includes('clean ') || lower.includes('sustainab') || lower.includes('electric vehicle')
    || lower.includes('water')) {
    return 'energy';
  }
  if (lower.includes('health') || lower.includes('medical') || lower.includes('pharma')
    || lower.includes('biotech') || lower.includes('medtech')) {
    if (lower.includes('logistic') || lower.includes('supply')) return 'logistics';
    return 'healthcare';
  }
  return null;
}

let _industryToRawCache: Record<IndustrySlug, string[]> | null = null;
export function industryToRawSectors(slug: IndustrySlug): string[] {
  if (!_industryToRawCache) {
    const cache: Record<string, string[]> = {};
    for (const [raw, ind] of Object.entries(RAW_SECTOR_TO_INDUSTRY)) {
      (cache[ind] ||= []).push(raw);
    }
    _industryToRawCache = cache as Record<IndustrySlug, string[]>;
  }
  return _industryToRawCache[slug] || [];
}

export function isCanonicalIndustryToken(token: string): IndustrySlug | null {
  const lower = token.toLowerCase().trim();
  const direct = INDUSTRIES.find(i => i.slug === lower || i.label.toLowerCase() === lower);
  if (direct) return direct.slug;
  if (lower === 'ai-ml' || lower === 'ai/ml' || lower === 'ai / ml' || lower === 'ai-ml') return 'ai-ml';
  return null;
}

export { INDUSTRIES, type IndustrySlug };
