// ─── Graph Database Client (Neo4j) ───────────────────────────────────────────
// Ready to wire up when Neo4j Aura is provisioned.
// Free tier: 200K nodes, 400K relationships — ~2 years of runway.
//
// To enable: set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env.local
// Install: npm install neo4j-driver

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER ?? 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

// Neo4j Aura uses the Query API v2. The database name defaults to the user ID.
const NEO4J_DATABASE = process.env.NEO4J_DATABASE ?? NEO4J_USER;

/** Derive the HTTPS base URL from the bolt URI */
function getHttpBase(): string {
  if (!NEO4J_URI) return '';
  // neo4j+s://xxx.databases.neo4j.io → https://xxx.databases.neo4j.io
  return NEO4J_URI.replace('neo4j+s://', 'https://').replace('neo4j://', 'http://');
}

export type GraphNode = {
  id: string;
  label: string;  // Signal, Company, Technology, Industry, Geography
  properties: Record<string, unknown>;
};

export type GraphEdge = {
  source: string;
  target: string;
  type: ConnectionType;
  properties: Record<string, unknown>;
};

export type ConnectionType =
  | 'causal'
  | 'temporal'
  | 'entity'
  | 'geographic'
  | 'thematic'
  | 'cluster';

export type GraphResult = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/**
 * Run a Cypher query against Neo4j.
 * Falls back to empty results when Neo4j is not configured.
 */
export async function graphQuery(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>[]> {
  if (!NEO4J_URI || !NEO4J_PASSWORD) {
    console.warn('[graph] Neo4j not configured — returning empty results');
    return [];
  }

  try {
    // Use Neo4j Aura Query API v2 (works on free tier)
    const httpBase = getHttpBase();
    const res = await fetch(`${httpBase}/db/${NEO4J_DATABASE}/query/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${NEO4J_USER}:${NEO4J_PASSWORD}`).toString('base64')}`,
      },
      body: JSON.stringify({
        statement: cypher,
        parameters: params,
      }),
    });

    if (!res.ok) {
      console.warn(`[graph] Neo4j query failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const fields = data.data?.fields as string[] | undefined;
    const values = data.data?.values as unknown[][] | undefined;
    if (!fields?.length || !values?.length) return [];

    return values.map((row: unknown[]) => {
      const obj: Record<string, unknown> = {};
      fields.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  } catch (err) {
    console.warn('[graph] Neo4j query error:', err);
    return [];
  }
}

/**
 * Find all connections for a signal up to N hops deep.
 */
export async function findConnections(
  signalId: string,
  depth: number = 1
): Promise<GraphResult> {
  if (!isGraphEnabled()) {
    return { nodes: [], edges: [] };
  }

  const results = await graphQuery(
    `MATCH path = (s:Signal {id: $signalId})-[r*1..${Math.min(depth, 3)}]-(connected)
     RETURN nodes(path) as nodes, relationships(path) as rels
     LIMIT 50`,
    { signalId }
  );

  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const row of results) {
    const nodes = row.nodes as Array<{ identity: string; labels: string[]; properties: Record<string, unknown> }>;
    const rels = row.rels as Array<{ type: string; start: string; end: string; properties: Record<string, unknown> }>;

    for (const n of nodes) {
      if (!nodeMap.has(String(n.identity))) {
        nodeMap.set(String(n.identity), {
          id: String(n.properties.id ?? n.identity),
          label: n.labels[0] ?? 'Unknown',
          properties: n.properties,
        });
      }
    }

    for (const r of rels) {
      edges.push({
        source: String(r.start),
        target: String(r.end),
        type: r.type.toLowerCase() as ConnectionType,
        properties: r.properties,
      });
    }
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

/**
 * Create a connection edge between two signals.
 */
export async function createConnection(
  sourceId: string,
  targetId: string,
  type: ConnectionType,
  properties: Record<string, unknown> = {}
): Promise<boolean> {
  if (!isGraphEnabled()) return false;

  const results = await graphQuery(
    `MATCH (a:Signal {id: $sourceId}), (b:Signal {id: $targetId})
     MERGE (a)-[r:${type.toUpperCase()} $props]->(b)
     RETURN r`,
    { sourceId, targetId, props: properties }
  );

  return results.length > 0;
}

/** Check if Neo4j is configured and reachable */
export function isGraphEnabled(): boolean {
  return !!(NEO4J_URI && NEO4J_PASSWORD);
}
