import type { ConferenceRecord, ConferenceCategory } from '@/lib/data/conference-intel';
import { CONFERENCE_CATEGORY_COLORS } from '@/lib/utils/design-tokens';

/* ── Types ────────────────────────────────────────────────────────────── */

/** A cluster of conferences that share the same coordinates */
export type ConferenceCluster = {
  id: string;
  lat: number;
  lon: number;
  locationLabel: string;
  conferences: ConferenceRecord[];
  count: number;
  dominantCategory: ConferenceCategory;
  dominantColor: [number, number, number];
  avgRelevance: number;
  maxRelevance: number;
  categoryBreakdown: Record<string, number>;
};

/** Individual conference with offset coords for expanded view */
export type ExpandedConference = ConferenceRecord & {
  displayLat: number;
  displayLon: number;
  clusterId: string;
};

/* ── Haversine distance (km) ─────────────────────────────────────────── */

function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Build clusters — distance-based merge (50 km radius) ────────────── */

const MERGE_RADIUS_KM = 50;

export function buildConferenceClusters(
  conferences: readonly ConferenceRecord[],
): ConferenceCluster[] {
  // Step 1: assign each conference to nearest existing bucket, or create new one
  const buckets: { lat: number; lon: number; confs: ConferenceRecord[] }[] = [];

  for (const c of conferences) {
    let merged = false;
    for (const b of buckets) {
      if (distKm(c.lat, c.lon, b.lat, b.lon) <= MERGE_RADIUS_KM) {
        b.confs.push(c);
        merged = true;
        break;
      }
    }
    if (!merged) {
      buckets.push({ lat: c.lat, lon: c.lon, confs: [c] });
    }
  }

  // Step 2: build cluster objects
  const result: ConferenceCluster[] = [];

  for (let i = 0; i < buckets.length; i++) {
    const confs = buckets[i].confs;
    const catCount: Record<string, number> = {};
    let totalRelevance = 0;
    let maxRelevance = 0;
    let sumLat = 0;
    let sumLon = 0;

    for (const c of confs) {
      catCount[c.category] = (catCount[c.category] ?? 0) + 1;
      totalRelevance += c.relevanceScore;
      if (c.relevanceScore > maxRelevance) maxRelevance = c.relevanceScore;
      sumLat += c.lat;
      sumLon += c.lon;
    }

    // Use centroid as cluster position
    const centroidLat = sumLat / confs.length;
    const centroidLon = sumLon / confs.length;

    let dominantCat = confs[0].category;
    let maxCount = 0;
    for (const [cat, cnt] of Object.entries(catCount)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        dominantCat = cat as ConferenceCategory;
      }
    }

    // Pick best location label (from the conference with highest relevance)
    const bestConf = confs.reduce((a, b) => a.relevanceScore >= b.relevanceScore ? a : b);

    result.push({
      id: `cluster_${i}`,
      lat: centroidLat,
      lon: centroidLon,
      locationLabel: bestConf.location,
      conferences: confs,
      count: confs.length,
      dominantCategory: dominantCat,
      dominantColor: CONFERENCE_CATEGORY_COLORS[dominantCat] ?? [0, 212, 255],
      avgRelevance: Math.round(totalRelevance / confs.length),
      maxRelevance,
      categoryBreakdown: catCount,
    });
  }

  result.sort((a, b) => b.count - a.count);
  return result;
}

/* ── Expand a single cluster into spiral-offset individual markers ──── */

const GOLDEN_ANGLE = 2.399963; // radians — produces even spiral distribution

export function expandCluster(
  cluster: ConferenceCluster,
  offsetDegrees: number,
): ExpandedConference[] {
  const { conferences, id: clusterId, lat: centerLat, lon: centerLon } = cluster;

  if (conferences.length === 1) {
    return [{
      ...conferences[0],
      displayLat: conferences[0].lat,
      displayLon: conferences[0].lon,
      clusterId,
    }];
  }

  // Sort by relevanceScore descending — highest relevance at center
  const sorted = [...conferences].sort((a, b) => b.relevanceScore - a.relevanceScore);

  return sorted.map((c, i) => {
    if (i === 0) {
      return { ...c, displayLat: centerLat, displayLon: centerLon, clusterId };
    }
    const angle = i * GOLDEN_ANGLE;
    const radius = offsetDegrees * Math.sqrt(i);
    return {
      ...c,
      displayLat: centerLat + radius * Math.sin(angle),
      displayLon: centerLon + radius * Math.cos(angle),
      clusterId,
    };
  });
}

/* ── Expand all clusters ──────────────────────────────────────────────── */

export function expandAllClusters(
  clusters: ConferenceCluster[],
  offsetDegrees: number,
): ExpandedConference[] {
  const result: ExpandedConference[] = [];
  for (const cluster of clusters) {
    result.push(...expandCluster(cluster, offsetDegrees));
  }
  return result;
}
