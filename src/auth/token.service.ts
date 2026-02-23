import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'dev-insecure-change-me';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface TokenPayload {
  sub: string;
  exp: number;
}

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
}

export function issueAccessToken(userId: string): string {
  const payload: TokenPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };

  const payloadPart = b64url(JSON.stringify(payload));
  const signaturePart = sign(payloadPart);
  return `${payloadPart}.${signaturePart}`;
}

export function verifyAccessToken(token: string): string | null {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;

  const expected = sign(payloadPart);
  const a = Buffer.from(signaturePart);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload?.sub || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
