export { getDb, isSupabaseConfigured } from './client';

export {
  logAgentRun,
  getRecentRuns,
  getRunById,
} from './queries/agent-runs';

export {
  upsertFeedItems,
  queryFeedItems,
  cleanOldItems,
  type FeedItemRow,
  type FeedItemInsert,
  type FeedQueryOptions,
} from './queries/feed-items';

export {
  insertSignal,
  getActiveSignals,
  type SignalRow,
  type SignalInsert,
  type SignalQueryOptions,
} from './queries/signals';

export {
  upsertOpportunity,
  queryOpportunities,
  type OpportunityRow,
  type OpportunityInsert,
  type OpportunityQueryOptions,
} from './queries/opportunities';

export {
  insertSectorScore,
  getLatestScores,
  type SectorScoreRow,
  type SectorScoreInsert,
} from './queries/sector-scores';

export {
  getVendors,
  getVendorById,
  upsertVendors,
  type VendorRecord,
} from './queries/vendors';

export {
  getConferences,
  searchConferences,
  upsertConferences,
  type ConferenceRecord,
} from './queries/conferences';

export {
  getTechnologies,
  searchTechnologies,
  upsertTechnologies,
  type Technology,
} from './queries/technologies';

export {
  persistIntelSignals,
  getIntelSignals,
  getIntelSignalStats,
  computeImportanceScore,
  type IntelSignalRow,
  type IntelSignalInsert,
  type IntelSignalQueryOptions,
} from './queries/intel-signals';

export {
  saveDailyBriefing,
  getRecentBriefings,
  getBriefingByDate,
  type DailyBriefingRow,
  type DailyBriefingInsert,
  type BriefingSection,
  type BriefingHighlight,
} from './queries/daily-briefings';

export {
  upsertProducts,
  getProducts,
  getProductStats,
  searchProductsByUseCase,
  type ProductRow,
  type ProductInsert,
  type ProductQueryOptions,
} from './queries/products';

export {
  persistConferenceIntel,
  getConferenceIntel,
  getConferenceIntelStats,
  type ConferenceIntelRow,
  type ConferenceIntelInsert,
  type ConferenceIntelQueryOptions,
} from './queries/conference-intel';

export {
  getTopIndustries,
  getRecentIndustries,
  getDynamicIndustry,
  getChildIndustries,
  upsertDynamicIndustry,
  bumpIndustryPopularity,
  searchDynamicIndustries,
  type DynamicIndustryRow,
  type DynamicIndustryUpsert,
} from './queries/dynamic-industries';
