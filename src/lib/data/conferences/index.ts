// Conference intelligence barrel — NXT//LINK platform
// Combines all conference data files into a single CONFERENCES export.

export type { ConferenceRecord, ConferenceCategory } from './types';

import { CORE_CONFERENCES } from './core';
import { DEFENSE_GOV_CONFERENCES } from './defense-gov';
import { TECH_AI_CONFERENCES } from './tech-ai';
import { MANUFACTURING_CONFERENCES } from './manufacturing';
import { ENERGY_ENV_CONFERENCES } from './energy-env';
import { HEALTHCARE_BIO_CONFERENCES } from './healthcare-bio';
import { LOGISTICS_TRANSPORT_CONFERENCES } from './logistics-transport';
import { FINANCE_PRO_CONFERENCES } from './finance-pro';
import { CONSUMER_AGRI_CONFERENCES } from './consumer-agri';

export const CONFERENCES = [
  ...CORE_CONFERENCES,
  ...DEFENSE_GOV_CONFERENCES,
  ...TECH_AI_CONFERENCES,
  ...MANUFACTURING_CONFERENCES,
  ...ENERGY_ENV_CONFERENCES,
  ...HEALTHCARE_BIO_CONFERENCES,
  ...LOGISTICS_TRANSPORT_CONFERENCES,
  ...FINANCE_PRO_CONFERENCES,
  ...CONSUMER_AGRI_CONFERENCES,
] as const;
