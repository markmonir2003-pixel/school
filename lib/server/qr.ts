/**
 * QR Parent-Child Linking System
 * St. George School Digital Campus
 *
 * Secure, cryptographic QR tokens for parent-child account linking.
 * Tokens are hashed before storage. Raw token is only revealed once.
 */

import { createHash, randomBytes } from 'node:crypto'
import { getDb } from './db'

export interface QrTokenRow {
  id: string
  token_hash: string
  student_user_id: string
  created_at: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  status: 'active' | 'used' | 'revoked' | 'expired'
  scan_attempts: number
  last_scan_at: string | null
}

export interface ParentChildLinkRow {
  id: string
  parent_user_id: string
  student_user_id: string
  relationship_type: string
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
  created_by: string
  approved_by: string | null
  created_at: string
  approved_at: string | null
  revoked_at: string | null
  notes: string | null
}

/** Generate a new QR link token for a student. Returns the raw token (shown once). */
export function createQrToken(studentUserId: string, ttlHours = 24): { rawToken: string; row: QrTokenRow } {
  // Revoke any existing active tokens for this student
  revokeStudentQrTokens(studentUserId)

  const rawToken = randomBytes(32).toString('hex') // 64-char hex
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const now = new Date()
  const expires = new Date(now.getTime() + ttlHours * 3600000)

  const row: QrTokenRow = {
    id: `qrt-${randomBytes(8).toString('hex')}`,
    token_hash: tokenHash,
    student_user_id: studentUserId,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
    used_at: null,
    revoked_at: null,
    status: 'active',
    scan_attempts: 0,
    last_scan_at: null,
  }

  getDb()
    .prepare(`
      INSERT INTO qr_link_tokens
        (id, token_hash, student_user_id, created_at, expires_at, used_at, revoked_at, status, scan_attempts, last_scan_at)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, 'active', 0, NULL)
    `)
    .run(row.id, row.token_hash, row.student_user_id, row.created_at, row.expires_at)

  return { rawToken, row }
}

export function getQrTokenByHash(rawToken: string): QrTokenRow | undefined {
  if (!/^[a-f0-9]{64}$/i.test(rawToken)) return undefined
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')

  // Increment scan attempt
  getDb()
    .prepare(`UPDATE qr_link_tokens SET scan_attempts = scan_attempts + 1, last_scan_at = ? WHERE token_hash = ? AND scan_attempts < 10`)
    .run(new Date().toISOString(), tokenHash)

  const row = getDb()
    .prepare(`SELECT * FROM qr_link_tokens WHERE token_hash = ?`)
    .get(tokenHash) as QrTokenRow | undefined

  if (!row || row.status !== 'active' || row.scan_attempts >= 10) return undefined

  // Check expiry
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    getDb()
      .prepare(`UPDATE qr_link_tokens SET status = 'expired' WHERE id = ?`)
      .run(row.id)
    return undefined
  }

  return row
}

export function markQrTokenUsed(id: string): void {
  getDb()
    .prepare(`UPDATE qr_link_tokens SET status = 'used', used_at = ? WHERE id = ? AND status = 'active' AND expires_at > ?`)
    .run(new Date().toISOString(), id, new Date().toISOString())
}

export function revokeStudentQrTokens(studentUserId: string): void {
  getDb()
    .prepare(`UPDATE qr_link_tokens SET status = 'revoked', revoked_at = ? WHERE student_user_id = ? AND status = 'active'`)
    .run(new Date().toISOString(), studentUserId)
}

export function getStudentActiveQrToken(studentUserId: string): QrTokenRow | undefined {
  const row = getDb()
    .prepare(`SELECT * FROM qr_link_tokens WHERE student_user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`)
    .get(studentUserId) as QrTokenRow | undefined

  if (!row) return undefined
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    getDb()
      .prepare(`UPDATE qr_link_tokens SET status = 'expired' WHERE id = ?`)
      .run(row.id)
    return undefined
  }
  return row
}

// ── Parent-Child Links ───────────────────────────────────────────────────────

export function createParentChildLink(input: {
  parentUserId: string
  studentUserId: string
  relationshipType: string
  createdBy: string
  status?: 'pending' | 'approved'
  notes?: string
}): ParentChildLinkRow {
  const id = `pcl-${randomBytes(8).toString('hex')}`
  const now = new Date().toISOString()
  const status = input.status ?? 'pending'

  getDb()
    .prepare(`
      INSERT INTO parent_child_links
        (id, parent_user_id, student_user_id, relationship_type, status, created_by, approved_by, created_at, approved_at, revoked_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?)
      ON CONFLICT(parent_user_id, student_user_id) DO UPDATE SET
        id = excluded.id,
        relationship_type = excluded.relationship_type,
        status = excluded.status,
        created_by = excluded.created_by,
        approved_by = NULL,
        created_at = excluded.created_at,
        approved_at = NULL,
        revoked_at = NULL,
        notes = excluded.notes
      WHERE parent_child_links.status = 'revoked'
    `)
    .run(id, input.parentUserId, input.studentUserId, input.relationshipType, status, input.createdBy, now, input.notes ?? null)

  return {
    id,
    parent_user_id: input.parentUserId,
    student_user_id: input.studentUserId,
    relationship_type: input.relationshipType,
    status,
    created_by: input.createdBy,
    approved_by: null,
    created_at: now,
    approved_at: null,
    revoked_at: null,
    notes: input.notes ?? null,
  }
}

export function getParentChildLinks(parentUserId?: string, studentUserId?: string): ParentChildLinkRow[] {
  let query = 'SELECT * FROM parent_child_links WHERE 1=1'
  const params: string[] = []
  if (parentUserId) { query += ' AND parent_user_id = ?'; params.push(parentUserId) }
  if (studentUserId) { query += ' AND student_user_id = ?'; params.push(studentUserId) }
  query += ' ORDER BY created_at DESC'
  return getDb().prepare(query).all(...params) as unknown as ParentChildLinkRow[]
}

export function approveParentChildLink(linkId: string, approvedBy: string): void {
  getDb()
    .prepare(`UPDATE parent_child_links SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ? AND status = 'pending'`)
    .run(approvedBy, new Date().toISOString(), linkId)
}

export function revokeParentChildLink(linkId: string): void {
  getDb()
    .prepare(`UPDATE parent_child_links SET status = 'revoked', revoked_at = ? WHERE id = ? AND status IN ('pending', 'approved')`)
    .run(new Date().toISOString(), linkId)
}

export function rejectParentChildLink(linkId: string, rejectedBy: string): void {
  getDb()
    .prepare(`UPDATE parent_child_links SET status = 'rejected', approved_by = ? WHERE id = ? AND status = 'pending'`)
    .run(rejectedBy, linkId)
}

export function existingLink(parentUserId: string, studentUserId: string): ParentChildLinkRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM parent_child_links WHERE parent_user_id = ? AND student_user_id = ? AND status != 'revoked'`)
    .get(parentUserId, studentUserId) as ParentChildLinkRow | undefined
}

/** Log a security event to the login_audit table */
export function logLoginAudit(input: {
  userId?: string
  email?: string
  role?: string
  action: string
  success: boolean
  details?: string
  ip?: string
  userAgent?: string
}): void {
  const id = `la-${randomBytes(8).toString('hex')}`
  getDb()
    .prepare(`
      INSERT INTO login_audit (id, user_id, email, role, action, ip, user_agent, at, success, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.userId ?? null,
      input.email ?? null,
      input.role ?? null,
      input.action,
      input.ip ?? null,
      input.userAgent ?? null,
      new Date().toISOString(),
      input.success ? 1 : 0,
      input.details ?? null,
    )
}
