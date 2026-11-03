import type { Actor } from './scope'
import type { AuditLog, SchoolData, Subject, Teacher, TeacherAssignment, User } from '@/lib/school/types'

export function newId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function nextStudentNumber(data: SchoolData): string {
  const year = new Date().getFullYear()
  const prefix = `STU-${year}-`
  const used = data.students
    .map(student => student.studentId)
    .filter(id => id.startsWith(prefix))
    .map(id => Number(id.slice(prefix.length)))
    .filter(value => Number.isFinite(value))
  const next = (used.length ? Math.max(...used) : 0) + 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

export function nextEmployeeNumber(data: SchoolData): string {
  const year = new Date().getFullYear()
  const prefix = `TCH-${year}-`
  const used = data.teachers
    .map(teacher => teacher.employeeNo)
    .filter(id => id.startsWith(prefix))
    .map(id => Number(id.slice(prefix.length)))
    .filter(value => Number.isFinite(value))
  const next = (used.length ? Math.max(...used) : 0) + 1
  return `${prefix}${String(next).padStart(3, '0')}`
}

export function addAudit(
  data: SchoolData,
  actor: { userId: string; nameAr: string; nameEn: string },
  action: string,
  entity: string,
  entityId: string,
  details?: string,
): SchoolData {
  const entry: AuditLog = {
    id: newId('aud'),
    actorId: actor.userId,
    actorName: actor.nameEn || actor.nameAr,
    action,
    entity,
    entityId,
    at: nowIso(),
    details,
  }
  return { ...data, auditLogs: [entry, ...data.auditLogs].slice(0, 500) }
}

export function actorName(user: User | undefined): { nameAr: string; nameEn: string } {
  return { nameAr: user?.nameAr ?? '', nameEn: user?.nameEn ?? '' }
}

export function rebuildTeacherAssignments(
  data: SchoolData,
  teacher: Teacher,
  classIds: string[],
  subjectIds: string[],
  academicYearId: string,
): TeacherAssignment[] {
  const remaining = data.teacherAssignments.filter(assignment => assignment.teacherId !== teacher.id)
  const created: TeacherAssignment[] = []
  for (const classId of classIds) {
    const subjects = subjectIds.length ? subjectIds : ['']
    for (const subjectId of subjects) {
      created.push({
        id: newId('asg'),
        teacherId: teacher.id,
        classId,
        subjectId,
        academicYearId,
      })
    }
  }
  return [...remaining, ...created]
}

export function activeAcademicYear(data: SchoolData) {
  return data.academicYears.find(year => year.id === data.settings.academicYearId)
    ?? data.academicYears.find(year => year.active)
    ?? data.academicYears[0]
}

export function findSubject(data: SchoolData, id: string): Subject | undefined {
  return data.subjects.find(subject => subject.id === id)
}

export function roleActor(userId: string, role: Actor['role']): Actor {
  return { userId, role }
}
