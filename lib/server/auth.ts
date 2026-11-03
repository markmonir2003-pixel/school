import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { Role } from '@/lib/school/types'
import {
  getAuthById,
  readSession,
  type AuthRow,
  type SessionRow,
} from './db'

export const SESSION_COOKIE = 'ss360_session'
const SESSION_TTL_DAYS = 30

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

export async function readSessionCookie(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export interface AuthContext {
  auth: AuthRow
  session: SessionRow
  token: string
  role: Role
}

/**
 * Reads and validates the current session. The workspace user is checked by the
 * caller so a deleted/inactive workspace member cannot keep using an old session.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const token = await readSessionCookie()
  const session = readSession(token)
  if (!session || !token) return null
  const auth = getAuthById(session.user_id)
  if (!auth || auth.status !== 'active') return null
  return { auth, session, token, role: auth.role as Role }
}

/** Small in-memory throttle for failed password attempts. */
const failedAttempts = new Map<string, { count: number; firstAt: number }>()
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 12

export function loginThrottled(key: string): boolean {
  const entry = failedAttempts.get(key)
  if (!entry) return false
  if (Date.now() - entry.firstAt > ATTEMPT_WINDOW_MS) {
    failedAttempts.delete(key)
    return false
  }
  return entry.count >= MAX_ATTEMPTS
}

export function recordLoginFailure(key: string): void {
  const now = Date.now()
  const entry = failedAttempts.get(key)
  if (!entry || now - entry.firstAt > ATTEMPT_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, firstAt: now })
    return
  }
  entry.count += 1
}

export function clearLoginFailures(key: string): void {
  failedAttempts.delete(key)
}

export const PASSWORD_MIN_LENGTH = 8

export function passwordProblem(password: string): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) return 'weak_password'
  if (!/[A-Za-z\u0600-\u06FF]/.test(password)) return 'weak_password'
  if (!/[0-9]/.test(password)) return 'weak_password'
  return null
}

export function emptyBodyResult<T extends Record<string, unknown>>(body: T, required: Array<keyof T>): string | null {
  for (const key of required) {
    const value = body[key]
    if (typeof value === 'string' && !value.trim()) return `missing_${String(key)}`
  }
  return null
}
