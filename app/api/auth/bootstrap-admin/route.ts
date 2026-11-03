import { createAuthUser, createSession, getDb, readWorkspace, saveWorkspace, updateAuthEmail, updateAuthPassword } from '@/lib/server/db'
import { clearLoginFailures, hashPassword, loginThrottled, passwordProblem, recordLoginFailure, setSessionCookie } from '@/lib/server/auth'
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

function getAdminSetupMode() {
  const stored = readWorkspace()
  if (!stored) return null
  const workspaceAdmins = stored.data.users.filter(user => user.role === 'super_admin')
  const authAdmins = getDb().prepare('SELECT id FROM auth_users WHERE role = ?').all('super_admin') as Array<{ id: string }>
  if (workspaceAdmins.length === 0 && authAdmins.length === 0) return 'create' as const
  const managerHasSignedIn = workspaceAdmins.length === 1 && stored.data.auditLogs.some(
    entry => entry.actorId === workspaceAdmins[0].id && entry.action === 'login',
  )
  if (
    workspaceAdmins.length === 1 &&
    authAdmins.length === 1 &&
    workspaceAdmins[0].id === authAdmins[0].id &&
    !managerHasSignedIn
  ) return 'recover' as const
  return null
}

export async function GET() {
  const stored = readWorkspace()
  const mode = getAdminSetupMode()
  return Response.json(
    { ok: true, allowed: Boolean(stored) && mode !== null, mode },
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
    const workspaceAdmins = stored.data.users.filter(user => user.role === 'super_admin')
    const authAdmins = db.prepare('SELECT id FROM auth_users WHERE role = ?').all('super_admin') as Array<{ id: string }>
    const existingAdmin = workspaceAdmins.length === 1 ? workspaceAdmins[0] : undefined
    const managerHasSignedIn = Boolean(existingAdmin && stored.data.auditLogs.some(
      entry => entry.actorId === existingAdmin.id && entry.action === 'login',
    ))
    const isCreate = workspaceAdmins.length === 0 && authAdmins.length === 0
    const isRecover = Boolean(
      existingAdmin && authAdmins.length === 1 && authAdmins[0].id === existingAdmin.id && !managerHasSignedIn,
    )
    if (!isCreate && !isRecover) {
      db.exec('ROLLBACK')
      return fail(409, 'manager_account_exists')
    }
    const emailOwner = db.prepare('SELECT id FROM auth_users WHERE email = ? COLLATE NOCASE').get(email) as { id: string } | undefined
    if (emailOwner && emailOwner.id !== existingAdmin?.id) {
      db.exec('ROLLBACK')
      return fail(409, 'email_taken')
    }

    const now = nowIso()
    const id = existingAdmin?.id || newId('usr')
    const user: User = existingAdmin
      ? { ...existingAdmin, nameAr, nameEn, email, phone: body?.phone?.trim() || '', status: 'active', lastLogin: now }
      : {
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
          lastLogin: now,
        }
    const updatedUsers = isRecover
      ? stored.data.users.map(entry => entry.id === id ? user : entry)
      : [...stored.data.users, user]
    const setupAudit = addAudit(
      { ...stored.data, users: updatedUsers },
      { userId: id, nameAr, nameEn },
      isRecover ? 'initial_admin_credentials_confirmed' : 'initial_admin_created',
      'user',
      id,
      `${isRecover ? 'Initial administrator credentials confirmed' : 'Initial administrator account created'} for ${email}`,
    )
    const data = addAudit(
      setupAudit,
      { userId: id, nameAr, nameEn },
      'login',
      'user',
      id,
      'Administrator signed in after initial credential setup',
    )

    if (isRecover) {
      updateAuthEmail(id, email)
      updateAuthPassword(id, hashPassword(password))
    } else {
      createAuthUser({ id, email, passwordHash: hashPassword(password), role: 'super_admin' })
    }
    const saved = saveWorkspace(data)
    db.exec('COMMIT')

    const session = createSession(id)
    await setSessionCookie(session.token)
    clearLoginFailures(throttleKey)
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
