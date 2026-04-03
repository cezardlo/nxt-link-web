-- Causal Maps: structured knowledge from Obsidian
-- Each row = one problem with its full causal chain
-- Signal → match problem → load this map → deterministic decision

CREATE TABLE IF NOT EXISTS causal_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Problem definition
  problem text NOT NULL UNIQUE,             -- e.g. "border delays", "tariff increase"
  description text,                          -- human explanation

  -- Causal chain (stored as structured JSON)
  causes text[] NOT NULL DEFAULT '{}',       -- what triggers this problem
  effects jsonb NOT NULL DEFAULT '[]',       -- [{label, severity, timeframe}]
  solutions text[] NOT NULL DEFAULT '{}',    -- what can be done
  technologies text[] NOT NULL DEFAULT '{}', -- what tools address it

  -- Classification
  event_type text NOT NULL,                  -- trade_policy, conflict, labor, etc.
  keywords text[] NOT NULL DEFAULT '{}',     -- words that identify this problem in signals

  -- Matching
  industries text[] NOT NULL DEFAULT '{}',   -- which industries this applies to
  regions text[] NOT NULL DEFAULT '{}',      -- geographic relevance

  -- Metadata
  source text DEFAULT 'manual',              -- 'obsidian', 'manual', 'auto'
  confidence real DEFAULT 1.0,               -- how reliable this map is
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_causal_maps_event ON causal_maps (event_type);
CREATE INDEX IF NOT EXISTS idx_causal_maps_active ON causal_maps (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_causal_maps_keywords ON causal_maps USING gin (keywords);
CREATE INDEX IF NOT EXISTS idx_causal_maps_industries ON causal_maps USING gin (industries);

-- RLS
ALTER TABLE causal_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "causal_maps_read" ON causal_maps FOR SELECT USING (true);
CREATE POLICY "causal_maps_write" ON causal_maps FOR INSERT WITH CHECK (true);
CREATE POLICY "causal_maps_update" ON causal_maps FOR UPDATE USING (true);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_causal_maps_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_causal_maps_updated
  BEFORE UPDATE ON causal_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_causal_maps_timestamp();

-- ── SEED DATA: Convert current hardcoded rules into DB rows ──────────────────

INSERT INTO causal_maps (problem, description, event_type, causes, effects, solutions, technologies, keywords, industries, regions, source) VALUES

-- Trade Policy
('tariff increase', 'New or increased tariffs on imports/exports affecting supply chain costs', 'trade_policy',
  ARRAY['government policy', 'trade war', 'protectionism', 'political decision'],
  '[{"label":"Cost increase on imported goods","severity":"high","timeframe":"weeks"},{"label":"Pre-tariff inventory buildup","severity":"high","timeframe":"immediate"},{"label":"Suppliers shift to new countries","severity":"medium","timeframe":"months"},{"label":"Trade routes and corridors shift","severity":"medium","timeframe":"months"}]'::jsonb,
  ARRAY['diversify suppliers', 'pre-buy inventory', 'renegotiate contracts', 'nearshore sourcing'],
  ARRAY['freight audit', 'rate benchmarking', 'TMS', 'load optimization', 'demand forecasting'],
  ARRAY['tariff', 'tariffs', 'trade war', 'import duty', 'export ban', 'section 301', 'section 232', 'anti-dumping', 'countervailing'],
  ARRAY['logistics', 'manufacturing', 'border-tech'],
  ARRAY['usa', 'mexico', 'el-paso', 'china'],
  'seed'),

('trade agreement change', 'Changes to USMCA or other trade agreements affecting cross-border operations', 'trade_policy',
  ARRAY['renegotiation', 'political shift', 'compliance requirement'],
  '[{"label":"Compliance requirements change","severity":"medium","timeframe":"months"},{"label":"Cross-border process disruption","severity":"high","timeframe":"weeks"},{"label":"Cost structure shifts","severity":"medium","timeframe":"months"}]'::jsonb,
  ARRAY['update compliance systems', 'consult customs broker', 'review supply chain structure'],
  ARRAY['customs brokerage software', 'compliance management', 'cross-border customs software'],
  ARRAY['usmca', 'nafta', 'trade agreement', 'trade deal', 'nearshoring', 'reshoring', 'friendshoring'],
  ARRAY['logistics', 'manufacturing', 'border-tech'],
  ARRAY['usa', 'mexico', 'el-paso'],
  'seed'),

('sanctions or embargo', 'Sanctions or trade embargoes affecting supply sources', 'trade_policy',
  ARRAY['geopolitical tension', 'government policy', 'human rights'],
  '[{"label":"Supply source blocked","severity":"high","timeframe":"immediate"},{"label":"Need alternate sourcing","severity":"high","timeframe":"weeks"},{"label":"Compliance risk if violated","severity":"high","timeframe":"immediate"}]'::jsonb,
  ARRAY['find alternative suppliers', 'screen all partners', 'update compliance checks'],
  ARRAY['supplier management', 'sourcing platform', 'supply chain visibility', 'compliance management'],
  ARRAY['sanctions', 'embargo', 'trade restriction', 'blocked entity'],
  ARRAY['logistics', 'manufacturing'],
  ARRAY['global'],
  'seed'),

-- Conflict
('shipping route disruption', 'Military conflict or piracy disrupting major shipping lanes', 'conflict',
  ARRAY['military conflict', 'piracy', 'territorial dispute', 'naval blockade'],
  '[{"label":"Shipping routes disrupted","severity":"high","timeframe":"immediate"},{"label":"Freight rates and insurance spike","severity":"high","timeframe":"immediate"},{"label":"Delivery delays cascade","severity":"high","timeframe":"weeks"},{"label":"Need alternate routing","severity":"medium","timeframe":"weeks"}]'::jsonb,
  ARRAY['reroute shipments', 'pre-stock critical items', 'diversify carriers', 'review insurance'],
  ARRAY['real-time tracking', 'route optimization', 'risk monitoring', 'supply chain visibility'],
  ARRAY['war', 'conflict', 'blockade', 'red sea', 'houthi', 'suez', 'panama canal', 'piracy', 'strait'],
  ARRAY['logistics', 'manufacturing'],
  ARRAY['global', 'middle-east', 'asia'],
  'seed'),

('regional conflict supply risk', 'Armed conflict in a supply source region', 'conflict',
  ARRAY['war', 'invasion', 'civil unrest', 'terrorism'],
  '[{"label":"Supply shortage from affected region","severity":"high","timeframe":"weeks"},{"label":"Price spikes on affected materials","severity":"high","timeframe":"immediate"},{"label":"Need alternate sourcing urgently","severity":"high","timeframe":"weeks"}]'::jsonb,
  ARRAY['activate backup suppliers', 'increase safety stock', 'find nearshore alternatives'],
  ARRAY['supplier discovery', 'sourcing platform', 'inventory optimization', 'risk monitoring'],
  ARRAY['invasion', 'military', 'missile', 'attack', 'bombing', 'escalation', 'tensions'],
  ARRAY['logistics', 'manufacturing'],
  ARRAY['global'],
  'seed'),

-- Labor
('driver shortage', 'Shortage of qualified truck drivers affecting freight capacity', 'labor',
  ARRAY['aging workforce', 'low wages', 'poor conditions', 'regulation burden', 'lifestyle'],
  '[{"label":"Freight capacity shrinks","severity":"high","timeframe":"weeks"},{"label":"Shipping costs increase","severity":"medium","timeframe":"weeks"},{"label":"Delivery reliability drops","severity":"medium","timeframe":"immediate"}]'::jsonb,
  ARRAY['improve driver retention', 'increase pay', 'improve working conditions', 'use technology to reduce workload'],
  ARRAY['driver recruiting platforms', 'driver retention tools', 'workforce scheduling', 'telematics'],
  ARRAY['driver shortage', 'cdl', 'trucker', 'driver retention', 'driver turnover', 'hiring drivers'],
  ARRAY['logistics'],
  ARRAY['usa', 'el-paso'],
  'seed'),

('labor strike', 'Workers strike disrupting port, warehouse, or transport operations', 'labor',
  ARRAY['wage dispute', 'working conditions', 'union action', 'contract negotiation'],
  '[{"label":"Operations shut down or slow drastically","severity":"high","timeframe":"immediate"},{"label":"Cargo backlogs build up","severity":"high","timeframe":"immediate"},{"label":"Alternative routing needed","severity":"medium","timeframe":"immediate"}]'::jsonb,
  ARRAY['reroute through unaffected ports', 'pre-ship critical inventory', 'negotiate contingency plans'],
  ARRAY['route optimization', 'contingency planning', 'overflow logistics', 'real-time tracking'],
  ARRAY['strike', 'walkout', 'union', 'labor dispute', 'picket', 'port strike', 'dock workers'],
  ARRAY['logistics', 'manufacturing'],
  ARRAY['usa', 'global'],
  'seed'),

-- Infrastructure
('port congestion', 'Port congestion causing delays and increased costs', 'infrastructure',
  ARRAY['volume surge', 'labor shortage', 'equipment shortage', 'weather', 'vessel bunching'],
  '[{"label":"Cargo dwell times increase","severity":"high","timeframe":"immediate"},{"label":"Demurrage and detention charges","severity":"high","timeframe":"immediate"},{"label":"Delays cascade to inland transport","severity":"medium","timeframe":"weeks"}]'::jsonb,
  ARRAY['divert to less congested ports', 'pre-book chassis', 'extend free time', 'use inland ports'],
  ARRAY['yard management', 'dock scheduling', 'capacity planning', 'real-time tracking', 'TMS'],
  ARRAY['port congestion', 'port delay', 'vessel queue', 'container backlog', 'dwell time', 'chassis shortage'],
  ARRAY['logistics'],
  ARRAY['usa', 'global'],
  'seed'),

('border delays', 'Delays at US-Mexico border crossings affecting cross-border logistics', 'infrastructure',
  ARRAY['inspection increases', 'staffing shortages at CBP', 'volume spikes', 'security alerts', 'system outages'],
  '[{"label":"Trucks waiting hours at POE","severity":"high","timeframe":"immediate"},{"label":"Perishable goods at risk","severity":"high","timeframe":"immediate"},{"label":"Production schedules disrupted in maquiladoras","severity":"high","timeframe":"immediate"},{"label":"Increased costs from detention and fuel","severity":"medium","timeframe":"weeks"}]'::jsonb,
  ARRAY['use less congested crossing points', 'adjust shipment timing', 'get C-TPAT certified', 'pre-clear customs electronically'],
  ARRAY['customs brokerage software', 'cross-border customs software', 'real-time tracking', 'document automation'],
  ARRAY['border delay', 'border crossing', 'port of entry', 'cbp', 'customs delay', 'bridge wait', 'ysleta', 'bota', 'santa teresa'],
  ARRAY['logistics', 'manufacturing', 'border-tech'],
  ARRAY['el-paso', 'usa', 'mexico'],
  'seed'),

-- Regulation
('eld compliance', 'Electronic logging device and hours of service compliance requirements', 'regulation',
  ARRAY['fmcsa mandate', 'safety regulation', 'enforcement action'],
  '[{"label":"Non-compliant carriers face fines","severity":"high","timeframe":"immediate"},{"label":"Driver availability reduced by HOS limits","severity":"medium","timeframe":"weeks"},{"label":"Operational processes must change","severity":"medium","timeframe":"weeks"}]'::jsonb,
  ARRAY['install compliant ELD devices', 'train drivers on HOS rules', 'monitor compliance scores'],
  ARRAY['ELD', 'compliance management', 'safety management', 'driver qualification file management'],
  ARRAY['eld', 'hos', 'hours of service', 'fmcsa', 'dot', 'csa score', 'inspection', 'compliance'],
  ARRAY['logistics'],
  ARRAY['usa'],
  'seed'),

('emission regulation', 'New emission standards affecting fleet operations and costs', 'regulation',
  ARRAY['epa mandate', 'state regulation', 'climate policy', 'zero emission zone'],
  '[{"label":"Fleet upgrade costs","severity":"high","timeframe":"months"},{"label":"Operating cost changes","severity":"medium","timeframe":"months"},{"label":"Route restrictions in emission zones","severity":"medium","timeframe":"weeks"}]'::jsonb,
  ARRAY['plan fleet transition', 'evaluate EV options', 'optimize routes for efficiency'],
  ARRAY['fleet management', 'route optimization', 'telematics', 'EV charging infrastructure'],
  ARRAY['emission', 'epa', 'zero emission', 'electric truck', 'clean air', 'carbon', 'diesel ban'],
  ARRAY['logistics', 'manufacturing'],
  ARRAY['usa', 'california'],
  'seed'),

-- Demand
('demand surge', 'Sudden increase in freight demand exceeding capacity', 'demand_shift',
  ARRAY['seasonal peak', 'stimulus spending', 'inventory restocking', 'e-commerce growth'],
  '[{"label":"Carrier capacity tightens","severity":"high","timeframe":"immediate"},{"label":"Spot rates spike","severity":"high","timeframe":"immediate"},{"label":"Service levels degrade","severity":"medium","timeframe":"weeks"}]'::jsonb,
  ARRAY['lock in contract rates early', 'diversify carrier base', 'shift to intermodal', 'pre-position inventory'],
  ARRAY['freight rate benchmarking', 'load board platforms', 'TMS', 'capacity planning', 'demand forecasting'],
  ARRAY['demand surge', 'capacity crunch', 'peak season', 'holiday shipping', 'inventory restocking', 'consumer spending'],
  ARRAY['logistics', 'manufacturing'],
  ARRAY['usa'],
  'seed'),

-- Technology
('autonomous trucking', 'Self-driving truck technology advancing toward commercial deployment', 'technology',
  ARRAY['technology maturation', 'regulatory progress', 'investment surge'],
  '[{"label":"Long-haul cost structure changes","severity":"medium","timeframe":"months"},{"label":"Driver role evolves","severity":"medium","timeframe":"months"},{"label":"Early adopters gain advantage","severity":"medium","timeframe":"months"}]'::jsonb,
  ARRAY['monitor pilot programs', 'evaluate middle-mile autonomy', 'plan workforce transition'],
  ARRAY['autonomous vehicle platform', 'telematics', 'route optimization', 'fleet management'],
  ARRAY['autonomous', 'self-driving', 'driverless', 'robotruck', 'automated trucking', 'platooning'],
  ARRAY['logistics'],
  ARRAY['usa', 'texas'],
  'seed'),

-- Climate
('weather disruption', 'Severe weather disrupting transportation and warehouse operations', 'climate',
  ARRAY['hurricane', 'flood', 'ice storm', 'tornado', 'heat wave'],
  '[{"label":"Routes and facilities disrupted","severity":"high","timeframe":"immediate"},{"label":"Temporary capacity loss","severity":"high","timeframe":"immediate"},{"label":"Recovery and insurance costs","severity":"medium","timeframe":"weeks"}]'::jsonb,
  ARRAY['activate contingency plans', 'reroute shipments', 'communicate with customers proactively'],
  ARRAY['contingency planning', 'real-time tracking', 'route optimization', 'risk monitoring', 'business continuity'],
  ARRAY['hurricane', 'flood', 'wildfire', 'tornado', 'ice storm', 'blizzard', 'weather', 'natural disaster', 'power outage'],
  ARRAY['logistics', 'manufacturing'],
  ARRAY['usa', 'global'],
  'seed'),

-- Financial
('carrier bankruptcy', 'Major carrier or logistics provider going bankrupt', 'financial',
  ARRAY['debt burden', 'market downturn', 'competition', 'mismanagement'],
  '[{"label":"Capacity suddenly removed from market","severity":"high","timeframe":"immediate"},{"label":"Shipments in transit at risk","severity":"high","timeframe":"immediate"},{"label":"Remaining carriers raise rates","severity":"medium","timeframe":"weeks"}]'::jsonb,
  ARRAY['diversify carrier base', 'monitor carrier financial health', 'have backup carriers ready'],
  ARRAY['carrier management platforms', 'credit monitoring', 'risk assessment', 'load board platforms'],
  ARRAY['bankruptcy', 'shutdown', 'carrier failure', 'closing operations', 'financial trouble', 'debt'],
  ARRAY['logistics'],
  ARRAY['usa'],
  'seed')

ON CONFLICT (problem) DO UPDATE SET
  description = EXCLUDED.description,
  causes = EXCLUDED.causes,
  effects = EXCLUDED.effects,
  solutions = EXCLUDED.solutions,
  technologies = EXCLUDED.technologies,
  keywords = EXCLUDED.keywords,
  industries = EXCLUDED.industries,
  regions = EXCLUDED.regions;
