// NXT//LINK Marketplace — unified product type

export type PriceEstimate = 'low' | 'medium' | 'high' | 'enterprise';
export type ImplDifficulty = 'easy' | 'moderate' | 'advanced';
export type Maturity = 'emerging' | 'growing' | 'mature';
export type Momentum = 'rising' | 'stable' | 'declining';

export type MarketplaceProduct = {
  id: string;
  name: string;
  company: string;
  category: string;
  description: string;
  longDescription: string;
  industries: string[];
  features: string[];
  priceEstimate: PriceEstimate;
  priceRange: string;
  implementationDifficulty: ImplDifficulty;
  deploymentTimeline: string;
  bestFor: string[];
  maturity: Maturity;
  momentum: Momentum;
  recommendationScore: number;
  recommendationReason: string;
  researchNotes: string;
  buyerInsight: string;
  watchOutFor: string[];
  alternatives: string[];
  tags: string[];
  isNxtPick: boolean;
  source: 'rich' | 'simple';
};

export type SortKey =
  | 'nxt-recommended'
  | 'best-rated'
  | 'trending'
  | 'lowest-cost'
  | 'fastest-impl';

export type MarketplaceFilters = {
  search?: string;
  industries?: string[];
  priceEstimate?: PriceEstimate[];
  maturity?: Maturity[];
  implementationSpeed?: ImplDifficulty[];
  companySizeFit?: string[];
};

export type Facets = {
  industries: Record<string, number>;
  priceEstimate: Record<string, number>;
  maturity: Record<string, number>;
  implementationSpeed: Record<string, number>;
};
