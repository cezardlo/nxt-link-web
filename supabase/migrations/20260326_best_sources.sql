-- Migration: Create best_sources table for /api/decide (Ask/Solve page)
-- Maps technology needs × industries to recommended products, vendors, and pricing

CREATE TABLE IF NOT EXISTS best_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry text NOT NULL,
  technology_need text NOT NULL,
  best_global_name text NOT NULL,
  best_global_price text,
  best_global_website text,
  best_global_why text,
  best_local_name text,
  best_local_phone text,
  best_value_name text,
  best_value_price text,
  best_value_why text,
  avoid_what text,
  avoid_why text,
  buy_now boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (industry, technology_need)
);

-- Enable RLS
ALTER TABLE best_sources ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "best_sources_public_read" ON best_sources
  FOR SELECT USING (true);

-- ─── Seed: Restaurant ───────────────────────────────────────────────────────

INSERT INTO best_sources (industry, technology_need, best_global_name, best_global_price, best_global_website, best_global_why, best_local_name, best_local_phone, best_value_name, best_value_price, best_value_why, avoid_what, avoid_why, buy_now) VALUES
('restaurant', 'Staff scheduling and payroll', '7shifts', '$35-150/mo', 'https://www.7shifts.com', 'Purpose-built for restaurants. Handles scheduling, time tracking, tip pooling, and labor cost forecasting in one tool.', 'Gusto Payroll', NULL, 'Homebase', 'Free-$100/mo', 'Free tier covers scheduling for 1 location with up to 20 employees.', 'ADP Workforce Now', 'Overkill for restaurants — built for 100+ employee enterprises, expensive, long contracts.', true),
('restaurant', 'Emerging: AI ordering and automation', 'SoundHound AI (Dynamic Interaction)', '$500-2000/mo', 'https://www.soundhound.com', 'Voice AI for drive-through and phone orders. Handles complex orders, upsells automatically, works 24/7 with no breaks.', NULL, NULL, 'Slang.ai', '$200-500/mo', 'Phone answering AI — handles reservations, hours, FAQs so staff focuses on in-person guests.', NULL, NULL, true),
('restaurant', 'Inventory and food management', 'MarketMan', '$240-500/mo', 'https://www.marketman.com', 'Real-time food cost tracking, automatic purchase orders, recipe costing, waste logging. Integrates with Toast/Square.', NULL, NULL, 'BlueCart', '$150-300/mo', 'Good for ordering from suppliers. Less robust on waste tracking than MarketMan.', 'Pen and paper', 'Manual counting misses 20-30% of actual waste and costs 5+ hours/week.', true),
('restaurant', 'Customer loyalty programs', 'Toast Loyalty', '$50-75/mo', 'https://pos.toasttab.com', 'Built into Toast POS — no extra hardware, automatic rewards tracking, integrates with online ordering.', NULL, NULL, 'Square Loyalty', '$45/mo', 'If you already use Square POS, this is the cheapest path to a loyalty program.', 'Punch cards', 'Customers lose them, you cannot track redemption, zero data on customer behavior.', true),
('restaurant', 'Online ordering and delivery', 'ChowNow', '$150-300/mo', 'https://www.chownow.com', 'Commission-free online ordering for your own website and app. You keep 100% of revenue vs. 30% lost to DoorDash.', NULL, NULL, 'Square Online', '$0-72/mo', 'Free online ordering if you use Square POS. Basic but functional.', 'DoorDash/UberEats as only channel', 'They take 15-30% commission and own your customer relationship. Use them for discovery, not as primary.', true)
ON CONFLICT (industry, technology_need) DO NOTHING;

-- ─── Seed: Warehouse ────────────────────────────────────────────────────────

INSERT INTO best_sources (industry, technology_need, best_global_name, best_global_price, best_global_website, best_global_why, best_local_name, best_local_phone, best_value_name, best_value_price, best_value_why, avoid_what, avoid_why, buy_now) VALUES
('warehouse', 'Warehouse management system WMS', 'ShipHero', '$499-2000/mo', 'https://shiphero.com', 'Cloud WMS built for e-commerce fulfillment. Real-time inventory, multi-warehouse, batch picking, rate shopping.', NULL, NULL, 'Sortly', '$49-149/mo', 'Visual inventory management with barcode scanning. Great for small warehouses under 5000 SKUs.', 'SAP WMS', 'Costs $50K+ to implement, takes 6-12 months, designed for massive enterprise operations.', true),
('warehouse', 'Picking and packing automation', 'Locus Robotics AMR', '$15K-25K/robot/yr', 'https://locusrobotics.com', 'Autonomous mobile robots that bring shelves to workers. 2-3x productivity gain, no infrastructure changes needed.', NULL, NULL, '6 River Systems (Shopify)', '$10K-15K/robot/yr', 'Acquired by Shopify — good integration if you use Shopify for fulfillment.', 'Fixed conveyor systems', 'Expensive to install ($100K+), impossible to reconfigure, inflexible for changing product mix.', false),
('warehouse', 'Barcode and RFID scanning', 'Zebra Technologies', '$350-1200/scanner', 'https://www.zebra.com', 'Industry standard for warehouse barcode scanners. Ruggedized, fast, long battery life, works with every WMS.', NULL, NULL, 'Tera Wireless Scanner', '$50-100', 'Budget Bluetooth barcode scanner. Works fine for low-volume scanning. Amazon reviews 4.5 stars.', 'Manual counting', 'Error rate of 5-10% vs 0.01% with barcode scanning. One miscount can cost thousands.', true),
('warehouse', 'Emerging: autonomous mobile robots AMR', 'Boston Dynamics Stretch', '$75K+/robot', 'https://www.bostondynamics.com/stretch', 'Autonomous truck unloading robot. Handles 800 cases/hour. Best for high-volume inbound receiving.', NULL, NULL, 'Fetch Robotics (Zebra)', 'Lease from $2K/mo', 'Autonomous transport robots for moving pallets and carts. Lower cost entry point than Boston Dynamics.', NULL, NULL, false),
('warehouse', 'Security and access control', 'Verkada', '$1K-3K/camera + $200/yr', 'https://www.verkada.com', 'Cloud-managed security cameras with AI analytics. Detects unusual activity, license plates, worker safety violations.', 'Titan Security El Paso', '(915) 532-0202', 'Reolink', '$60-200/camera', 'Great budget cameras with local storage. No monthly fees. Good enough for small warehouses.', 'Hikvision', 'Chinese government-linked company banned from US federal contracts. Security risk.', true)
ON CONFLICT (industry, technology_need) DO NOTHING;

-- ─── Seed: Construction ─────────────────────────────────────────────────────

INSERT INTO best_sources (industry, technology_need, best_global_name, best_global_price, best_global_website, best_global_why, best_local_name, best_local_phone, best_value_name, best_value_price, best_value_why, avoid_what, avoid_why, buy_now) VALUES
('construction', 'Safety compliance tools', 'SafetyCulture (iAuditor)', 'Free-$24/user/mo', 'https://safetyculture.com', 'Digital safety inspections, incident reporting, corrective actions. Used by 1M+ workers globally. OSHA-compliant templates built in.', NULL, NULL, 'SafetySnap', '$10/user/mo', 'Simple OSHA inspection app with photo documentation. Less features but cheaper.', 'Paper checklists', 'Courts and OSHA penalize paper-based systems harder. Digital records are timestamped and tamper-proof.', true),
('construction', 'Workforce scheduling', 'Buildertrend', '$499-1199/mo', 'https://buildertrend.com', 'All-in-one construction project management — scheduling, time tracking, client portal, budgeting, daily logs.', NULL, NULL, 'Jobber', '$49-249/mo', 'Built for field service companies. Great scheduling, invoicing, and client communication at a lower price.', 'Excel spreadsheets', 'No real-time visibility, version conflicts, no mobile access for field crews.', true),
('construction', 'Accounting and job costing', 'Foundation Software', '$400-800/mo', 'https://foundationsoft.com', 'Construction-specific accounting with job costing, AIA billing, certified payroll, and compliance reporting.', NULL, NULL, 'QuickBooks Contractor', '$90-200/mo', 'Affordable if you already know QuickBooks. Add-ons for job costing available.', 'Spreadsheets for job costing', 'Impossible to track real costs per job accurately. You are flying blind on profitability.', true),
('construction', 'Employee time tracking', 'Busybusy', '$10-15/user/mo', 'https://busybusy.com', 'GPS time tracking for construction crews. Geofenced clock-in, daily reports, equipment tracking. Built for the field.', NULL, NULL, 'Homebase', 'Free-$24/user/mo', 'Free tier covers basic time tracking with GPS. Good for small crews under 20 people.', 'Paper timesheets', 'Buddy punching costs US construction firms $373M/year. GPS time tracking eliminates it.', true)
ON CONFLICT (industry, technology_need) DO NOTHING;

-- ─── Seed: Logistics / Border ───────────────────────────────────────────────

INSERT INTO best_sources (industry, technology_need, best_global_name, best_global_price, best_global_website, best_global_why, best_local_name, best_local_phone, best_value_name, best_value_price, best_value_why, avoid_what, avoid_why, buy_now) VALUES
('logistics', 'Cargo tracking and visibility', 'project44', 'Custom pricing', 'https://www.project44.com', 'Real-time supply chain visibility across ocean, air, truck, rail. Used by major shippers and 3PLs worldwide.', NULL, NULL, 'FourKites', 'Custom pricing', 'Strong alternative with good carrier network. Better for domestic trucking visibility.', 'Manual carrier check calls', 'Takes 15-30 minutes per shipment. Real-time platforms do it automatically for thousands simultaneously.', true),
('logistics', 'ELD and compliance tools', 'Samsara', '$25-35/vehicle/mo', 'https://www.samsara.com', 'All-in-one fleet platform — ELD compliance, GPS tracking, dash cams, fuel management, driver safety scoring.', NULL, NULL, 'KeepTruckin (Motive)', '$20-30/vehicle/mo', 'Strong ELD with AI dash cam. Slightly cheaper than Samsara with similar features.', 'Paper logs', 'Illegal for most commercial vehicles since 2019. FMCSA fines start at $16K per violation.', true),
('border_tech', 'Customs brokerage software', 'Descartes CustomsInfo', 'Custom pricing', 'https://www.descartes.com', 'Comprehensive customs compliance platform. HS code lookup, duty calculation, restricted party screening, FTA management.', 'CHB Group El Paso', '(915) 778-9999', 'Flexport', 'Custom pricing', 'Modern freight forwarder with built-in customs brokerage. Good for companies new to importing.', 'Single customs broker with no software', 'You have zero visibility into clearance status and cannot audit broker decisions.', true),
('border_tech', 'Cross-border customs software', 'MIC CCS', 'Custom pricing', 'https://www.mic-cust.com', 'Cross-border customs clearance system used at major US-Mexico ports. Automates documentation, tariff classification.', 'El Paso PTAC', '(915) 831-7745', 'Livingston International', 'Custom pricing', 'Canadian-based customs broker with strong US-Mexico expertise and technology platform.', NULL, NULL, true),
('border_tech', 'Emerging: AI customs processing', 'Altana AI', 'Custom pricing', 'https://altana.ai', 'AI-powered supply chain intelligence. Maps global trade networks to identify risks, sanctions violations, and forced labor.', NULL, NULL, 'Exiger', 'Custom pricing', 'AI risk management for supply chains. Strong on sanctions screening and due diligence.', NULL, NULL, false),
('logistics', 'Dispatch management system', 'DispatchTrack', '$50-100/driver/mo', 'https://www.dispatchtrack.com', 'AI-powered route optimization and delivery management. Last-mile scheduling, proof of delivery, customer notifications.', NULL, NULL, 'Routific', '$39-59/driver/mo', 'Route optimization with a clean interface. Best for delivery companies doing 50-500 stops/day.', 'Manual dispatch via phone/radio', 'Costs 20-30% more in fuel and labor. Cannot optimize routes across more than 5 drivers manually.', true)
ON CONFLICT (industry, technology_need) DO NOTHING;

-- ─── Seed: Window Cleaning / Field Service ──────────────────────────────────

INSERT INTO best_sources (industry, technology_need, best_global_name, best_global_price, best_global_website, best_global_why, best_local_name, best_local_phone, best_value_name, best_value_price, best_value_why, avoid_what, avoid_why, buy_now) VALUES
('window_cleaning', 'Job scheduling and dispatch', 'Jobber', '$49-249/mo', 'https://getjobber.com', 'Built for home service businesses. Online booking, automated reminders, GPS crew tracking, invoicing, and payments in one app.', NULL, NULL, 'Housecall Pro', '$49-169/mo', 'Strong alternative with good marketing features like automated review requests.', 'Text message scheduling', 'No audit trail, easily lost, cannot track job profitability or crew utilization.', true),
('window_cleaning', 'Invoicing and payment collection', 'Square Invoices', 'Free (2.6% + $0.10/card)', 'https://squareup.com', 'Free invoicing with same-day deposits. Customers pay via link. Automatic late payment reminders.', NULL, NULL, 'Wave', 'Free', 'Completely free invoicing and accounting. Ad-supported but fully functional.', 'Paper invoices', 'Average collection time is 3x longer. Customers lose them and you lose the paper trail.', true),
('window_cleaning', 'Marketing and lead generation', 'Google Local Services Ads', '$25-75/lead', 'https://ads.google.com/local-services-ads', 'Pay-per-lead (not per click). Google Guaranteed badge builds trust. Best ROI for local service businesses.', NULL, NULL, 'Nextdoor Business', 'Free-$50/mo', 'Neighborhood-based marketing. High trust factor. Free organic posts, paid ads available.', 'Yelp advertising', 'Extremely expensive ($300-1000/mo) with questionable lead quality. Known for aggressive sales tactics.', true),
('window_cleaning', 'Customer relationship CRM', 'Jobber CRM (built-in)', '$49-249/mo', 'https://getjobber.com', 'CRM built into Jobber — tracks every customer, job history, notes, automated follow-ups, and review requests.', NULL, NULL, 'HubSpot Free CRM', 'Free', 'Powerful free CRM with contact tracking, email templates, and basic automation. Good if you do not need scheduling.', 'Notebook/spreadsheet', 'Cannot automate follow-ups. Forgetting one follow-up call loses $200-500 in revenue.', true)
ON CONFLICT (industry, technology_need) DO NOTHING;
