// Row types for the Conference & Event Strategy tables
// (supabase/migrations/20260706_event_strategy_platform.sql).

export type EventOrgKind =
  | 'conference'
  | 'expo'
  | 'chamber'
  | 'association'
  | 'economic_development'
  | 'other';

export type Priority = 'high' | 'medium' | 'low';
export type Difficulty = 'low' | 'medium' | 'high';
export type TechReadiness = 'low' | 'medium' | 'high';

export type CompanySegment =
  | 'warehouse'
  | 'manufacturer'
  | 'maquiladora'
  | 'logistics'
  | 'supplier'
  | 'vendor'
  | 'investor'
  | 'consultant'
  | 'other';

export type ConceptStatus = 'draft' | 'active' | 'archived';
export type MemberStatus = 'proposed' | 'invited' | 'confirmed' | 'declined';

export type PipelineStage =
  | 'research'
  | 'selection'
  | 'partner_outreach'
  | 'invite_building'
  | 'vendor_recruitment'
  | 'demo_planning'
  | 'marketing'
  | 'execution'
  | 'follow_up'
  | 'pilot_conversion';

export type PipelineStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

export interface AuditFields {
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventOrganization extends AuditFields {
  id: string;
  kind: EventOrgKind;
  name: string;
  location: string | null;
  source_url: string;
  source_verified_on: string; // YYYY-MM-DD
  audience: string | null;
  industries: string[];
  attendees_estimate: string | null;
  relevance: string | null;
  mission_fit: string | null;
  participation_recommendation: string | null;
  estimated_cost: string | null;
  cost_source_url: string | null;
  cost_verified_on: string | null;
  timing_frequency: string | null;
  priority: Priority;
  score_customers: number | null;
  score_vendors: number | null;
  score_global_trends: number | null;
  score_cross_border: number | null;
  is_sample: boolean;
  notes: string | null;
}

export interface WowIdea extends AuditFields {
  id: string;
  idea: string;
  where_used: string | null;
  why_impressive: string | null;
  worker_support: string | null;
  local_adaptation: string | null;
  difficulty: Difficulty;
  cost_range: string | null;
  target_local_company: string | null;
  demo_concept: string | null;
  source_url: string | null;
  source_verified_on: string | null;
  is_sample: boolean;
  notes: string | null;
}

export interface DecisionMaker {
  name: string;
  role?: string;
  email?: string;
}

export interface TargetCompany extends AuditFields {
  id: string;
  name: string;
  segment: CompanySegment;
  industry: string | null;
  company_size: string | null;
  location: string | null;
  pain_points: string[];
  tech_readiness: TechReadiness | null;
  decision_makers: DecisionMaker[];
  is_sample: boolean;
  notes: string | null;
}

export interface EventConcept extends AuditFields {
  id: string;
  template_key: string | null;
  title: string;
  audience: string | null;
  theme: string | null;
  speakers: string[];
  vendors: string[];
  demos: string[];
  venue: string | null;
  sponsors: string[];
  invitees: string[];
  value_statement: string | null;
  anti_sales_safeguards: string | null;
  follow_up_plan: string | null;
  revenue_model: string | null;
  status: ConceptStatus;
  is_sample: boolean;
  notes: string | null;
}

export interface InviteList extends AuditFields {
  id: string;
  name: string;
  purpose: string | null;
  event_org_id: string | null;
  concept_id: string | null;
  is_sample: boolean;
}

export interface InviteListMember extends AuditFields {
  id: string;
  list_id: string;
  company_id: string | null;
  vendor_application_id: string | null;
  role_at_event: string | null;
  status: MemberStatus;
  notes: string | null;
}

export interface PipelineOutcomes {
  meetings?: number;
  audits?: number;
  pilots?: number;
  paid_projects?: number;
}

export interface EventPipelineItem extends AuditFields {
  id: string;
  title: string;
  stage: PipelineStage;
  status: PipelineStatus;
  concept_id: string | null;
  event_org_id: string | null;
  owner: string | null;
  due_on: string | null;
  notes: string | null;
  outcomes: PipelineOutcomes;
  is_sample: boolean;
}

/** The vendor_applications columns the event program reads for matching. */
export interface VendorForMatching {
  id: string;
  company_name: string;
  category: string | null;
  technology_category: string | null;
  region: string | null;
  pain_points_solved: string[];
  target_company_types: string[];
  conference_interests: string[];
  participation_preference: string | null;
  demo_capabilities: string | null;
  worker_support_value: string | null;
}
