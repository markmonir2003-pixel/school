import { createPasswordReset, getAuthByEmail, getPasswordResetByToken, markPasswordResetUsed, readWorkspace, updateAuthPassword } from '@/lib/server/db'
import { hashPassword, passwordProblem } from '@/lib/server/auth'
import { fail, ok, readJson } from '@/lib/server/http'

export const dynamic = 'force-dynamic'

interface ResetBody {
  email?: string
  token?: string
  newPassword?: string
}

export async function POST(request: Request) {
  const stored = readWorkspace()
  if (!stored) return fail(409, 'setup_required')

  const body = await readJson<ResetBody>(request)
  if (!body) return fail(400, 'invalid_body')

  // Step 1: Request reset link
  if (body.email && !body.token && !body.newPassword) {
    const email = body.email.trim().toLowerCase()
    const auth = getAuthByEmail(email)
    if (!auth) {
      // Don't leak user existence; return generic success
      return ok({ ok: true, message: 'reset_dispatched' })
    }
    const reset = createPasswordReset(auth.id)
    return ok({
      ok: true,
      message: 'reset_dispatched',
      // In development / demo, we return the token directly so administrators can test without external SMTP
      resetToken: process.env.NODE_ENV !== 'production' ? reset.token : undefined,
    })
  }

  // Step 2: Fulfill reset
  if (body.token && body.newPassword) {
    const reset = getPasswordResetByToken(body.token.trim())
    if (!reset) return fail(400, 'invalid_or_expired_token')

    const weak = passwordProblem(body.newPassword)
    if (weak) return fail(400, weak)

    updateAuthPassword(reset.user_id, hashPassword(body.newPassword))
    markPasswordResetUsed(reset.id)

    return ok({ ok: true, message: 'password_updated' })
  }

  return fail(400, 'invalid_request')
}
