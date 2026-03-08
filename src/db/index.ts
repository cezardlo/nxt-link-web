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
