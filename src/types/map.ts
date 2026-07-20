// ─── Shared Map Types ────────────────────────────────────────────────────────
// Used by MapCanvas, CmdK, map/layers API, and RightPanel

export type MapPoint = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  category: string;
  layer: string;
  weight: number;
  confidence: number;
  entity_id?: string;
};

export type LayerApiResponse = {
  ok?: boolean;
  offline?: boolean;
  points?: MapPoint[];
};

export type SelectedPoint = {
  id: string;
  label: string;
  category: string;
  entity_id?: string;
  layer?: string;
};
