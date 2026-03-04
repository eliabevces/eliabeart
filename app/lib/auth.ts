import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import { config } from "./config";

let jwksCache: jose.JSONWebKeySet | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600_000; // 1 hour

async function getJWKS(): Promise<jose.JSONWebKeySet> {
  if (jwksCache && Date.now() - jwksCacheTime < JWKS_CACHE_TTL) {
    return jwksCache;
  }

  const url = `${config.KEYCLOAK_SERVER_URL}/realms/${config.KEYCLOAK_REALM_NAME}/protocol/openid-connect/certs`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  jwksCache = await response.json();
  jwksCacheTime = Date.now();
  return jwksCache!;
}

/**
 * Validates the Bearer token from the request using Keycloak's JWKS.
 * Returns the decoded payload if valid, or null.
 */
export async function validateToken(
  request: NextRequest
): Promise<jose.JWTPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const audience = config.KEYCLOAK_CLIENT_ID;
    if (!audience) {
      throw new Error("KEYCLOAK_CLIENT_ID is not configured");
    }

    const jwks = await getJWKS();
    const keySet = jose.createLocalJWKSet(jwks);

    const { payload } = await jose.jwtVerify(token, keySet, {
      issuer: `${config.KEYCLOAK_SERVER_URL}/realms/${config.KEYCLOAK_REALM_NAME}`,
      audience,
    });

    return payload;
  } catch {
    return null;
  }
}

/**
 * Helper to return 401 if the token is invalid, used in protected API routes.
 */
export async function requireAuth(
  request: NextRequest
): Promise<jose.JWTPayload | NextResponse> {
  const payload = await validateToken(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return payload;
}
