const agentIdPattern = /^[A-Za-z0-9._:/-]{1,120}$/;

export class CachebarCapabilityAuthError extends Error {}

export function authorizeCachebarAgent({
  authorization,
  agentId,
  tokensJson,
}: {
  authorization: string | null;
  agentId: string | null;
  tokensJson: string | undefined;
}) {
  if (!agentId || !agentIdPattern.test(agentId)) {
    throw new CachebarCapabilityAuthError("A valid X-Cache-Agent-Id header is required.");
  }
  const bearer = readBearerToken(authorization);
  const configuredTokens = readConfiguredTokens(tokensJson);
  const expected = configuredTokens[agentId];
  if (!expected || !constantTimeEqual(expected, bearer)) {
    throw new CachebarCapabilityAuthError("Invalid .cache capability credentials.");
  }
  return agentId;
}

export function hasConfiguredCachebarAgents(tokensJson: string | undefined) {
  try {
    return Object.keys(readConfiguredTokens(tokensJson)).length > 0;
  } catch {
    return false;
  }
}

function readBearerToken(authorization: string | null) {
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) {
    throw new CachebarCapabilityAuthError("A bearer token is required.");
  }
  return match[1];
}

function readConfiguredTokens(tokensJson: string | undefined): Record<string, string> {
  if (!tokensJson) {
    throw new CachebarCapabilityAuthError(".cache capability credentials are not configured.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(tokensJson);
  } catch {
    throw new CachebarCapabilityAuthError("CACHEBAR_CAPABILITY_API_TOKENS is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CachebarCapabilityAuthError("CACHEBAR_CAPABILITY_API_TOKENS must be an object.");
  }
  const tokens: Record<string, string> = {};
  for (const [configuredAgentId, token] of Object.entries(parsed)) {
    if (
      !agentIdPattern.test(configuredAgentId) ||
      typeof token !== "string" ||
      token.length < 24
    ) {
      throw new CachebarCapabilityAuthError(
        "Each .cache capability token needs a valid agent id and at least 24 characters.",
      );
    }
    tokens[configuredAgentId] = token;
  }
  return tokens;
}

function constantTimeEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}
