import { getAuthContext } from '@/lib/server/auth'
import { getDb, mutateWorkspace, readWorkspace } from '@/lib/server/db'
import {
  approveParentChildLink,
  createParentChildLink,
  createQrToken,
  existingLink,
  getParentChildLinks,
  getQrTokenByHash,
  logLoginAudit,
  markQrTokenUsed,
  rejectParentChildLink,
  revokeParentChildLink,
  revokeStudentQrTokens,
} from '@/lib/server/qr'
import { databaseUnavailable, fail, ok, readJson } from '@/lib/server/http'

export const dynamic = 'force-dynamic'

function syncWorkspaceLink(parentUserId: string, studentUserId: string, active: boolean) {
  mutateWorkspace(current => {
    const parent = current.parents.find(row => row.userId === parentUserId)
    const parentId = parent?.id
    const studentUser = current.users.find(row => row.id === studentUserId)
    const studentId = studentUser?.studentId || current.students.find(row => row.email === studentUser?.email)?.id
    const students = current.students.map(row => row.id !== studentId ? row : {
      ...row,
      parentIds: active ? Array.from(new Set([...row.parentIds, ...(parentId ? [parentId] : [])])) : row.parentIds.filter(id => id !== parentId),
    })
    const parents = current.parents.map(row => row.userId !== parentUserId ? row : {
      ...row,
      studentIds: active ? Array.from(new Set([...row.studentIds, ...(studentId ? [studentId] : [])])) : row.studentIds.filter(id => id !== studentId),
    })
    const users = current.users.map(row => row.id !== parentUserId ? row : {
      ...row,
      childIds: active ? Array.from(new Set([...(row.childIds || []), ...(studentId ? [studentId] : [])])) : (row.childIds || []).filter(id => id !== studentId),
    })
    return { data: { ...current, students, parents, users }, result: undefined }
  })
}

function getStudentIdentity(stored: NonNullable<ReturnType<typeof readWorkspace>>, studentUserId: string) {
  const user = stored.data.users.find(row => row.id === studentUserId && row.role === 'student' && row.status === 'active')
  if (!user) return undefined
  const student = stored.data.students.find(row => row.id === user.studentId || row.email.toLowerCase() === user.email.toLowerCase())
  if (!student || student.status !== 'active') return undefined
  const classroom = stored.data.classes.find(row => row.id === student.classId)
  return { user, student, classroom }
}

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return fail(401, 'unauthorized')
  let stored
  try { stored = readWorkspace() } catch (error) { return databaseUnavailable(error, '/api/parent-links') }
  if (!stored) return fail(409, 'setup_required')
  const user = stored.data.users.find(row => row.id === auth.auth.id && row.status === 'active')
  if (!user || user.role !== auth.role) return fail(403, 'inactive_user')

  if (auth.role === 'super_admin') return ok({ ok: true, links: getParentChildLinks() })
  if (auth.role === 'student') {
    return ok({ ok: true, links: getParentChildLinks(undefined, user.id) })
  }
  if (auth.role === 'parent') return ok({ ok: true, links: getParentChildLinks(user.id) })
  return fail(403, 'forbidden')
}

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (!auth) return fail(401, 'unauthorized')
  let stored
  try { stored = readWorkspace() } catch (error) { return databaseUnavailable(error, '/api/parent-links') }
  if (!stored) return fail(409, 'setup_required')
  const user = stored.data.users.find(row => row.id === auth.auth.id && row.status === 'active')
  if (!user || user.role !== auth.role) return fail(403, 'inactive_user')
  const body = await readJson<{ action?: string; token?: string; parentUserId?: string; studentUserId?: string; linkId?: string; relationshipType?: string }>(request)
  if (!body?.action) return fail(400, 'missing_action')

  try {
    if (body.action === 'generate' || body.action === 'revoke_code') {
      if (auth.role !== 'student') return fail(403, 'forbidden')
      if (body.action === 'revoke_code') {
        revokeStudentQrTokens(user.id)
        return ok({ ok: true, revoked: true })
      }
      const { rawToken, row } = createQrToken(user.id)
      logLoginAudit({ userId: user.id, role: auth.role, action: 'parent_link_token_created', success: true })
      return ok({ ok: true, token: rawToken, expiresAt: row.expires_at })
    }

    if (body.action === 'preview' || body.action === 'confirm') {
      if (auth.role !== 'parent') return fail(403, 'forbidden')
      if (typeof body.token !== 'string') return fail(400, 'invalid_token')
      const token = getQrTokenByHash(body.token)
      if (!token) {
        logLoginAudit({ userId: user.id, role: auth.role, action: 'parent_link_token_invalid', success: false })
        return fail(400, 'invalid_expired_or_used_token')
      }
      const studentInfo = getStudentIdentity(stored, token.student_user_id)
      if (!studentInfo) return fail(404, 'student_not_found')
      if (existingLink(user.id, token.student_user_id)) return fail(409, 'link_already_exists')
      if (body.action === 'preview') {
        return ok({ ok: true, student: { nameAr: studentInfo.student.nameAr, nameEn: studentInfo.student.nameEn, gradeLevel: studentInfo.student.gradeLevel, classAr: studentInfo.classroom?.nameAr, classEn: studentInfo.classroom?.nameEn } })
      }

      const db = getDb()
      db.exec('BEGIN IMMEDIATE')
      try {
        const currentToken = getQrTokenByHash(body.token)
        if (!currentToken || currentToken.id !== token.id || existingLink(user.id, token.student_user_id)) throw new Error('invalid_expired_or_used_token')
        const link = createParentChildLink({ parentUserId: user.id, studentUserId: token.student_user_id, relationshipType: 'guardian', createdBy: user.id, status: 'pending' })
        markQrTokenUsed(token.id)
        db.exec('COMMIT')
        logLoginAudit({ userId: user.id, role: auth.role, action: 'parent_link_requested', success: true, details: `link:${link.id}` })
        return ok({ ok: true, link })
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    }

    if (body.action === 'admin_link') {
      if (auth.role !== 'super_admin') return fail(403, 'forbidden')
      if (!body.parentUserId || !body.studentUserId) return fail(400, 'missing_user_id')
      const parent = stored.data.users.find(row => row.id === body.parentUserId && row.role === 'parent' && row.status === 'active')
      if (!parent || !getStudentIdentity(stored, body.studentUserId)) return fail(404, 'user_not_found')
      if (existingLink(parent.id, body.studentUserId)) return fail(409, 'link_already_exists')
      const link = createParentChildLink({ parentUserId: parent.id, studentUserId: body.studentUserId, relationshipType: body.relationshipType || 'guardian', createdBy: user.id, status: 'pending' })
      approveParentChildLink(link.id, user.id)
      syncWorkspaceLink(parent.id, body.studentUserId, true)
      logLoginAudit({ userId: user.id, role: auth.role, action: 'parent_link_admin_created', success: true, details: `link:${link.id}` })
      return ok({ ok: true, link })
    }

    if (body.action === 'approve' || body.action === 'reject' || body.action === 'unlink') {
      const linkId = body.linkId?.trim()
      if (!linkId) return fail(400, 'missing_link_id')
      const link = getParentChildLinks().find(row => row.id === linkId)
      if (!link) return fail(404, 'link_not_found')
      const canManage = auth.role === 'super_admin' || link.parent_user_id === user.id || link.student_user_id === user.id
      if (!canManage) return fail(403, 'forbidden')
      if ((body.action === 'approve' || body.action === 'reject') && auth.role !== 'super_admin') return fail(403, 'forbidden')
      if (body.action === 'approve') {
        approveParentChildLink(linkId, user.id)
        syncWorkspaceLink(link.parent_user_id, link.student_user_id, true)
      }
      else if (body.action === 'reject') rejectParentChildLink(linkId, user.id)
      else {
        revokeParentChildLink(linkId)
        syncWorkspaceLink(link.parent_user_id, link.student_user_id, false)
      }
      logLoginAudit({ userId: user.id, role: auth.role, action: `parent_link_${body.action}`, success: true, details: `link:${linkId}` })
      return ok({ ok: true })
    }
    return fail(400, 'unknown_action')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'parent_link_failed'
    return fail(message === 'invalid_expired_or_used_token' ? 409 : 400, message)
  }
}
