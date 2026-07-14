// Category-specific specification templates — industrial buyers expect the
// right fields per equipment class (a forklift asks capacity/mast/power; a WMS
// asks users/integrations), not one generic form. Values persist in the
// existing listing `specs` jsonb (Record<string,string>), so no migration is
// needed; the normalized specification_definitions tables are a Phase 3 target.
// Vendors can always add custom fields the template doesn't cover.

export interface SpecFieldDef {
  label: string;            // becomes the specs key buyers see
  hint?: string;            // placeholder
  options?: string[];       // renders a select when present
}
export interface SpecTemplate { name: string; match: RegExp; fields: SpecFieldDef[] }

export const SPEC_TEMPLATES: SpecTemplate[] = [
  {
    name: 'Forklift / lift truck',
    match: /forklift|lift truck|pallet jack|reach truck|order picker|telehandler/i,
    fields: [
      { label: 'Load capacity', hint: 'e.g. 5,000 lb' },
      { label: 'Lift height', hint: 'e.g. 188 in' },
      { label: 'Power', options: ['Electric', 'Propane', 'Diesel', 'Dual fuel', 'Manual'] },
      { label: 'Indoor / outdoor', options: ['Indoor', 'Outdoor', 'Indoor & outdoor'] },
      { label: 'Condition', options: ['New', 'Used', 'Refurbished'] },
      { label: 'Battery type', hint: 'e.g. Lead-acid 48V, Lithium-ion' },
    ],
  },
  {
    name: 'Warehouse software',
    match: /\bwms\b|\btms\b|\berp\b|yard management|warehouse management|software|saas|platform/i,
    fields: [
      { label: 'System type', options: ['WMS', 'TMS', 'ERP', 'Yard management', 'Inventory', 'Other'] },
      { label: 'Deployment', options: ['Cloud', 'On-premise', 'Hybrid'] },
      { label: 'Users supported', hint: 'e.g. 5–500' },
      { label: 'Facilities supported', hint: 'e.g. Multi-site' },
      { label: 'Integrations', hint: 'e.g. SAP, NetSuite, UPS, FedEx' },
      { label: 'Implementation time', hint: 'e.g. 6–12 weeks' },
      { label: 'Contract length', hint: 'e.g. Annual, Month-to-month' },
    ],
  },
  {
    name: 'Machine vision / inspection',
    match: /machine vision|inspection|vision system|camera system|defect/i,
    fields: [
      { label: 'Product inspected', hint: 'e.g. PCBs, bottles, labels' },
      { label: 'Defects detected', hint: 'e.g. Scratches, missing components' },
      { label: 'Line speed', hint: 'e.g. 120 parts/min' },
      { label: 'Camera type', hint: 'e.g. Area scan, line scan, 3D' },
      { label: 'Accuracy', hint: 'e.g. ±0.1 mm' },
      { label: 'Lighting requirements', hint: 'e.g. Integrated LED dome' },
      { label: 'Software integrations', hint: 'e.g. PLC, MES' },
    ],
  },
  {
    name: 'Racking & storage',
    match: /rack|shelv|mezzanine|storage system|pallet position/i,
    fields: [
      { label: 'Rack type', options: ['Selective', 'Drive-in', 'Push-back', 'Pallet flow', 'Cantilever', 'Mezzanine'] },
      { label: 'Upright height', hint: 'e.g. 240 in' },
      { label: 'Bay width', hint: 'e.g. 96 in' },
      { label: 'Capacity per level', hint: 'e.g. 6,000 lb' },
      { label: 'Seismic rating', hint: 'e.g. Zone 4 compliant' },
      { label: 'Installation included', options: ['Yes', 'No', 'Optional'] },
    ],
  },
  {
    name: 'Conveyor / sortation',
    match: /conveyor|sortation|sorter/i,
    fields: [
      { label: 'Conveyor type', options: ['Belt', 'Roller', 'MDR', 'Chain', 'Spiral', 'Sortation'] },
      { label: 'Belt width', hint: 'e.g. 24 in' },
      { label: 'Speed', hint: 'e.g. 90 fpm' },
      { label: 'Load capacity', hint: 'e.g. 75 lb/ft' },
      { label: 'Power', hint: 'e.g. 480V 3-phase' },
      { label: 'Controls', hint: 'e.g. PLC included, VFD' },
    ],
  },
  {
    name: 'Scanning & labeling',
    match: /scanner|barcode|rfid|label|printer|mobile computer/i,
    fields: [
      { label: 'Device type', hint: 'e.g. Handheld scanner, wearable, printer' },
      { label: 'Scan range', hint: 'e.g. Up to 40 ft' },
      { label: 'Connectivity', hint: 'e.g. Wi-Fi 6, Bluetooth, USB' },
      { label: 'Rugged rating', hint: 'e.g. IP65, 6 ft drop' },
      { label: 'Battery life', hint: 'e.g. Full shift (12 hr)' },
      { label: 'Software compatibility', hint: 'e.g. Any WMS via keyboard wedge' },
    ],
  },
  {
    name: 'Robotics & automation',
    match: /robot|amr|agv|cobot|automation cell|palletiz/i,
    fields: [
      { label: 'Robot type', options: ['AMR', 'AGV', 'Robotic arm', 'Cobot', 'Palletizer', 'ASRS'] },
      { label: 'Payload', hint: 'e.g. 1,500 lb' },
      { label: 'Throughput', hint: 'e.g. 30 picks/hour' },
      { label: 'Navigation', hint: 'e.g. LiDAR SLAM, magnetic tape' },
      { label: 'Safety rating', hint: 'e.g. ISO 3691-4' },
      { label: 'Fleet software included', options: ['Yes', 'No', 'Optional'] },
    ],
  },
];

/** Best template for a category/name, or null → generic custom fields only. */
export function templateFor(category: string, name = ''): SpecTemplate | null {
  const hay = `${category} ${name}`;
  return SPEC_TEMPLATES.find((t) => t.match.test(hay)) || null;
}
