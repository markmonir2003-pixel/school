import {
  clearLoginFailures,
  loginThrottled,
  recordLoginFailure,
  setSessionCookie,
  verifyPassword,
} from '@/lib/server/auth'
import { createSession, getAuthByEmail, mutateWorkspace, readWorkspace } from '@/lib/server/db'
import { addAudit } from '@/lib/server/domain'
import { fail, ok, readJson } from '@/lib/server/http'
import { scopeWorkspace } from '@/lib/server/scope'
import { homePageFor } from '@/lib/school/engine'

export const dynamic = 'force-dynamic'

interface LoginBody {
  email?: string
  password?: string
  role?: string
}

export async function POST(request: Request) {
  const stored = readWorkspace()
  if (!stored) return fail(409, 'setup_required')

  const body = await readJson<LoginBody>(request)
  const email = body?.email?.trim() ?? ''
  const password = body?.password ?? ''
  const role = body?.role ?? ''
  if (!email || !password || !role) return fail(400, 'missing_credentials')
  if (!['student', 'parent', 'teacher', 'super_admin'].includes(role)) return fail(400, 'invalid_role')

  const throttleKey = email.toLowerCase()
  if (loginThrottled(throttleKey)) return fail(429, 'too_many_attempts')

  const auth = getAuthByEmail(email)
  if (!auth || !verifyPassword(password, auth.password_hash)) {
    recordLoginFailure(throttleKey)
    return fail(401, 'invalid_credentials')
  }
  if (auth.role !== role) return fail(403, 'role_mismatch')
  if (auth.status !== 'active') return fail(403, 'account_inactive')

  const user = stored.data.users.find(entry => entry.id === auth.id)
  if (!user) return fail(403, 'account_not_linked')
  if (user.role !== auth.role) return fail(403, 'role_mismatch')
  if (user.status !== 'active') return fail(403, 'account_inactive')

  const { workspace } = mutateWorkspace(current => {
    const loginUser = current.users.find(entry => entry.id === auth.id)
    if (!loginUser) throw new Error('account_not_linked')
    const withLogin = {
      ...current,
      users: current.users.map(entry => entry.id === auth.id ? { ...entry, lastLogin: new Date().toISOString() } : entry),
    }
    const data = addAudit(withLogin, { userId: loginUser.id, nameAr: loginUser.nameAr, nameEn: loginUser.nameEn }, 'login', 'user', loginUser.id)
    return { data, result: true }
  })

  const session = createSession(auth.id)
  await setSessionCookie(session.token)
  clearLoginFailures(throttleKey)

  const verifiedRole = auth.role as 'super_admin' | 'school_admin' | 'teacher' | 'parent' | 'student'
  const freshUser = workspace.data.users.find(entry => entry.id === auth.id)
  if (!freshUser) return fail(500, 'account_not_linked')

  return ok({
    ok: true,
    user: freshUser,
    workspace: scopeWorkspace(workspace.data, { userId: freshUser.id, role: verifiedRole }),
    rev: workspace.rev,
    home: homePageFor(verifiedRole),
  })
}
