import { createAuthUser, createSession, createWorkspace, getDb, getAuthByEmail, readWorkspace } from '@/lib/server/db'
import { hashPassword, passwordProblem, setSessionCookie } from '@/lib/server/auth'
import { addAudit, isValidEmail, newId, nowIso } from '@/lib/server/domain'
import { fail, ok, readJson } from '@/lib/server/http'
import { scopeWorkspace } from '@/lib/server/scope'
import { createEmptyWorkspace } from '@/lib/school/empty'
import type { AcademicYear, ClassRoom, Subject, Term, User } from '@/lib/school/types'

export const dynamic = 'force-dynamic'

interface SetupBody {
  schoolNameAr?: string
  schoolNameEn?: string
  platformNameAr?: string
  platformNameEn?: string
  schoolEmail?: string
  schoolPhone?: string
  addressAr?: string
  addressEn?: string
  mottoAr?: string
  mottoEn?: string
  currency?: string
  defaultLanguage?: 'ar' | 'en'
  adminNameAr?: string
  adminNameEn?: string
  adminEmail?: string
  adminPassword?: string
  yearNameAr?: string
  yearNameEn?: string
  startDate?: string
  endDate?: string
  timezone?: string
  initDefaultSubjects?: boolean
  initDefaultClasses?: boolean
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: Request) {
  const db = getDb()
  db.exec('BEGIN IMMEDIATE')
  try {
    if (readWorkspace()) {
      db.exec('ROLLBACK')
      return fail(409, 'already_initialized')
    }

    const body = await readJson<SetupBody>(request)
    if (!body) {
      db.exec('ROLLBACK')
      return fail(400, 'invalid_body')
    }

    const schoolNameAr = body.schoolNameAr?.trim() || 'مدرسة سان جورج'
    const schoolNameEn = body.schoolNameEn?.trim() || 'St. George School'
    const platformNameAr = body.platformNameAr?.trim() || 'الحرم الرقمي لمدرسة سان جورج'
    const platformNameEn = body.platformNameEn?.trim() || 'St. George School Digital Campus'
    const adminNameAr = body.adminNameAr?.trim() ?? ''
    const adminNameEn = body.adminNameEn?.trim() ?? ''
    const adminEmail = body.adminEmail?.trim().toLowerCase() ?? ''
    const adminPassword = body.adminPassword ?? ''
    const startDate = body.startDate?.trim() || `${new Date().getFullYear()}-09-01`
    const endDate = body.endDate?.trim() || `${new Date().getFullYear() + 1}-06-30`

    if (!adminNameAr || !adminNameEn || !adminEmail || !adminPassword) {
      db.exec('ROLLBACK')
      return fail(400, 'missing_admin_fields')
    }
    if (!isValidEmail(adminEmail)) {
      db.exec('ROLLBACK')
      return fail(400, 'invalid_email')
    }
    const weak = passwordProblem(adminPassword)
    if (weak) {
      db.exec('ROLLBACK')
      return fail(400, weak)
    }
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate) || endDate <= startDate) {
      db.exec('ROLLBACK')
      return fail(400, 'invalid_dates')
    }
    if (getAuthByEmail(adminEmail)) {
      db.exec('ROLLBACK')
      return fail(409, 'email_taken')
    }

    const yearId = newId('ay')
    const adminId = newId('usr')
    const now = nowIso()
    const yearNameAr = body.yearNameAr?.trim() || `${startDate.slice(0, 4)} - ${endDate.slice(0, 4)}`
    const yearNameEn = body.yearNameEn?.trim() || `${startDate.slice(0, 4)} - ${endDate.slice(0, 4)}`

    const admin: User = {
      id: adminId,
      nameAr: adminNameAr,
      nameEn: adminNameEn,
      email: adminEmail,
      phone: body.schoolPhone?.trim() || '',
      role: 'super_admin',
      status: 'active',
      avatarColor: 'from-[#0f1f3d] to-[#c5a059]',
      title: 'Super Administrator',
      createdAt: now,
    }

    const year: AcademicYear = {
      id: yearId,
      nameAr: yearNameAr,
      nameEn: yearNameEn,
      startDate,
      endDate,
      active: true,
    }

    const term1: Term = {
      id: newId('trm'),
      academicYearId: yearId,
      nameAr: 'الفصل الدراسي الأول',
      nameEn: 'First Term',
      startDate,
      endDate: `${startDate.slice(0, 4)}-12-31`,
      active: true,
    }

    const term2: Term = {
      id: newId('trm'),
      academicYearId: yearId,
      nameAr: 'الفصل الدراسي الثاني',
      nameEn: 'Second Term',
      startDate: `${endDate.slice(0, 4)}-01-15`,
      endDate,
      active: false,
    }

    // Standard subjects (ready to be taught, with no fake grades or mock data)
    const initialSubjects: Subject[] = body.initDefaultSubjects !== false ? [
      { id: newId('sbj'), code: 'ARA', nameAr: 'اللغة العربية', nameEn: 'Arabic Language', color: '#19a99a' },
      { id: newId('sbj'), code: 'ENG', nameAr: 'اللغة الإنجليزية', nameEn: 'English Language', color: '#3b82f6' },
      { id: newId('sbj'), code: 'MTH', nameAr: 'الرياضيات', nameEn: 'Mathematics', color: '#c5a059' },
      { id: newId('sbj'), code: 'SCI', nameAr: 'العلوم العامة', nameEn: 'General Science', color: '#10b981' },
      { id: newId('sbj'), code: 'SOC', nameAr: 'الدراسات الاجتماعية والتاريخ', nameEn: 'Social Studies & History', color: '#f59e0b' },
      { id: newId('sbj'), code: 'ICT', nameAr: 'تكنولوجيا المعلومات والحاسب', nameEn: 'Computer Science & ICT', color: '#6366f1' },
      { id: newId('sbj'), code: 'REL', nameAr: 'التربية الدينية والقيم', nameEn: 'Religious & Moral Education', color: '#8b5cf6' },
      { id: newId('sbj'), code: 'ART', nameAr: 'التربية الفنية والموسيقى', nameEn: 'Arts & Music', color: '#ec4899' },
    ] : []

    // Standard classes (clean empty rosters ready for student enrollment)
    const initialClasses: ClassRoom[] = body.initDefaultClasses !== false ? [
      { id: newId('cls'), nameAr: 'الصف الأول — أ', nameEn: 'Grade 1 - Section A', gradeLevel: 1, section: 'A', academicYearId: yearId, capacity: 25, room: '101' },
      { id: newId('cls'), nameAr: 'الصف الأول — ب', nameEn: 'Grade 1 - Section B', gradeLevel: 1, section: 'B', academicYearId: yearId, capacity: 25, room: '102' },
      { id: newId('cls'), nameAr: 'الصف الثاني — أ', nameEn: 'Grade 2 - Section A', gradeLevel: 2, section: 'A', academicYearId: yearId, capacity: 25, room: '103' },
      { id: newId('cls'), nameAr: 'الصف الثالث — أ', nameEn: 'Grade 3 - Section A', gradeLevel: 3, section: 'A', academicYearId: yearId, capacity: 25, room: '104' },
      { id: newId('cls'), nameAr: 'الصف الرابع — أ', nameEn: 'Grade 4 - Section A', gradeLevel: 4, section: 'A', academicYearId: yearId, capacity: 25, room: '201' },
      { id: newId('cls'), nameAr: 'الصف الخامس — أ', nameEn: 'Grade 5 - Section A', gradeLevel: 5, section: 'A', academicYearId: yearId, capacity: 25, room: '202' },
      { id: newId('cls'), nameAr: 'الصف السادس — أ', nameEn: 'Grade 6 - Section A', gradeLevel: 6, section: 'A', academicYearId: yearId, capacity: 25, room: '203' },
    ] : []

    const base = createEmptyWorkspace({
      schoolNameAr,
      schoolNameEn,
      platformNameAr,
      platformNameEn,
      schoolNameShort: schoolNameEn,
      email: body.schoolEmail?.trim() || adminEmail,
      phone: body.schoolPhone?.trim() || '',
      addressAr: body.addressAr?.trim() || 'مجمع سان جورج التعليمي، القاهرة، مصر',
      addressEn: body.addressEn?.trim() || 'St. George Campus, Cairo, Egypt',
      mottoAr: body.mottoAr?.trim() || 'التميز في التعليم وبناء الشخصية والقيم',
      mottoEn: body.mottoEn?.trim() || 'Excellence in Education, Character, and Faith',
      currency: body.currency?.trim() || 'EGP',
      academicYearId: yearId,
      timezone: body.timezone?.trim() || 'Africa/Cairo',
      language: body.defaultLanguage || 'ar',
      logoText: 'SG',
    })

    base.users = [admin]
    base.academicYears = [year]
    base.terms = [term1, term2]
    base.subjects = initialSubjects
    base.classes = initialClasses

    const data = addAudit(
      base,
      { userId: adminId, nameAr: adminNameAr, nameEn: adminNameEn },
      'setup_system',
      'school',
      yearId,
      `St. George School Digital Campus initialized by ${adminNameEn}`,
    )

    createWorkspace(data)
    createAuthUser({
      id: adminId,
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: 'super_admin',
    })
    db.exec('COMMIT')

    const session = createSession(adminId)
    await setSessionCookie(session.token)

    return ok({
      ok: true,
      user: admin,
      workspace: scopeWorkspace(data, { userId: adminId, role: 'super_admin' }),
      rev: 1,
      home: 'admin-dashboard' as const,
    })
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      // rollback handled
    }
    console.error('setup failed', error)
    return fail(500, 'setup_failed')
  }
}
