import { createAuthUser, createSession, getDb, readWorkspace, saveWorkspace } from '@/lib/server/db'
import { hashPassword, loginThrottled, passwordProblem, recordLoginFailure, setSessionCookie } from '@/lib/server/auth'
import { addAudit, isValidEmail, newId, nowIso } from '@/lib/server/domain'
import { fail, ok, readJson, NO_STORE } from '@/lib/server/http'
import { scopeWorkspace } from '@/lib/server/scope'
import type { User } from '@/lib/school/types'

export const dynamic = 'force-dynamic'

interface BootstrapAdminBody {
  nameAr?: string
  nameEn?: string
  email?: string
  phone?: string
  password?: string
}

function canCreateFirstAdmin() {
  const stored = readWorkspace()
  if (!stored) return false
  const workspaceHasAdmin = stored.data.users.some(user => user.role === 'super_admin')
  const authHasAdmin = Boolean(getDb().prepare('SELECT id FROM auth_users WHERE role = ? LIMIT 1').get('super_admin'))
  return !workspaceHasAdmin && !authHasAdmin
}

export async function GET() {
  const stored = readWorkspace()
  return Response.json(
    { ok: true, allowed: Boolean(stored) && canCreateFirstAdmin() },
    { headers: NO_STORE },
  )
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const throttleKey = `initial-admin:${ip}`
  if (loginThrottled(throttleKey)) return fail(429, 'too_many_attempts')
  recordLoginFailure(throttleKey)

  const body = await readJson<BootstrapAdminBody>(request)
  const nameEn = body?.nameEn?.trim() || ''
  const nameAr = body?.nameAr?.trim() || nameEn
  const email = body?.email?.trim().toLowerCase() || ''
  const password = body?.password || ''
  if (!nameEn || !isValidEmail(email) || !password) return fail(400, 'missing_registration_fields')
  const weak = passwordProblem(password)
  if (weak) return fail(400, weak)

  const db = getDb()
  db.exec('BEGIN IMMEDIATE')
  try {
    const stored = readWorkspace()
    if (!stored) {
      db.exec('ROLLBACK')
      return fail(409, 'setup_required')
    }
    const workspaceHasAdmin = stored.data.users.some(user => user.role === 'super_admin')
    const authHasAdmin = Boolean(db.prepare('SELECT id FROM auth_users WHERE role = ? LIMIT 1').get('super_admin'))
    if (workspaceHasAdmin || authHasAdmin) {
      db.exec('ROLLBACK')
      return fail(409, 'manager_account_exists')
    }
    if (db.prepare('SELECT id FROM auth_users WHERE email = ? COLLATE NOCASE').get(email)) {
      db.exec('ROLLBACK')
      return fail(409, 'email_taken')
    }

    const id = newId('usr')
    const now = nowIso()
    const user: User = {
      id,
      nameAr,
      nameEn,
      email,
      phone: body?.phone?.trim() || '',
      role: 'super_admin',
      status: 'active',
      avatarColor: 'from-[#0f1f3d] to-[#c5a059]',
      title: 'Super Administrator',
      createdAt: now,
    }
    const data = addAudit(
      { ...stored.data, users: [...stored.data.users, user] },
      { userId: id, nameAr, nameEn },
      'initial_admin_created',
      'user',
      id,
      `Initial school administrator account created for ${email}`,
    )

    createAuthUser({ id, email, passwordHash: hashPassword(password), role: 'super_admin' })
    const saved = saveWorkspace(data)
    db.exec('COMMIT')

    const session = createSession(id)
    await setSessionCookie(session.token)
    return ok({
      ok: true,
      user,
      workspace: scopeWorkspace(data, { userId: id, role: 'super_admin' }),
      rev: saved.rev,
      home: 'admin-dashboard',
    }, { status: 201 })
  } catch (error) {
    try { db.exec('ROLLBACK') } catch { /* transaction already ended */ }
    console.error('initial admin setup failed', error)
    return fail(400, 'initial_admin_setup_failed')
  }
}
