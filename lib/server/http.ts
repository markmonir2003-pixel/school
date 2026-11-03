import { NextResponse } from 'next/server'
import { getAuthContext, type AuthContext } from './auth'
import { readWorkspace, type StoredWorkspace } from './db'
import type { User } from '@/lib/school/types'

export const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
}

export function ok(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...NO_STORE, ...(init?.headers ?? {}) },
  })
}

export function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: NO_STORE })
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

export interface RequestContext {
  auth: AuthContext
  stored: StoredWorkspace
  user: User
}

/** Loads the session, workspace and matching workspace user in one step. */
export async function loadContext(): Promise<RequestContext | null> {
  const auth = await getAuthContext()
  if (!auth) return null
  const stored = readWorkspace()
  if (!stored) return null
  const user = stored.data.users.find(entry => entry.id === auth.auth.id)
  if (!user || user.status !== 'active') return null
  return { auth, stored, user }
}

export function requireAdmin(context: RequestContext): boolean {
  return context.auth.role === 'super_admin'
}
