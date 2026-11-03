import { clearSessionCookie, getAuthContext } from '@/lib/server/auth'
import { deleteSession, readWorkspace } from '@/lib/server/db'
import { ok, NO_STORE, databaseUnavailable } from '@/lib/server/http'
import { scopeWorkspace } from '@/lib/server/scope'
import { homePageFor } from '@/lib/school/engine'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  let stored
  try { stored = readWorkspace() } catch (error) { return databaseUnavailable(error, '/api/auth/session') }
  if (!stored) {
    return NextResponse.json(
      { ok: true, setupRequired: true, authenticated: false, user: null, workspace: null, rev: 0, home: null },
      { headers: NO_STORE },
    )
  }

  const auth = await getAuthContext()
  if (!auth) {
    return NextResponse.json(
      {
        ok: true,
        setupRequired: false,
        authenticated: false,
        user: null,
        workspace: null,
        rev: stored.rev,
        school: {
          nameAr: stored.data.settings.schoolNameAr,
          nameEn: stored.data.settings.schoolNameEn,
        },
        home: null,
      },
      { headers: NO_STORE },
    )
  }

  if (!['super_admin', 'teacher', 'parent', 'student'].includes(auth.role)) {
    deleteSession(auth.token)
    await clearSessionCookie()
    return NextResponse.json(
      { ok: true, setupRequired: false, authenticated: false, user: null, workspace: null, rev: stored.rev, home: null },
      { headers: NO_STORE },
    )
  }

  const user = stored.data.users.find(entry => entry.id === auth.auth.id)
  if (!user || user.status !== 'active' || user.role !== auth.role) {
    return NextResponse.json(
      { ok: true, setupRequired: false, authenticated: false, user: null, workspace: null, rev: stored.rev, home: null },
      { headers: NO_STORE },
    )
  }

  return ok({
    ok: true,
    setupRequired: false,
    authenticated: true,
    user,
    workspace: scopeWorkspace(stored.data, { userId: user.id, role: auth.role }),
    rev: stored.rev,
    home: homePageFor(auth.role),
    school: {
      nameAr: stored.data.settings.schoolNameAr,
      nameEn: stored.data.settings.schoolNameEn,
    },
  })
}
