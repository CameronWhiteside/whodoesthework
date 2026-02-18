// src/mcp/auth.ts

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates the Bearer token against the API_SECRET_KEY environment secret.
 *
 * Set the secret with:  npx wrangler secret put API_SECRET_KEY
 * Clients include:      Authorization: Bearer <secret>
 *
 * Uses constant-time comparison (HMAC-based) to prevent timing-oracle attacks.
 */
export async function authenticate(request: Request, apiSecretKey: string): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, error: 'Missing or invalid Authorization header. Expected: Bearer <token>' };
  }

  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false, error: 'Empty token' };

  const valid = await timingSafeEqual(token, apiSecretKey);
  if (!valid) return { ok: false, error: 'Invalid token' };

  return { ok: true };
}

/**
 * Constant-time string comparison using HMAC-SHA-256.
 * Both inputs are signed with the same message; equal inputs produce equal signatures.
 * Comparing the fixed-length HMAC outputs with XOR prevents timing attacks even if
 * the input lengths differ (the HMAC outputs are always 32 bytes).
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const aKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(a),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(b),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const msg = enc.encode('compare');
  const [aSig, bSig] = await Promise.all([
    crypto.subtle.sign('HMAC', aKey, msg),
    crypto.subtle.sign('HMAC', bKey, msg),
  ]);
  const aArr = new Uint8Array(aSig);
  const bArr = new Uint8Array(bSig);
  if (aArr.length !== bArr.length) return false;
  let diff = 0;
  for (let i = 0; i < aArr.length; i++) diff |= (aArr[i] ?? 0) ^ (bArr[i] ?? 0);
  return diff === 0;
}

export function unauthorizedResponse(error = 'Invalid token'): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized', message: error }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  );
}
