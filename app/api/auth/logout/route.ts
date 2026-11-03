import { clearSessionCookie, getAuthContext, readSessionCookie } from '@/lib/server/auth'
import { deleteSession, mutateWorkspace } from '@/lib/server/db'
import { addAudit } from '@/lib/server/domain'
import { ok } from '@/lib/server/http'

export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await getAuthContext()
  const token = await readSessionCookie()

  if (auth) {
    try {
      mutateWorkspace(current => {
        const user = current.users.find(entry => entry.id === auth.auth.id)
        if (!user) return { data: current, result: false }
        return {
          data: addAudit(current, { userId: user.id, nameAr: user.nameAr, nameEn: user.nameEn }, 'logout', 'user', user.id),
          result: true,
        }
      })
    } catch {
      // Logging out must succeed even if the audit write fails.
    }
  }

  deleteSession(token)
  await clearSessionCookie()
  return ok({ ok: true })
}
