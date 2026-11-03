import { hashPassword, loginThrottled, passwordProblem, recordLoginFailure } from '@/lib/server/auth'
import { createAuthUser, getAuthByEmail, getDb, readWorkspace, saveWorkspace } from '@/lib/server/db'
import { addAudit, isValidEmail, newId, nowIso } from '@/lib/server/domain'
import { databaseUnavailable, fail, ok, readJson } from '@/lib/server/http'
import type { Parent, Role, Teacher, User } from '@/lib/school/types'
import { COMMON_SCHOOL_SUBJECTS } from '@/lib/school/subjects'

export const dynamic = 'force-dynamic'

interface RegisterBody {
  role?: 'student' | 'parent' | 'teacher'
  nameAr?: string
  nameEn?: string
  email?: string
  phone?: string
  password?: string
  studentNumber?: string
  stage?: 'primary' | 'preparatory' | 'secondary'
  subjectIds?: string[]
  subjectCodes?: string[]
  classIds?: string[]
}

const STAGE_GRADES = {
  primary: [1, 2, 3, 4, 5, 6],
  preparatory: [7, 8, 9],
  secondary: [10, 11, 12],
} as const

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const throttleKey = `registration:${ip}`
  if (loginThrottled(throttleKey)) return fail(429, 'too_many_attempts')
  recordLoginFailure(throttleKey)
  const body = await readJson<RegisterBody>(request)
  if (!body || !['student', 'parent', 'teacher'].includes(body.role || '')) return fail(400, 'invalid_role')
  const role = body.role as Role
  const nameEn = body.nameEn?.trim() || ''
  const nameAr = body.nameAr?.trim() || nameEn
  const email = body.email?.trim().toLowerCase() || ''
  const password = body.password || ''
  if (!nameEn || !isValidEmail(email) || !password) return fail(400, 'missing_registration_fields')
  const weak = passwordProblem(password)
  if (weak) return fail(400, weak)

  let db
  try { db = getDb() } catch (error) { return databaseUnavailable(error, '/api/auth/register') }
  db.exec('BEGIN IMMEDIATE')
  try {
    const stored = readWorkspace()
    if (!stored) {
      db.exec('ROLLBACK')
      return fail(409, 'setup_required')
    }
    if (getAuthByEmail(email)) {
      db.exec('ROLLBACK')
      return fail(409, 'email_taken')
    }

    const id = newId('usr')
    const now = nowIso()
    const user: User = {
      id, nameAr, nameEn, email, phone: body.phone?.trim() || '', role,
      status: 'inactive', avatarColor: 'from-[#0f1f3d] to-[#c5a059]',
      createdAt: now,
    }
    let teachers = stored.data.teachers
    let parents = stored.data.parents
    let students = stored.data.students
    let subjects = stored.data.subjects

    if (role === 'student') {
      const studentNumber = body.studentNumber?.trim()
      const profile = students.find(entry => entry.status === 'active' && (
        (studentNumber && entry.studentId.toLowerCase() === studentNumber.toLowerCase()) ||
        entry.email.trim().toLowerCase() === email
      ))
      if (profile && stored.data.users.some(entry => entry.id !== id && entry.studentId === profile.id)) {
        db.exec('ROLLBACK')
        return fail(409, 'student_profile_already_linked')
      }
      if (profile) user.studentId = profile.id
      else user.department = studentNumber ? `Student ID pending verification: ${studentNumber}` : 'Student profile pending verification'
    }

    if (role === 'parent') {
      const parent: Parent = {
        id: newId('par'), userId: id, nameAr, nameEn, email,
        phone: body.phone?.trim() || '', relationship: 'guardian', studentIds: [],
      }
      parents = [...parents, parent]
    }

    if (role === 'teacher') {
      const stage = body.stage
      const gradeLevels: number[] = stage && stage in STAGE_GRADES ? [...STAGE_GRADES[stage as keyof typeof STAGE_GRADES]] : []
      const requestedSubjectIds = Array.isArray(body.subjectIds) ? [...new Set(body.subjectIds)] : []
      const requestedSubjectCodes = Array.isArray(body.subjectCodes)
        ? [...new Set(body.subjectCodes.map(code => String(code).trim().toUpperCase()))]
        : []
      const validSubjectCodes = new Set(COMMON_SCHOOL_SUBJECTS.map(subject => subject.code))
      const existingSubjects = stored.data.subjects.filter(subject => requestedSubjectCodes.includes(subject.code.toUpperCase()))
      const newSubjects = COMMON_SCHOOL_SUBJECTS
        .filter(subject => requestedSubjectCodes.includes(subject.code) && !stored.data.subjects.some(existing => existing.code.toUpperCase() === subject.code))
        .map(subject => ({ ...subject, id: newId('sbj') }))
      const resolvedSubjectIds = [...new Set([
        ...requestedSubjectIds,
        ...existingSubjects.map(subject => subject.id),
        ...newSubjects.map(subject => subject.id),
      ])]
      const classIds = Array.isArray(body.classIds) && body.classIds.length
        ? [...new Set(body.classIds)]
        : stored.data.classes.filter(cls => gradeLevels.includes(cls.gradeLevel)).map(cls => cls.id)
      const availableClasses = stored.data.classes.filter(cls => gradeLevels.includes(cls.gradeLevel))
      if (!gradeLevels.length || !resolvedSubjectIds.length ||
        requestedSubjectIds.some(subjectId => !stored.data.subjects.some(subject => subject.id === subjectId)) ||
        requestedSubjectCodes.some(code => !validSubjectCodes.has(code))) {
        db.exec('ROLLBACK')
        return fail(400, 'invalid_teacher_selection')
      }
      if (classIds.some(classId => !availableClasses.some(cls => cls.id === classId))) {
        db.exec('ROLLBACK')
        return fail(400, 'invalid_teacher_classes')
      }
      const teacherId = newId('tch')
      subjects = [...stored.data.subjects, ...newSubjects]
      const teacher: Teacher = {
        id: teacherId, userId: id, nameAr, nameEn, email, phone: user.phone,
        employeeNo: `TCH-${new Date().getFullYear()}-${String(stored.data.teachers.length + 1).padStart(3, '0')}`,
        subjectIds: resolvedSubjectIds, classIds, gradeLevels, status: 'inactive', joinedAt: now,
        specialization: stage,
      }
      user.teacherId = teacherId
      teachers = [...teachers, teacher]
    }

    const teacherStageAr = body.stage === 'primary' ? 'المرحلة الابتدائية' : body.stage === 'preparatory' ? 'المرحلة الإعدادية' : body.stage === 'secondary' ? 'المرحلة الثانوية' : '—'
    const teacherStageEn = body.stage === 'primary' ? 'Primary' : body.stage === 'preparatory' ? 'Preparatory' : body.stage === 'secondary' ? 'Secondary' : '—'
    const manager = stored.data.users.find(entry => entry.role === 'super_admin' && entry.status === 'active')
    const notification = manager ? {
      id: newId('ntf'), recipientId: manager.id, category: 'system' as const,
      titleAr: 'طلب حساب جديد بانتظار المراجعة',
      titleEn: 'New account request pending review',
      bodyAr: `طلب ${role === 'teacher' ? 'معلم' : role === 'parent' ? 'ولي أمر' : 'طالب'} ${nameAr} إنشاء حساب.${role === 'teacher' ? ` المرحلة: ${teacherStageAr}، المواد: ${(teachers.find(entry => entry.userId === id)?.subjectIds || []).map(subjectId => subjects.find(subject => subject.id === subjectId)?.nameAr).filter(Boolean).join('، ')}.` : ''}${role === 'student' && body.studentNumber?.trim() ? ` رقم الطالب: ${body.studentNumber.trim()}.` : ''}`,
      bodyEn: `${nameEn} submitted a ${role} account request.${role === 'teacher' ? ` Stage: ${teacherStageEn}, subjects: ${(teachers.find(entry => entry.userId === id)?.subjectIds || []).map(subjectId => subjects.find(subject => subject.id === subjectId)?.nameEn).filter(Boolean).join(', ')}.` : ''}${role === 'student' && body.studentNumber?.trim() ? ` Student ID: ${body.studentNumber.trim()}.` : ''}`,
      createdAt: now, read: false, delivery: 'in_app' as const,
      deliveryStatus: 'delivered' as const, link: 'users',
    } : null

    let data = {
      ...stored.data,
      users: [...stored.data.users, user], teachers, parents, students, subjects,
      notifications: notification ? [notification, ...stored.data.notifications] : stored.data.notifications,
    }
    data = addAudit(data, { userId: id, nameAr, nameEn }, 'account_registration_request', 'user', id, `Pending ${role} registration`)
    createAuthUser({ id, email, passwordHash: hashPassword(password), role, status: 'inactive' })
    const saved = saveWorkspace(data)
    db.exec('COMMIT')
    return ok({ ok: true, pendingApproval: true, message: 'registration_pending_approval', rev: saved.rev }, { status: 202 })
  } catch (error) {
    try { db.exec('ROLLBACK') } catch { /* transaction already ended */ }
    console.error('registration request failed', error)
    return fail(400, 'registration_failed')
  }
}
