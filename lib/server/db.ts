import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { SchoolData } from '@/lib/school/types'
import { WORKSPACE_VERSION } from '@/lib/school/empty'

/**
 * The real persistent database for St. George School Digital Campus.
 * It is a local SQLite file with WAL journal mode, transactions, and foreign keys.
 */
const DB_PATH = process.env.SCHOOL_DB_PATH?.trim() || join(process.cwd(), 'data', 'school.db')

type GlobalWithDb = typeof globalThis & { __stGeorgeSchoolDb?: DatabaseSync }

function openDatabase(): DatabaseSync {
  mkdirSync(dirname(DB_PATH), { recursive: true })
  const db = new DatabaseSync(DB_PATH)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS workspace (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      rev INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parent_child_links (
      id TEXT PRIMARY KEY,
      parent_user_id TEXT NOT NULL,
      student_user_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL DEFAULT 'guardian',
      status TEXT NOT NULL DEFAULT 'pending',
      created_by TEXT NOT NULL,
      approved_by TEXT,
      created_at TEXT NOT NULL,
      approved_at TEXT,
      revoked_at TEXT,
      notes TEXT,
      UNIQUE(parent_user_id, student_user_id)
    );

    CREATE TABLE IF NOT EXISTS qr_link_tokens (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      student_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      revoked_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      scan_attempts INTEGER NOT NULL DEFAULT 0,
      last_scan_at TEXT
    );

    CREATE TABLE IF NOT EXISTS login_audit (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT,
      role TEXT,
      action TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      at TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 0,
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_parent_child_parent ON parent_child_links(parent_user_id);
    CREATE INDEX IF NOT EXISTS idx_parent_child_student ON parent_child_links(student_user_id);
    CREATE INDEX IF NOT EXISTS idx_qr_token_hash ON qr_link_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_qr_student ON qr_link_tokens(student_user_id);

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON password_resets(token);
  `)
  return db
}

export function getDb(): DatabaseSync {
  const globalRef = globalThis as GlobalWithDb
  if (!globalRef.__stGeorgeSchoolDb) {
    globalRef.__stGeorgeSchoolDb = openDatabase()
  }
  return globalRef.__stGeorgeSchoolDb
}

export interface StoredWorkspace {
  data: SchoolData
  rev: number
  updatedAt: string
}

export function readWorkspace(): StoredWorkspace | null {
  const row = getDb().prepare('SELECT data, rev, updated_at FROM workspace WHERE id = 1').get() as
    | { data: string; rev: number; updated_at: string }
    | undefined
  if (!row) return null
  try {
    const data = JSON.parse(row.data) as SchoolData
    if (!data || !Array.isArray(data.users) || !Array.isArray(data.students)) return null
    return { data, rev: Number(row.rev) || 0, updatedAt: String(row.updated_at) }
  } catch {
    return null
  }
}

/** Insert the very first workspace (first-run setup). */
export function createWorkspace(data: SchoolData): StoredWorkspace {
  const now = new Date().toISOString()
  getDb()
    .prepare('INSERT INTO workspace (id, data, rev, updated_at) VALUES (1, ?, 1, ?)')
    .run(JSON.stringify({ ...data, version: WORKSPACE_VERSION }), now)
  return { data, rev: 1, updatedAt: now }
}

/** Replace the workspace document and increment the change counter. */
export function saveWorkspace(data: SchoolData): StoredWorkspace {
  const now = new Date().toISOString()
  const db = getDb()
  db.prepare('UPDATE workspace SET data = ?, rev = rev + 1, updated_at = ? WHERE id = 1')
    .run(JSON.stringify({ ...data, version: WORKSPACE_VERSION }), now)
  const row = db.prepare('SELECT data, rev, updated_at FROM workspace WHERE id = 1').get() as {
    data: string
    rev: number
    updated_at: string
  }
  return { data: JSON.parse(row.data) as SchoolData, rev: Number(row.rev), updatedAt: String(row.updated_at) }
}

/** Atomically read-modify-write the workspace using a SQLite transaction. */
export function mutateWorkspace<T>(mutator: (current: SchoolData) => { data: SchoolData; result: T }): { workspace: StoredWorkspace; result: T } {
  const db = getDb()
  db.exec('BEGIN IMMEDIATE')
  try {
    const stored = readWorkspace()
    if (!stored) throw new Error('workspace_missing')
    const { data, result } = mutator(stored.data)
    const saved = saveWorkspace(data)
    db.exec('COMMIT')
    return { workspace: saved, result }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export interface AuthRow {
  id: string
  email: string
  password_hash: string
  role: string
  status: string
  created_at: string
}

export function getAuthByEmail(email: string): AuthRow | undefined {
  return getDb()
    .prepare('SELECT id, email, password_hash, role, status, created_at FROM auth_users WHERE email = ? COLLATE NOCASE')
    .get(email.trim()) as AuthRow | undefined
}

export function getAuthById(id: string): AuthRow | undefined {
  return getDb()
    .prepare('SELECT id, email, password_hash, role, status, created_at FROM auth_users WHERE id = ?')
    .get(id) as AuthRow | undefined
}

export function listAuthUserIds(): Set<string> {
  const rows = getDb().prepare('SELECT id FROM auth_users').all() as Array<{ id: string }>
  return new Set(rows.map(row => row.id))
}

export function createAuthUser(input: { id: string; email: string; passwordHash: string; role: string; status?: 'active' | 'inactive' }): void {
  getDb()
    .prepare('INSERT INTO auth_users (id, email, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(input.id, input.email.trim(), input.passwordHash, input.role, input.status ?? 'active', new Date().toISOString())
}

export function updateAuthPassword(id: string, passwordHash: string): void {
  getDb().prepare('UPDATE auth_users SET password_hash = ? WHERE id = ?').run(passwordHash, id)
}

export function updateAuthEmail(id: string, email: string): void {
  getDb().prepare('UPDATE auth_users SET email = ? WHERE id = ?').run(email.trim(), id)
}

export function updateAuthStatus(id: string, status: 'active' | 'inactive'): void {
  getDb().prepare('UPDATE auth_users SET status = ? WHERE id = ?').run(status, id)
}

export function deleteAuthUser(id: string): void {
  getDb().prepare('DELETE FROM auth_users WHERE id = ?').run(id)
}

export interface SessionRow {
  token: string
  user_id: string
  created_at: string
  expires_at: string
}

export function createSession(userId: string, ttlDays = 30): SessionRow {
  const now = new Date()
  const expires = new Date(now.getTime() + ttlDays * 86400000)
  const token = globalThis.crypto.randomUUID().replace(/-/g, '') + globalThis.crypto.randomUUID().replace(/-/g, '')
  const row: SessionRow = {
    token,
    user_id: userId,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
  }
  getDb()
    .prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(row.token, row.user_id, row.created_at, row.expires_at)
  return row
}

export function readSession(token: string | undefined): SessionRow | undefined {
  if (!token) return undefined
  const row = getDb()
  .prepare('SELECT token, user_id, created_at, expires_at FROM sessions WHERE token = ?')
    .get(token) as SessionRow | undefined
  if (!row) return undefined
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    deleteSession(token)
    return undefined
  }
  return row
}

export function deleteSession(token: string | undefined): void {
  if (!token) return
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function deleteUserSessions(userId: string, exceptToken?: string): void {
  if (exceptToken) {
    getDb().prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?').run(userId, exceptToken)
    return
  }
  getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

export function pruneExpiredSessions(): void {
  getDb().prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString())
}

export interface PasswordResetRow {
  id: string
  user_id: string
  token: string
  expires_at: string
  used: number
  created_at: string
}

export function createPasswordReset(userId: string): PasswordResetRow {
  const id = `pwr-${globalThis.crypto.randomUUID()}`
  const token = globalThis.crypto.randomUUID().replace(/-/g, '')
  const now = new Date()
  const expires = new Date(now.getTime() + 2 * 3600000) // 2 hours
  const row: PasswordResetRow = {
    id,
    user_id: userId,
    token,
    expires_at: expires.toISOString(),
    used: 0,
    created_at: now.toISOString(),
  }
  getDb()
    .prepare('INSERT INTO password_resets (id, user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(row.id, row.user_id, row.token, row.expires_at, 0, row.created_at)
  return row
}

export function getPasswordResetByToken(token: string): PasswordResetRow | undefined {
  const row = getDb()
    .prepare('SELECT id, user_id, token, expires_at, used, created_at FROM password_resets WHERE token = ? AND used = 0')
    .get(token) as PasswordResetRow | undefined
  if (!row) return undefined
  if (new Date(row.expires_at).getTime() <= Date.now()) return undefined
  return row
}

export function markPasswordResetUsed(id: string): void {
  getDb().prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(id)
}
