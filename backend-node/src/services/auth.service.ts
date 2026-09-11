import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// In-memory token store: token -> {user_id, email, name, created_at}
const ACTIVE_SESSIONS: Record<string, any> = {};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}$${key}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, keyHex] = storedHash.split('$');
    if (!salt || !keyHex) return false;
    const computedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    // Use timingSafeEqual to compare
    const a = Buffer.from(computedKey, 'hex');
    const b = Buffer.from(keyHex, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

export function createSession(userId: string, email: string, name: string): string {
  const token = `tw-${crypto.randomBytes(24).toString('base64url')}`;
  ACTIVE_SESSIONS[token] = {
    user_id: userId,
    email,
    name,
    created_at: Date.now()
  };
  return token;
}

export function getSession(token: string | null | undefined): any {
  if (!token) return null;
  const cleanToken = token.replace('Bearer ', '').trim();

  if (ACTIVE_SESSIONS[cleanToken]) {
    return ACTIVE_SESSIONS[cleanToken];
  }

  try {
    if (!env.SUPABASE_JWT_SECRET) return null;
    const decoded = jwt.verify(cleanToken, env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'], audience: 'authenticated' }) as any;
    const userId = decoded.sub || decoded.user_id || "supa-user";
    const email = decoded.email || "analyst@thermaltrace.org";
    const name = decoded.user_metadata?.name || email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);

    return {
      user_id: userId,
      email: email,
      name: name,
      role: decoded.role || "authenticated"
    };
  } catch (e) {
    return null;
  }
}

export function revokeSession(token: string | null | undefined): boolean {
  if (!token) return false;
  const cleanToken = token.replace('Bearer ', '').trim();
  if (ACTIVE_SESSIONS[cleanToken]) {
    delete ACTIVE_SESSIONS[cleanToken];
    return true;
  }
  return false;
}
