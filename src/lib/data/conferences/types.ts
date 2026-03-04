// Conference intelligence types — NXT//LINK platform

export type ConferenceCategory =
  // Original
  | 'Defense' | 'Cybersecurity' | 'Manufacturing' | 'Logistics' | 'Robotics'
  | 'AI/ML' | 'Energy' | 'Border/Gov' | 'Construction' | 'Healthcare' | 'Workforce'
  // Expanded — Defense & Government
  | 'Aerospace' | 'Government IT' | 'Homeland Security' | 'Intelligence'
  // Expanded — Technology
  | 'IoT' | 'Cloud Computing' | 'Data Centers' | 'Semiconductors' | 'Smart Cities'
  | 'Telecom' | 'Software' | 'Blockchain' | 'Quantum Computing'
  // Expanded — Manufacturing & Industrial
  | '3D Printing' | 'Chemical' | 'Packaging' | 'Textiles' | 'HVAC' | 'Plastics'
  | 'Fabrication' | 'Quality/Testing'
  // Expanded — Energy & Environment
  | 'Oil & Gas' | 'Mining' | 'Nuclear' | 'Water' | 'Environmental'
  | 'Waste Management' | 'Solar' | 'Wind'
  // Expanded — Healthcare & Life Sciences
  | 'Pharma' | 'Biotech' | 'Medical Devices' | 'Dental' | 'Veterinary'
  // Expanded — Logistics & Transportation
  | 'Supply Chain' | 'Trucking' | 'Aviation' | 'Maritime' | 'Rail' | 'Automotive'
  | 'Fleet Management' | 'Warehousing'
  // Expanded — Finance & Professional
  | 'Finance' | 'Insurance' | 'Real Estate' | 'Legal' | 'Accounting' | 'Consulting'
  // Expanded — Consumer & Other
  | 'Retail' | 'Food & Beverage' | 'Agriculture' | 'Education' | 'Hospitality'
  | 'Media' | 'Sports' | 'Safety';

export type ConferenceRecord = {
  id: string;
  name: string;
  category: ConferenceCategory;
  location: string;
  month: string;
  description: string;
  estimatedExhibitors: number;
  relevanceScore: number;
  website: string;
  lat: number;
  lon: number;
};
