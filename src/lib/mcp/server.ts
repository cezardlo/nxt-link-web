// NXT LINK MCP server
// Model Context Protocol server for AI agent access to NXT LINK intelligence.
// Implements JSON-RPC 2.0 compatible with the MCP specification.
// No SDK dependency - pure protocol implementation.

import type {
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
  McpToolCallParams,
} from './types';
import { RPC_ERRORS } from './types';
import { TOOL_DEFINITIONS, executeTool } from './tools';

const SERVER_INFO = {
  name: 'nxt-link-mcp',
  version: '1.0.0',
  protocolVersion: '2024-11-05',
};

const SERVER_CAPABILITIES = {
  tools: {
    listChanged: false,
  },
};

const MCP_API_KEY = process.env.MCP_API_KEY;

export function validateAuth(headers: Headers): { valid: boolean; error?: string } {
  if (!MCP_API_KEY) {
    return { valid: true };
  }

  const mcpKey = headers.get('x-mcp-key');
  const authHeader = headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const providedKey = mcpKey ?? bearerToken;

  if (!providedKey) {
    return { valid: false, error: 'Missing API key. Provide X-MCP-Key header or Authorization: Bearer <key>.' };
  }

  if (providedKey !== MCP_API_KEY) {
    return { valid: false, error: 'Invalid API key.' };
  }

  return { valid: true };
}

export async function processRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { jsonrpc, id, method, params } = request;

  if (jsonrpc !== '2.0') {
    return makeError(id ?? 0, RPC_ERRORS.INVALID_REQUEST, 'jsonrpc must be "2.0"');
  }

  if (!id && id !== 0) {
    return makeError(0, RPC_ERRORS.INVALID_REQUEST, 'Missing request id');
  }

  switch (method) {
    case 'initialize':
      return handleInitialize(id);
    case 'ping':
      return handlePing(id);
    case 'tools/list':
      return handleToolsList(id);
    case 'tools/call':
      return await handleToolsCall(id, params as Record<string, unknown> | undefined);
    default:
      return makeError(id, RPC_ERRORS.METHOD_NOT_FOUND, `Unknown method: ${method}`);
  }
}

export async function processRawBody(body: unknown): Promise<JsonRpcResponse | JsonRpcResponse[]> {
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return makeError(0, RPC_ERRORS.INVALID_REQUEST, 'Empty batch');
    }

    const results = await Promise.all(body.map((req) => processRequest(req as JsonRpcRequest)));
    return results;
  }

  if (body && typeof body === 'object' && 'method' in body) {
    return processRequest(body as JsonRpcRequest);
  }

  return makeError(0, RPC_ERRORS.INVALID_REQUEST, 'Request must be a JSON-RPC 2.0 object or array');
}

function handleInitialize(id: string | number): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      protocolVersion: SERVER_INFO.protocolVersion,
      capabilities: SERVER_CAPABILITIES,
      serverInfo: {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
      },
    },
  };
}

function handlePing(id: string | number): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      status: 'ok',
      server: SERVER_INFO.name,
      version: SERVER_INFO.version,
      timestamp: new Date().toISOString(),
    },
  };
}

function handleToolsList(id: string | number): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      tools: TOOL_DEFINITIONS,
    },
  };
}

async function handleToolsCall(
  id: string | number,
  params: Record<string, unknown> | undefined
): Promise<JsonRpcResponse> {
  if (!params || typeof params !== 'object') {
    return makeError(id, RPC_ERRORS.INVALID_PARAMS, 'params is required for tools/call');
  }

  const { name, arguments: toolArgs } = params as unknown as McpToolCallParams;

  if (!name || typeof name !== 'string') {
    return makeError(id, RPC_ERRORS.INVALID_PARAMS, 'params.name is required (string)');
  }

  const toolDef = TOOL_DEFINITIONS.find((t) => t.name === name);
  if (!toolDef) {
    return makeError(
      id,
      RPC_ERRORS.INVALID_PARAMS,
      `Unknown tool: "${name}". Available tools: ${TOOL_DEFINITIONS.map((t) => t.name).join(', ')}`
    );
  }

  const args = (toolArgs ?? {}) as Record<string, unknown>;
  const requiredParams = toolDef.inputSchema.required ?? [];
  for (const req of requiredParams) {
    if (args[req] === undefined || args[req] === null) {
      return makeError(
        id,
        RPC_ERRORS.INVALID_PARAMS,
        `Missing required argument: "${req}" for tool "${name}"`
      );
    }
  }

  const result = await executeTool(name, args);

  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

function makeError(
  id: string | number,
  error: { code: number; message: string },
  detail?: string
): JsonRpcResponse {
  const rpcError: JsonRpcError = {
    code: error.code,
    message: error.message,
    ...(detail ? { data: detail } : {}),
  };

  return { jsonrpc: '2.0', id, error: rpcError };
}
