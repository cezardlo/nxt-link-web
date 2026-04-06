// POST /api/mcp - NXT LINK MCP endpoint
// JSON-RPC 2.0 endpoint implementing the Model Context Protocol.
// AI agents can query NXT LINK intelligence programmatically.
//
// Auth: X-MCP-Key header or Authorization: Bearer <key>
//       If MCP_API_KEY env var is not set, auth is disabled (dev mode).
//
// Methods:
//   initialize   - MCP handshake
//   ping         - Health check
//   tools/list   - List available tools
//   tools/call   - Execute a tool

import { NextResponse } from 'next/server';
import { validateAuth, processRawBody } from '@/lib/mcp/server';
import { RPC_ERRORS } from '@/lib/mcp/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = validateAuth(request.headers);
  if (!auth.valid) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32000,
          message: 'Unauthorized',
          data: auth.error,
        },
      },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: RPC_ERRORS.PARSE_ERROR.code,
          message: RPC_ERRORS.PARSE_ERROR.message,
          data: 'Request body must be valid JSON',
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await processRawBody(body);
    return NextResponse.json(result, {
      headers: {
        'Content-Type': 'application/json',
        'X-MCP-Server': 'nxt-link-mcp/1.0.0',
      },
    });
  } catch (err) {
    console.error('[mcp] Unhandled error:', err);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: RPC_ERRORS.INTERNAL_ERROR.code,
          message: RPC_ERRORS.INTERNAL_ERROR.message,
          data: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

// GET - Discovery and health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      name: 'nxt-link-mcp',
      version: '1.0.0',
      protocol: 'MCP (Model Context Protocol)',
      protocolVersion: '2024-11-05',
      transport: 'HTTP JSON-RPC 2.0',
      endpoint: '/api/mcp',
      methods: ['initialize', 'ping', 'tools/list', 'tools/call'],
      auth: process.env.MCP_API_KEY ? 'required (X-MCP-Key or Bearer token)' : 'disabled (dev mode)',
      tools: [
        'search_vendors - Search vendor database with IKER scores',
        'get_vendor_dossier - Full intelligence dossier for a vendor',
        'list_signals - Get recent intelligence signals',
        'get_signal_connections - Get connected signals graph',
        'solve_problem - Run the NXT LINK solve engine',
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-MCP-Server': 'nxt-link-mcp/1.0.0',
      },
    }
  );
}
