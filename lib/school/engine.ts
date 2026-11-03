import type {
  AIAlert,
  AttendanceRecord,
  ClassRoom,
  Grade,
  Language,
  Notification,
  Role,
  SchoolData,
  Student,
  Teacher,
  User,
} from './types'

export type PageId =
  | 'admin-dashboard'
  | 'teacher-dashboard'
  | 'parent-portal'
  | 'student-portal'
  | 'students'
  | 'classes'
  | 'attendance'
  | 'exams'
  | 'ai-center'
  | 'reports'
  | 'notifications'
  | 'users'
  | 'settings'
  | 'import-export'

export const PAGE_ACCESS: Record<PageId, Role[]> = {
  'admin-dashboard': ['super_admin'],
  'teacher-dashboard': ['super_admin', 'teacher'],
  'parent-portal': ['super_admin', 'parent'],
  'student-portal': ['super_admin', 'student'],
  students: ['super_admin', 'teacher'],
  classes: ['super_admin', 'teacher'],
  attendance: ['super_admin', 'teacher'],
  exams: ['super_admin', 'teacher'],
  'ai-center': ['super_admin'],
  reports: ['super_admin'],
  notifications: ['super_admin', 'school_admin', 'principal', 'teacher', 'parent', 'student', 'librarian', 'accountant', 'staff'],
  users: ['super_admin'],
  settings: ['super_admin'],
  'import-export': ['super_admin'],
}

export const ROLE_LABELS: Record<Role, { ar: string; en: string }> = {
  super_admin: { ar: 'المدير العام', en: 'Super Administrator' },
  school_admin: { ar: 'مدير المدرسة', en: 'School Administrator' },
  principal: { ar: 'الناظر / المدير الأكاديمي', en: 'Principal / Academic Director' },
  teacher: { ar: 'معلم', en: 'Teacher' },
  student: { ar: 'طالب', en: 'Student' },
  parent: { ar: 'ولي أمر', en: 'Parent / Guardian' },
  librarian: { ar: 'أمين المكتبة', en: 'Librarian' },
  accountant: { ar: 'المسؤول المالي', en: 'Accountant' },
  staff: { ar: 'عضو الكادر الإداري', en: 'Staff Member' },
}

export function canAccess(role: Role, page: PageId) {
  return PAGE_ACCESS[page]?.includes(role) ?? false
}

export function homePageFor(role: Role): PageId {
  if (role === 'parent') return 'parent-portal'
  if (role === 'student') return 'student-portal'
  if (role === 'teacher') return 'teacher-dashboard'
  if (role === 'accountant') return 'reports'
  return 'admin-dashboard'
}

/* ── Names & lookups ───────────────────────────────────────────────────── */

export function studentName(student: Student | undefined, lang: Language) {
  if (!student) return lang === 'ar' ? 'طالب غير معروف' : 'Unknown student'
  return lang === 'ar' ? student.nameAr : student.nameEn
}

export function userName(user: User | undefined, lang: Language) {
  if (!user) return '—'
  return lang === 'ar' ? user.nameAr : user.nameEn
}

export function className(data: SchoolData, classId: string | undefined, lang: Language) {
  const cls = data.classes.find(c => c.id === classId)
  if (!cls) return '—'
  return lang === 'ar' ? cls.nameAr : cls.nameEn
}

export function subjectName(data: SchoolData, subjectId: string | undefined, lang: Language) {
  const subject = data.subjects.find(s => s.id === subjectId)
  if (!subject) return '—'
  return lang === 'ar' ? subject.nameAr : subject.nameEn
}

export function teacherName(data: SchoolData, teacherId: string | undefined, lang: Language) {
  const teacher = data.teachers.find(t => t.id === teacherId)
  if (!teacher) return '—'
  return lang === 'ar' ? teacher.nameAr : teacher.nameEn
}

export function currentStudent(data: SchoolData, user: User | null): Student | undefined {
  if (!user) return undefined
  if (user.role === 'student' && user.studentId) return data.students.find(s => s.id === user.studentId)
  return undefined
}

export function currentTeacher(data: SchoolData, user: User | null): Teacher | undefined {
  if (!user) return undefined
  if (user.role === 'teacher' && user.teacherId) return data.teachers.find(t => t.id === user.teacherId)
  return undefined
}

export function childrenOf(data: SchoolData, user: User | null): Student[] {
  if (!user || user.role !== 'parent') return []
  const parent = data.parents.find(p => p.userId === user.id)
  const ids = parent?.studentIds ?? user.childIds ?? []
  return ids.map(id => data.students.find(s => s.id === id)).filter(Boolean) as Student[]
}

export function teacherClassIds(data: SchoolData, user: User | null): string[] {
  const teacher = currentTeacher(data, user)
  if (!teacher) return []
  return Array.from(new Set([
    ...teacher.classIds,
    ...data.teacherAssignments.filter(a => a.teacherId === teacher.id).map(a => a.classId),
  ]))
}

/** Every student the signed-in user is allowed to see. */
export function visibleStudents(data: SchoolData, user: User | null): Student[] {
  if (!user) return []
  if (user.role === 'super_admin' || user.role === 'school_admin') return data.students
  if (user.role === 'teacher') {
    const ids = teacherClassIds(data, user)
    return data.students.filter(s => ids.includes(s.classId))
  }
  if (user.role === 'parent') return childrenOf(data, user)
  if (user.role === 'student') return data.students.filter(s => s.id === user.studentId)
  return []
}

export function visibleNotifications(data: SchoolData, user: User | null): Notification[] {
  if (!user) return []
  const base = data.notifications.filter(n => {
    if (n.recipientId) return n.recipientId === user.id
    if (n.recipientRole === 'all') return true
    return n.recipientRole === user.role
  })
  if (user.role === 'teacher') {
    const ids = new Set(teacherClassIds(data, user))
    return base.filter(n => !n.studentId || ids.has(data.students.find(s => s.id === n.studentId)?.classId ?? ''))
  }
  if (user.role === 'parent') {
    const ids = new Set(childrenOf(data, user).map(s => s.id))
    return base.filter(n => !n.studentId || ids.has(n.studentId))
  }
  if (user.role === 'student') {
    return base.filter(n => !n.studentId || n.studentId === user.studentId)
  }
  return base
}

export function notificationUnread(data: SchoolData, user: User | null) {
  return visibleNotifications(data, user).filter(n => !n.read && !(n.readBy ?? []).includes(user?.id ?? '')).length
}

/* ── Attendance ────────────────────────────────────────────────────────── */

export interface AttendanceSummary {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  rate: number
}

export function summarizeAttendance(records: AttendanceRecord[]): AttendanceSummary {
  const present = records.filter(r => r.status === 'present').length
  const absent = records.filter(r => r.status === 'absent').length
  const late = records.filter(r => r.status === 'late').length
  const excused = records.filter(r => r.status === 'excused').length
  const total = records.length
  const rate = total === 0 ? 0 : Math.round(((present + late) / total) * 1000) / 10
  return { total, present, absent, late, excused, rate }
}

export function attendanceForStudent(data: SchoolData, studentId: string, sinceDays?: number) {
  const cutoff = sinceDays ? new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10) : undefined
  return data.attendance
    .filter(r => r.studentId === studentId && (!cutoff || r.date >= cutoff))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function attendanceRate(data: SchoolData, studentId: string, sinceDays = 60): number {
  return summarizeAttendance(attendanceForStudent(data, studentId, sinceDays)).rate
}

export function consecutiveAbsences(records: AttendanceRecord[]): number {
  let count = 0
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].status === 'absent') count++
    else if (records[i].status === 'excused') continue
    else break
  }
  return count
}

export function todayAttendanceForClass(data: SchoolData, classId: string, date: string) {
  return data.attendance.filter(r => r.classId === classId && r.date === date)
}

/* ── Academics ─────────────────────────────────────────────────────────── */

export function gradesForStudent(data: SchoolData, studentId: string): Grade[] {
  return data.grades.filter(g => g.studentId === studentId)
}

export function gradeAverage(data: SchoolData, studentId: string): number {
  const student = data.students.find(s => s.id === studentId)
  if (!student) return 0
  const examIds = new Set(data.exams.filter(e => e.classId === student.classId).map(e => e.id))
  const grades = data.grades.filter(g => g.studentId === studentId && examIds.has(g.examId))
  if (grades.length === 0) return 0
  const percentages = grades.map(g => {
    const exam = data.exams.find(e => e.id === g.examId)
    return exam ? (g.score / exam.maxMarks) * 100 : 0
  })
  return Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 10) / 10
}

export function gradeGpa(average: number): number {
  return Math.round((average / 100) * 4 * 100) / 100
}

export function averageBySubject(data: SchoolData, classId?: string, subjectId?: string) {
  const exams = data.exams.filter(e =>
    e.status === 'published' &&
    (!classId || e.classId === classId) &&
    (!subjectId || e.subjectId === subjectId),
  )
  const examIds = new Set(exams.map(e => e.id))
  const grades = data.grades.filter(g => examIds.has(g.examId))
  if (grades.length === 0) return 0
  const total = grades.reduce((acc, g) => {
    const exam = data.exams.find(e => e.id === g.examId)
    return acc + (exam ? (g.score / exam.maxMarks) * 100 : 0)
  }, 0)
  return Math.round((total / grades.length) * 10) / 10
}

export function subjectPerformance(data: SchoolData, classId?: string) {
  return data.subjects.map(subject => ({
    subject,
    average: averageBySubject(data, classId, subject.id),
  }))
}

export function missingHomework(data: SchoolData, studentId: string): number {
  return data.submissions.filter(s => s.studentId === studentId && (s.status === 'missing' || s.status === 'pending')).length
}

export function homeworkCompletion(data: SchoolData, studentId: string): number {
  const student = data.students.find(s => s.id === studentId)
  if (!student) return 0
  const items = data.homework.filter(h => h.classId === student.classId)
  if (items.length === 0) return 0
  const done = data.submissions.filter(s =>
    s.studentId === studentId && items.some(h => h.id === s.homeworkId) &&
    ['submitted', 'graded', 'late'].includes(s.status),
  ).length
  return Math.round((done / items.length) * 100)
}

export function studentExamResults(data: SchoolData, studentId: string) {
  return data.grades
    .filter(g => g.studentId === studentId)
    .map(g => {
      const exam = data.exams.find(e => e.id === g.examId)
      if (!exam) return null
      return {
        grade: g,
        exam,
        percentage: Math.round((g.score / exam.maxMarks) * 1000) / 10,
        passed: g.score >= exam.passMarks,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b!.exam.date.localeCompare(a!.exam.date))) as Array<{
      grade: Grade
      exam: SchoolData['exams'][number]
      percentage: number
      passed: boolean
    }>
}

/** Percentage change between the older half and the newer half of exams. */
export function performanceTrend(data: SchoolData, studentId: string): number {
  const results = studentExamResults(data, studentId).slice().reverse()
  if (results.length < 4) return 0
  const half = Math.floor(results.length / 2)
  const older = results.slice(0, half).reduce((a, r) => a + r.percentage, 0) / half
  const newer = results.slice(-half).reduce((a, r) => a + r.percentage, 0) / half
  return Math.round((newer - older) * 10) / 10
}

/* ── AI early-warning engine (rule based, explainable) ─────────────────── */

export interface StudentRisk {
  student: Student
  riskScore: number
  severity: 'low' | 'medium' | 'high'
  reasons: string[]
  facts: string[]
  recommendations: string[]
  attendanceRate: number
  average: number
  trend: number
  missing: number
  consecutive: number
}

const REASONS = {
  attendance: {
    ar: 'انخفاض نسبة الحضور عن الحد المعتمد',
    en: 'Attendance is below the school threshold',
  },
  consecutive: {
    ar: 'تكرار الغياب في أيام متتالية',
    en: 'Repeated absence on consecutive school days',
  },
  grades: {
    ar: 'انخفاض متوسط الدرجات عن مستوى النجاح',
    en: 'Average grade is below the passing level',
  },
  trend: {
    ar: 'تراجع في الأداء مقارنة بالاختبارات السابقة',
    en: 'Performance has declined compared with earlier exams',
  },
  homework: {
    ar: 'وجود واجبات غير مسلّمة',
    en: 'Missing homework submissions',
  },
}

const RECOMMENDATIONS = {
  reviewAttendance: {
    ar: 'مراجعة سجل الحضور مع ولي الأمر قبل اتخاذ أي إجراء.',
    en: 'Review the attendance record with the guardian before any action.',
  },
  teacherReview: {
    ar: 'طلب تقييم من معلم المادة حول أسباب التراجع.',
    en: 'Ask the subject teacher to assess the reasons for the decline.',
  },
  contactParent: {
    ar: 'التواصل مع ولي الأمر ومناقشة خطة دعم مناسبة.',
    en: 'Contact the guardian and agree on a support plan.',
  },
  support: {
    ar: 'اقتراح حصة دعم أكاديمي أو مواد مراجعة إضافية.',
    en: 'Offer an academic support session or additional review material.',
  },
  followUp: {
    ar: 'تحديد موعد للمتابعة بعد أسبوعين وتقييم التحسن.',
    en: 'Set a follow-up date in two weeks and review progress.',
  },
}

export function assessStudent(data: SchoolData, studentId: string): StudentRisk | null {
  const student = data.students.find(s => s.id === studentId)
  if (!student) return null
  const records = attendanceForStudent(data, studentId, 60)
  const att = summarizeAttendance(records)
  const average = gradeAverage(data, studentId)
  const trend = performanceTrend(data, studentId)
  const missing = missingHomework(data, studentId)
  const consecutive = consecutiveAbsences(records)
  const threshold = data.settings.attendanceThreshold
  const reasons: string[] = []
  const facts: string[] = []
  const recommendations: string[] = []
  let score = 0

  if (att.total > 0 && att.rate < threshold) {
    reasons.push('attendance')
    facts.push(`attendance:${att.rate}%`)
    recommendations.push('reviewAttendance')
    score += att.rate < threshold - 10 ? 34 : 22
  }
  if (consecutive >= 2) {
    reasons.push('consecutive')
    facts.push(`consecutive_absences:${consecutive}`)
    if (!recommendations.includes('reviewAttendance')) recommendations.push('reviewAttendance')
    score += 14 + consecutive * 3
  }
  if (average > 0 && average < 60) {
    reasons.push('grades')
    facts.push(`average:${average}%`)
    recommendations.push('teacherReview')
    score += average < 45 ? 32 : 20
  }
  if (trend <= -8) {
    reasons.push('trend')
    facts.push(`trend:${trend}%`)
    if (!recommendations.includes('teacherReview')) recommendations.push('teacherReview')
    score += Math.min(24, Math.abs(trend))
  }
  if (missing >= 2) {
    reasons.push('homework')
    facts.push(`missing_homework:${missing}`)
    recommendations.push('support')
    score += Math.min(16, missing * 4)
  }
  if (score === 0) return null
  if (reasons.length > 0) recommendations.push('contactParent', 'followUp')
  const uniqueRecs = Array.from(new Set(recommendations))
  const riskScore = Math.min(100, Math.round(score))
  return {
    student,
    riskScore,
    severity: riskScore >= 60 ? 'high' : riskScore >= 35 ? 'medium' : 'low',
    reasons,
    facts,
    recommendations: uniqueRecs,
    attendanceRate: att.rate,
    average,
    trend,
    missing,
    consecutive,
  }
}

export function reasonText(reason: string, lang: Language) {
  const key = reason as keyof typeof REASONS
  return REASONS[key]?.[lang] ?? reason
}

export function recommendationText(rec: string, lang: Language) {
  const key = rec as keyof typeof RECOMMENDATIONS
  return RECOMMENDATIONS[key]?.[lang] ?? rec
}

/** Build the list of explainable alerts without mutating the store. */
export function buildAlerts(data: SchoolData): AIAlert[] {
  const now = new Date().toISOString()
  return data.students
    .filter(s => s.status === 'active')
    .map(student => {
      const risk = assessStudent(data, student.id)
      if (!risk) return null
      const existing = data.aiAlerts.find(a => a.studentId === student.id && (a.status === 'open' || a.status === 'reviewing'))
      if (existing) {
        return {
          ...existing,
          severity: risk.severity,
          riskScore: risk.riskScore,
          reasons: risk.reasons,
          facts: risk.facts,
          recommendations: risk.recommendations,
          updatedAt: now,
        }
      }
      return {
        id: `alert-${student.id}`,
        studentId: student.id,
        severity: risk.severity,
        status: 'open' as const,
        riskScore: risk.riskScore,
        reasons: risk.reasons,
        facts: risk.facts,
        recommendations: risk.recommendations,
        createdAt: now,
        updatedAt: now,
        source: 'rules' as const,
      }
    })
    .filter(Boolean) as AIAlert[]
}

export function alertFactsText(fact: string, lang: Language) {
  const [key, value] = fact.split(':')
  const labels: Record<string, { ar: string; en: string }> = {
    attendance: { ar: 'نسبة الحضور', en: 'Attendance rate' },
    consecutive_absences: { ar: 'غياب متتالي', en: 'Consecutive absences' },
    average: { ar: 'متوسط الدرجات', en: 'Grade average' },
    trend: { ar: 'تغير الأداء', en: 'Performance change' },
    missing_homework: { ar: 'واجبات غير مسلمة', en: 'Missing homework' },
  }
  const label = labels[key]?.[lang] ?? key
  return `${label}: ${value}`
}

/* ── School-wide metrics ───────────────────────────────────────────────── */

export function schoolMetrics(data: SchoolData) {
  const activeStudents = data.students.filter(s => s.status === 'active')
  const today = new Date().toISOString().slice(0, 10)
  const todayRecords = data.attendance.filter(r => r.date === today)
  const todaySummary = summarizeAttendance(todayRecords)
  const latestDay = todayRecords.length > 0
    ? today
    : data.attendance.reduce((latest, r) => (r.date > latest ? r.date : latest), '')
  const latestRecords = data.attendance.filter(r => r.date === latestDay)
  const latestSummary = summarizeAttendance(latestRecords)
  const avg = activeStudents.length
    ? Math.round((activeStudents.reduce((sum, s) => sum + gradeAverage(data, s.id), 0) / activeStudents.length) * 10) / 10
    : 0
  const attendanceRate = latestSummary.total
    ? latestSummary.rate
    : Math.round((data.attendance.filter(r => r.status === 'present' || r.status === 'late').length / Math.max(1, data.attendance.length)) * 1000) / 10
  const alerts = buildAlerts(data)
  const teachers = data.teachers.filter(t => t.status === 'active').length
  return {
    activeStudents: activeStudents.length,
    totalStudents: data.students.length,
    teachers,
    classes: data.classes.length,
    attendanceRate,
    attendancePresent: latestSummary.present,
    attendanceAbsent: latestSummary.absent,
    attendanceLate: latestSummary.late,
    attendanceExcused: latestSummary.excused,
    attendanceDate: latestDay,
    average: avg,
    gpa: gradeGpa(avg),
    openAlerts: alerts.filter(a => a.status === 'open').length,
    highAlerts: alerts.filter(a => a.severity === 'high' && a.status === 'open').length,
    missingSubmissions: data.submissions.filter(s => s.status === 'missing').length,
  }
}

export function attendanceTrend(data: SchoolData, days = 14) {
  const dates = Array.from(new Set(data.attendance.map(r => r.date))).sort().slice(-days)
  return dates.map(date => {
    const summary = summarizeAttendance(data.attendance.filter(r => r.date === date))
    return {
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      rate: summary.rate,
      present: summary.present,
      absent: summary.absent,
      late: summary.late,
    }
  })
}

export function classPerformance(data: SchoolData) {
  return data.classes.map(cls => {
    const roster = data.students.filter(s => s.classId === cls.id && s.status === 'active')
    const averages = roster.map(s => gradeAverage(data, s.id)).filter(v => v > 0)
    const attendance = summarizeAttendance(data.attendance.filter(r => r.classId === cls.id && roster.some(s => s.id === r.studentId)))
    return {
      cls,
      students: roster.length,
      average: averages.length ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10 : 0,
      attendance: attendance.rate,
    }
  })
}

export function gradeDistribution(data: SchoolData, classId?: string) {
  const buckets = [
    { key: '90-100', min: 90, max: 100, count: 0, color: '#19a99a' },
    { key: '80-89', min: 80, max: 89, count: 0, color: '#3b82f6' },
    { key: '70-79', min: 70, max: 79, count: 0, color: '#6366f1' },
    { key: '60-69', min: 60, max: 69, count: 0, color: '#f59e0b' },
    { key: '<60', min: 0, max: 59, count: 0, color: '#ef4444' },
  ]
  const students = data.students.filter(s => s.status === 'active' && (!classId || s.classId === classId))
  for (const student of students) {
    const avg = gradeAverage(data, student.id)
    if (avg === 0) continue
    const bucket = buckets.find(b => avg >= b.min && avg <= b.max)
    if (bucket) bucket.count++
  }
  return buckets
}

/* ── Formatting ────────────────────────────────────────────────────────── */

export function formatDate(date: string | undefined, lang: Language, withTime = false) {
  if (!date) return '—'
  const parsed = new Date(date.length === 10 ? `${date}T00:00:00` : date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function relativeTime(date: string, lang: Language) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.max(1, Math.round(diff / 60000))
  if (minutes < 60) return lang === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return lang === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`
  const days = Math.round(hours / 24)
  return lang === 'ar' ? `منذ ${days} يوم` : `${days}d ago`
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')
}

export function roleHomeLabel(role: Role, lang: Language) {
  return ROLE_LABELS[role][lang]
}
